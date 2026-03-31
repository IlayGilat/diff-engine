import { Injectable, Logger } from '@nestjs/common';
import {
  JsonObject,
  PollingPatchEnvelope,
  PollingSnapshotEnvelope,
  PollingStopTarget,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  buildSourceKey,
  normalizePollingTarget,
} from '@org/models';
import { PollingEventPublisherService } from '../realtime/polling-event-publisher.service';
import { DiffPatchService } from './diff-patch.service';
import { PollingDomainRegistryService } from './polling-domain-registry.service';
import {
  PollingOperationMeta,
  PollingOperationResult,
  getPollingOperationMessage,
  pollingFail,
  pollingOk,
} from './polling-operation-result.model';
import { PollingRuntimeRegistryService } from './runtime/polling-runtime-registry.service';
import { buildStreamDomainSessionKey } from './runtime/session-key.util';
import { SnapshotSessionStoreService } from './store/snapshot-session-store.service';

@Injectable()
export class PollingOrchestratorService {
  private readonly logger = new Logger(PollingOrchestratorService.name);
  private readonly disconnectGraceMs = Number(
    process.env.POLLING_DISCONNECT_GRACE_MS ?? 15000,
  );

  constructor(
    private readonly pollingDomainRegistryService: PollingDomainRegistryService,
    private readonly snapshotSessionStoreService: SnapshotSessionStoreService,
    private readonly pollingRuntimeRegistryService: PollingRuntimeRegistryService,
    private readonly diffPatchService: DiffPatchService,
    private readonly pollingEventPublisherService: PollingEventPublisherService,
  ) {}

  async start(
    streamId: string,
    rawTarget: PollingSubscriptionTarget<string>,
  ): Promise<PollingOperationResult<PollingSnapshotEnvelope<JsonObject, string>>> {
    const target = normalizePollingTarget(rawTarget);

    if (!target.domain || !target.email) {
      return pollingFail(
        'INVALID_TARGET',
        'Both domain and email are required.',
        {
          streamId,
          domain: target.domain,
        },
      );
    }

    const sessionKey = buildStreamDomainSessionKey(streamId, target.domain);
    const existingSession = this.snapshotSessionStoreService.get(sessionKey);
    if (existingSession) {
      if (buildSourceKey(target) !== existingSession.sourceKey) {
        return pollingFail(
          'START_CONFLICT',
          'A different target is already bound to this polling stream.',
          {
            streamId,
            domain: target.domain,
            sourceKey: existingSession.sourceKey,
          },
        );
      }

      return this.resumeExistingSession(streamId, sessionKey);
    }

    return this.createSession(streamId, target, sessionKey);
  }

  stopDomain(streamId: string, target: PollingStopTarget<string>): boolean {
    const sessionKey = buildStreamDomainSessionKey(streamId, target.domain);
    const session = this.snapshotSessionStoreService.get(sessionKey);
    if (!session) {
      return false;
    }

    this.pollingRuntimeRegistryService.clear(sessionKey);
    this.snapshotSessionStoreService.delete(sessionKey);
    this.logger.log(
      'Stopped polling session manually ' +
        this.formatLogContext({
          streamId,
          domain: target.domain,
          sourceKey: session.sourceKey,
          reason: 'manual-stop',
        }),
    );
    return true;
  }

  handleStreamConnected(streamId: string): void {
    const sessions = this.snapshotSessionStoreService.listByStreamId(streamId);
    sessions.forEach((session) => {
      const canceledTermination = this.pollingRuntimeRegistryService.cancelTermination(
        session.sessionKey,
      );
      if (canceledTermination) {
        this.logger.log(
          'Canceled scheduled polling termination ' +
            this.formatLogContext({
              streamId,
              domain: session.target.domain,
              sourceKey: session.sourceKey,
              reason: 'stream-reconnected',
            }),
        );
      }
    });
  }

  handleStreamDisconnected(streamId: string): void {
    const sessions = this.snapshotSessionStoreService.listByStreamId(streamId);
    sessions.forEach((session) => {
      this.pauseSession(session.sessionKey, session.streamId, session.target.domain);
    });
  }

