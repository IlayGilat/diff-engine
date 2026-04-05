import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  JsonObject,
  PollingPatchEnvelope,
  PollingSnapshotEnvelope,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  buildSourceKey,
  normalizePollingTarget,
} from '@org/models';
import { HotspotsPoller } from '../../../features/layers/pollers/hotspots.poller';
import { RegionsPoller } from '../../../features/layers/pollers/regions.poller';
import { PollingEventPublisherService } from '../../realtime/polling-event-publisher.service';
import { ActivePollingSession } from '../models/active-polling-session.model';
import { createPollerCatalog, resolvePoller } from '../pollers/poller-catalog';
import { PollingDomainPoller } from '../pollers/polling-domain-poller.model';
import { DiffPatchService } from './diff-patch.service';
import { SessionRegistryService } from './session-registry.service';

const DEFAULT_SESSION_TTL_MS = 30_000;
const DEFAULT_CLEANUP_INTERVAL_MS = 5_000;

@Injectable()
export class PollingEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PollingEngineService.name);
  private readonly sessionTtlMs = Number(
    process.env.POLLING_SESSION_TTL_MS ?? DEFAULT_SESSION_TTL_MS,
  );
  private readonly cleanupIntervalMs = Number(
    process.env.POLLING_CLEANUP_INTERVAL_MS ?? DEFAULT_CLEANUP_INTERVAL_MS,
  );
  private readonly pollerCatalog: Map<string, PollingDomainPoller>;
  private cleanupTimerId: ReturnType<typeof setInterval> | null = null;
  private generationCounter = 0;

  constructor(
    private readonly diffPatchService: DiffPatchService,
    private readonly pollingEventPublisherService: PollingEventPublisherService,
    private readonly sessionRegistryService: SessionRegistryService,
    regionsPoller: RegionsPoller,
    hotspotsPoller: HotspotsPoller,
  ) {
    this.pollerCatalog = createPollerCatalog([regionsPoller, hotspotsPoller]);
  }

  // Starts the cleanup loop that expires zombie sessions.
  onModuleInit(): void {
    this.startCleanupLoop();
  }

  // Stops all runtime timers so the pod can shut down cleanly.
  onModuleDestroy(): void {
    this.stopCleanupLoop();
    this.sessionRegistryService
      .listStreamIds()
      .forEach((streamId) => this.stopSession(streamId));
  }

  // Starts or replaces one stream and returns the first full snapshot.
  async startSession(
    rawTarget: PollingSubscriptionTarget<string>,
    connectionId?: string,
  ): Promise<PollingSnapshotEnvelope<JsonObject, string>> {
    const target = normalizePollingTarget(rawTarget);
    this.validateTarget(target);

    const poller = this.getPoller(target.domain);
    const streamId = target.streamId;
    const generation = this.nextGeneration();

    this.stopSession(streamId);

    const session = this.sessionRegistryService.saveSession({
      streamId,
      target,
      version: 0,
      lastSnapshot: null,
      pollIntervalMs: poller.pollIntervalMs,
      timerId: null,
      abortController: new AbortController(),
      expiresAt: Date.now() + this.sessionTtlMs,
      generation,
    });

    if (connectionId) {
      this.sessionRegistryService.bindStreamToConnection(connectionId, streamId);
    }

    try {
      const snapshot = await poller.fetch(target.params, session.abortController.signal);
      const activeSession = this.requireCurrentSession(streamId, generation);
      if (!activeSession) {
        throw new Error('Polling session was replaced before startup completed.');
      }

      const startedSession = this.sessionRegistryService.saveSession({
        ...activeSession,
        version: 1,
        lastSnapshot: snapshot,
        abortController: null,
        expiresAt: Date.now() + this.sessionTtlMs,
      });

      this.scheduleNextTick(startedSession.streamId, startedSession.generation);

      this.logger.log('Started polling for stream ' + streamId + '.');
      return this.createSnapshotEnvelope(startedSession);
    } catch (error) {
      if (this.isCurrentSession(streamId, generation)) {
        this.stopSession(streamId);
      }

      throw new Error(this.getErrorMessage(error, 'Failed to start polling.'));
    }
  }

  // Stops one stream, clears timers, and aborts any in-flight fetch.
  stopSession(streamId: string): boolean {
    const session = this.sessionRegistryService.getSession(streamId);
    if (!session) {
      return false;
    }

    this.clearTimer(session);
    session.abortController?.abort();
    this.sessionRegistryService.deleteSession(streamId);

    this.logger.log('Stopped polling for stream ' + streamId + '.');
    return true;
  }

  // Stops every stream that belonged to one websocket connection.
  stopConnection(connectionId: string): void {
    this.sessionRegistryService
      .releaseConnection(connectionId)
      .forEach((streamId) => this.stopSession(streamId));
  }

  // Refreshes the TTL so healthy sessions do not expire.
  refreshSession(streamId: string): boolean {
    return this.sessionRegistryService.refreshLease(streamId, this.sessionTtlMs);
  }

  // Schedules the next poll after the previous tick has finished.
  private scheduleNextTick(streamId: string, generation: number): void {
    const session = this.requireCurrentSession(streamId, generation);
    if (!session) {
      return;
    }

    this.clearTimer(session);
    const timerId = setTimeout(() => {
      void this.runTick(streamId, generation);
    }, session.pollIntervalMs);

    this.sessionRegistryService.saveSession({
      ...session,
      timerId,
    });
  }

  // Runs one fetch/diff/publish cycle for an active stream.
  private async runTick(streamId: string, generation: number): Promise<void> {
    const session = this.requireCurrentSession(streamId, generation);
    if (!session || !session.lastSnapshot) {
      return;
    }

    const poller = this.getPoller(session.target.domain);
    const startedSession = this.sessionRegistryService.saveSession({
      ...session,
      timerId: null,
      abortController: new AbortController(),
    });

    try {
      const latestSnapshot = await poller.fetch(
        startedSession.target.params,
        startedSession.abortController.signal,
      );
      const activeSession = this.requireCurrentSession(streamId, generation);
      if (!activeSession || !activeSession.lastSnapshot) {
        return;
      }

      const operations = this.diffPatchService.createPatch(
        activeSession.lastSnapshot,
        latestSnapshot,
      );

      if (operations.length === 0) {
        this.clearAbortController(streamId, generation);
        this.scheduleNextTick(streamId, generation);
        return;
      }

      const updatedSession = this.sessionRegistryService.saveSession({
        ...activeSession,
        version: activeSession.version + 1,
        lastSnapshot: latestSnapshot,
        abortController: null,
      });

      await this.publishPatch(updatedSession, operations);
      this.scheduleNextTick(streamId, generation);
    } catch (error) {
      if (this.isAbortError(error) || !this.isCurrentSession(streamId, generation)) {
        return;
      }

      const activeSession = this.requireCurrentSession(streamId, generation);
      if (!activeSession) {
        return;
      }

      this.sessionRegistryService.saveSession({
        ...activeSession,
        abortController: null,
      });

      await this.publishError(
        activeSession,
        'poll',
        this.getErrorMessage(error, 'Failed to poll the latest state.'),
      );
      this.scheduleNextTick(streamId, generation);
    }
  }

  // Publishes a patch event when the snapshot changed.
  private publishPatch(
    session: ActivePollingSession<JsonObject, string>,
    operations: PollingPatchEnvelope<string>['operations'],
  ): Promise<void> {
    return this.pollingEventPublisherService.publish(session.streamId, {
      kind: 'patch',
      envelope: {
        sourceKey: buildSourceKey(session.target),
        target: session.target,
        version: session.version,
        receivedAt: new Date().toISOString(),
        operations,
      },
    });
  }

  // Publishes a stream error without destroying the session.
  private publishError(
    session: ActivePollingSession<JsonObject, string>,
    phase: PollingStreamErrorEnvelope<string>['phase'],
    message: string,
  ): Promise<void> {
    return this.pollingEventPublisherService.publish(session.streamId, {
      kind: 'error',
      envelope: {
        sourceKey: buildSourceKey(session.target),
        target: session.target,
        phase,
        receivedAt: new Date().toISOString(),
        message,
      },
    });
  }

  // Starts the interval that looks for expired sessions.
  private startCleanupLoop(): void {
    if (this.cleanupTimerId) {
      return;
    }

    this.cleanupTimerId = setInterval(() => {
      this.expireZombieSessions();
    }, this.cleanupIntervalMs);
  }

  // Stops the cleanup interval when the app shuts down.
  private stopCleanupLoop(): void {
    if (!this.cleanupTimerId) {
      return;
    }

    clearInterval(this.cleanupTimerId);
    this.cleanupTimerId = null;
  }

  // Expires sessions whose TTL was not refreshed in time.
  private expireZombieSessions(): void {
    this.sessionRegistryService
      .listExpiredStreamIds(Date.now())
      .forEach((streamId) => {
        const stopped = this.stopSession(streamId);
        if (stopped) {
          this.logger.warn('Expired zombie polling session ' + streamId + '.');
        }
      });
  }

  // Looks up the current session and verifies that it was not replaced.
  private requireCurrentSession(
    streamId: string,
    generation: number,
  ): ActivePollingSession | undefined {
    const session = this.sessionRegistryService.getSession(streamId);
    if (!session || session.generation !== generation) {
      return undefined;
    }

    return session;
  }

  // Checks whether a stream still belongs to the same runtime generation.
  private isCurrentSession(streamId: string, generation: number): boolean {
    return Boolean(this.requireCurrentSession(streamId, generation));
  }

  // Clears the pending timeout before a stream is stopped or rescheduled.
  private clearTimer(session: ActivePollingSession): void {
    if (!session.timerId) {
      return;
    }

    clearTimeout(session.timerId);
  }

  // Clears the abort controller after one tick finishes without changes.
  private clearAbortController(streamId: string, generation: number): void {
    const session = this.requireCurrentSession(streamId, generation);
    if (!session) {
      return;
    }

    this.sessionRegistryService.saveSession({
      ...session,
      abortController: null,
    });
  }

  // Returns the poller that owns one domain.
  private getPoller(domain: string): PollingDomainPoller {
    return resolvePoller(this.pollerCatalog, domain);
  }

  // Creates the payload that the client uses for a fresh full sync.
  private createSnapshotEnvelope(
    session: ActivePollingSession<JsonObject, string>,
  ): PollingSnapshotEnvelope<JsonObject, string> {
    if (!session.lastSnapshot) {
      throw new Error('Polling session does not have a snapshot yet.');
    }

    return {
      sourceKey: buildSourceKey(session.target),
      target: session.target,
      version: session.version,
      receivedAt: new Date().toISOString(),
      snapshot: session.lastSnapshot,
    };
  }

  // Validates the minimum data needed to start polling.
  private validateTarget(target: PollingSubscriptionTarget<string>): void {
    if (!target.streamId) {
      throw new Error('streamId is required.');
    }

    if (!target.domain) {
      throw new Error('domain is required.');
    }
  }

  // Converts unknown errors into readable client-safe messages.
  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }

  // Detects fetch aborts so we do not publish noisy poll errors on stop.
  private isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  // Creates a new generation token for each fresh session.
  private nextGeneration(): number {
    this.generationCounter += 1;
    return this.generationCounter;
  }
}