  private async pollDomain(streamId: string, domain: string): Promise<void> {
    const sessionKey = buildStreamDomainSessionKey(streamId, domain);
    const canPoll = this.pollingRuntimeRegistryService.tryBeginPolling(sessionKey);
    if (!canPoll) {
      return;
    }

    const session = this.snapshotSessionStoreService.get(sessionKey);
    if (!session) {
      this.pollingRuntimeRegistryService.endPolling(sessionKey);
      return;
    }

    try {
      const resolvedDomainSource = this.pollingDomainRegistryService.resolve(
        session.target,
      );
      if (resolvedDomainSource.isFail()) {
        await this.emitPollingFailure(
          session,
          getPollingOperationMessage(
            resolvedDomainSource.error(),
            'Failed to resolve the polling domain.',
          ),
        );
        return;
      }

      const domainSource = resolvedDomainSource.value();
      const latestSnapshot = await domainSource.fetch(session.target);
      const operations = this.diffPatchService.createPatch(
        session.lastSnapshot,
        latestSnapshot,
      );

      if (operations.length === 0) {
        return;
      }

      const updatedSession = this.snapshotSessionStoreService.updateSnapshot(
        sessionKey,
        latestSnapshot,
      );
      if (!updatedSession) {
        return;
      }

      await this.emitPatch(streamId, {
        sourceKey: updatedSession.sourceKey,
        target: updatedSession.target,
        version: updatedSession.version,
        receivedAt: new Date().toISOString(),
        operations,
      });
      this.logger.log(
        'Published polling patch ' +
          this.formatLogContext({
            streamId,
            domain,
            sourceKey: updatedSession.sourceKey,
            reason:
              'version=' +
              updatedSession.version +
              ', operations=' +
              operations.length,
          }),
      );
    } catch (error) {
      await this.emitPollingFailure(
        session,
        this.getErrorMessage(error, 'Failed to poll the latest state.'),
      );
    } finally {
      this.pollingRuntimeRegistryService.endPolling(sessionKey);
    }
  }

  private async createSession(
    streamId: string,
    target: PollingSubscriptionTarget<string>,
    sessionKey: string,
  ): Promise<PollingOperationResult<PollingSnapshotEnvelope<JsonObject, string>>> {
    const resolvedDomainSource = this.pollingDomainRegistryService.resolve(target);
    if (resolvedDomainSource.isFail()) {
      return pollingFail(
        resolvedDomainSource.error().code,
        getPollingOperationMessage(
          resolvedDomainSource.error(),
          'Failed to resolve the polling domain.',
        ),
        {
          streamId,
          domain: target.domain,
          sourceKey: buildSourceKey(target),
        },
      );
    }

    try {
      const domainSource = resolvedDomainSource.value();
      const snapshot = await domainSource.fetch(target);
      const session = this.snapshotSessionStoreService.create(
        sessionKey,
        streamId,
        target,
        snapshot,
      );
      this.registerInterval(sessionKey, streamId, target.domain, domainSource);

      const envelope = this.toSnapshotEnvelope(session, snapshot);
      this.logger.log(
        'Created polling session ' +
          this.formatLogContext({
            streamId,
            domain: target.domain,
            sourceKey: session.sourceKey,
            reason:
              'pollIntervalMs=' + domainSource.getPollIntervalMs(),
          }),
      );
      return pollingOk(envelope, {
        streamId,
        domain: target.domain,
        sourceKey: session.sourceKey,
      });
    } catch (error) {
      const message = this.getErrorMessage(error, 'Failed to start polling.');
      this.logger.error(
        'Failed to create polling session ' +
          this.formatLogContext({
            streamId,
            domain: target.domain,
            sourceKey: buildSourceKey(target),
            reason: message,
          }),
      );
      return pollingFail('START_FAILED', message, {
        streamId,
        domain: target.domain,
        sourceKey: buildSourceKey(target),
        phase: 'connect',
      });
    }
  }

  private async resumeExistingSession(
    streamId: string,
    sessionKey: string,
  ): Promise<PollingOperationResult<PollingSnapshotEnvelope<JsonObject, string>>> {
    const session = this.snapshotSessionStoreService.get(sessionKey);
    if (!session) {
      return pollingFail(
        'START_FAILED',
        'The polling session could not be resumed.',
        {
          streamId,
        },
      );
    }

    const resolvedDomainSource = this.pollingDomainRegistryService.resolve(
      session.target,
    );
    if (resolvedDomainSource.isFail()) {
      return pollingFail(
        resolvedDomainSource.error().code,
        getPollingOperationMessage(
          resolvedDomainSource.error(),
          'Failed to resolve the polling domain.',
        ),
        {
          streamId,
          domain: session.target.domain,
          sourceKey: session.sourceKey,
        },
      );
    }

    this.pollingRuntimeRegistryService.cancelTermination(sessionKey);
    if (!this.pollingRuntimeRegistryService.hasInterval(sessionKey)) {
      this.registerInterval(
        sessionKey,
        streamId,
        session.target.domain,
        resolvedDomainSource.value(),
      );
      this.logger.log(
        'Resumed paused polling session ' +
          this.formatLogContext({
            streamId,
            domain: session.target.domain,
            sourceKey: session.sourceKey,
            reason:
              'version=' +
              session.version +
              ', pollIntervalMs=' +
              resolvedDomainSource.value().getPollIntervalMs(),
          }),
      );
      void this.pollDomain(streamId, session.target.domain);
    } else {
      this.logger.log(
        'Reused active polling session ' +
          this.formatLogContext({
            streamId,
            domain: session.target.domain,
            sourceKey: session.sourceKey,
            reason: 'version=' + session.version,
          }),
      );
    }

    return pollingOk(this.toSnapshotEnvelope(session, session.lastSnapshot), {
      streamId,
      domain: session.target.domain,
      sourceKey: session.sourceKey,
    });
  }

  private registerInterval(
    sessionKey: string,
    streamId: string,
    domain: string,
    domainSource: {
      getPollIntervalMs(): number;
    },
  ): void {
    const intervalId = setInterval(() => {
      void this.pollDomain(streamId, domain);
    }, domainSource.getPollIntervalMs());

    this.pollingRuntimeRegistryService.register(sessionKey, intervalId);
  }

  private pauseSession(
    sessionKey: string,
    streamId: string,
    domain: string,
  ): void {
    const session = this.snapshotSessionStoreService.get(sessionKey);
    if (!session) {
      return;
    }

    const paused = this.pollingRuntimeRegistryService.pause(sessionKey);
    if (paused) {
      this.logger.warn(
        'Paused polling session after transport close ' +
          this.formatLogContext({
            streamId,
            domain,
            sourceKey: session.sourceKey,
            reason: 'waiting-for-reconnect',
          }),
      );
    }

    this.pollingRuntimeRegistryService.scheduleTermination(
      sessionKey,
      () => {
        this.terminateSession(sessionKey, 'disconnect-grace-expired');
      },
      this.disconnectGraceMs,
    );
    this.logger.warn(
      'Scheduled polling termination ' +
        this.formatLogContext({
          streamId,
          domain,
          sourceKey: session.sourceKey,
          reason:
            'graceMs=' +
            this.disconnectGraceMs +
            ', scheduledAt=' +
            this.pollingRuntimeRegistryService.getTerminationScheduledAt(
              sessionKey,
            ),
        }),
    );
  }

  private terminateSession(sessionKey: string, reason: string): void {
    const session = this.snapshotSessionStoreService.get(sessionKey);
    if (!session) {
      this.pollingRuntimeRegistryService.clear(sessionKey);
      return;
    }

    this.pollingRuntimeRegistryService.clear(sessionKey);
    this.snapshotSessionStoreService.delete(sessionKey);
    this.logger.warn(
      'Terminated abandoned polling session ' +
        this.formatLogContext({
          streamId: session.streamId,
          domain: session.target.domain,
          sourceKey: session.sourceKey,
          reason,
        }),
    );
  }

  private toSnapshotEnvelope(
    session: {
      sourceKey: string;
      target: PollingSubscriptionTarget<string>;
      version: number;
    },
    snapshot: JsonObject,
  ): PollingSnapshotEnvelope<JsonObject, string> {
    return {
      sourceKey: session.sourceKey,
      target: session.target,
      version: session.version,
      receivedAt: new Date().toISOString(),
      snapshot,
    };
  }

  private emitPatch(
    streamId: string,
    envelope: PollingPatchEnvelope<string>,
  ): Promise<void> {
    return this.pollingEventPublisherService.publish(streamId, {
      kind: 'patch',
      envelope,
    });
  }

  private emitError(
    streamId: string,
    envelope: PollingStreamErrorEnvelope<string>,
  ): Promise<void> {
    return this.pollingEventPublisherService.publish(streamId, {
      kind: 'error',
      envelope,
    });
  }

  private async emitPollingFailure(
    session: {
      streamId: string;
      sourceKey: string;
      target: PollingSubscriptionTarget<string>;
    },
    message: string,
  ): Promise<void> {
    this.logger.warn(
      'Polling cycle failed ' +
        this.formatLogContext({
          streamId: session.streamId,
          domain: session.target.domain,
          sourceKey: session.sourceKey,
          reason: message,
        }),
    );
    await this.emitError(session.streamId, {
      sourceKey: session.sourceKey,
      target: session.target,
      phase: 'poll',
      receivedAt: new Date().toISOString(),
      message,
    });
  }

  private formatLogContext(meta: PollingOperationMeta): string {
    const entries = Object.entries(meta).filter(([, value]) => Boolean(value));
    return entries.map(([key, value]) => key + '=' + value).join(' ');
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }
}
