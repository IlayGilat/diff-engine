import { Injectable, Logger } from '@nestjs/common';
import {
  JsonObject,
  PollingPatchEnvelope,
  PollingResumeEnvelope,
  PollingSnapshotEnvelope,
  PollingStopTarget,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  SnapshotSessionRecord,
  createSnapshotHash,
  normalizePollingTarget,
} from '@org/models';
import { PollingEventPublisherService } from '../../realtime/polling-event-publisher.service';
import { DiffPatchService } from './diff-patch.service';
import { PollingDomainRegistryService } from './polling-domain-registry.service';
import { PollingRuntimeRegistryService } from '../runtime/polling-runtime-registry.service';
import { buildStreamDomainSessionKey } from '../runtime/session-key.util';
import { SnapshotSessionStoreService } from '../store/services/snapshot-session-store.service';

const POLLING_GRACE_PERIOD_MS = 15_000;

@Injectable()
export class PollingOrchestratorService {
  private readonly logger = new Logger(PollingOrchestratorService.name);

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
  ): Promise<PollingSnapshotEnvelope<JsonObject, string>> {
    const target = normalizePollingTarget(rawTarget);

    if (!target.domain || !target.email) {
      throw new Error('Both domain and email are required.');
    }

    this.stopDomain(streamId, {
      domain: target.domain,
    });

    try {
      const domainSource = this.pollingDomainRegistryService.resolve(target);
      const snapshot = await domainSource.fetch(target);
      const snapshotHash = createSnapshotHash(snapshot);
      const sessionKey = buildStreamDomainSessionKey(streamId, target.domain);
      const session = this.snapshotSessionStoreService.create(
        sessionKey,
        streamId,
        target,
        snapshot,
        snapshotHash,
      );
      this.pollingRuntimeRegistryService.register(
        sessionKey,
        this.createPollingInterval(streamId, target),
      );

      const envelope = this.createSnapshotEnvelope(session);

      this.logger.log(
        'Started polling for stream ' + streamId + ' on ' + session.sourceKey,
      );
      return envelope;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, 'Failed to start polling.'));
    }
  }

  async resume(
    streamId: string,
    rawTarget: PollingSubscriptionTarget<string>,
    lastKnownHash?: string,
  ): Promise<PollingResumeEnvelope<JsonObject, string>> {
    const target = normalizePollingTarget(rawTarget);
    const sessionKey = buildStreamDomainSessionKey(streamId, target.domain);
    const session = this.snapshotSessionStoreService.get(sessionKey);

    if (
      session &&
      session.target.email === target.email &&
      session.snapshotHash === lastKnownHash
    ) {
      this.pollingRuntimeRegistryService.resume(
        sessionKey,
        this.createPollingInterval(streamId, target),
      );

      this.logger.log(
        'Resumed polling for stream ' + streamId + ' on ' + session.sourceKey,
      );
      return {
        kind: 'resumed',
        resetStore: false,
        sourceKey: session.sourceKey,
        target: session.target,
        version: session.version,
        snapshotHash: session.snapshotHash,
        receivedAt: new Date().toISOString(),
      };
    }

    const envelope = await this.start(streamId, target);
    return {
      kind: 'resynced',
      resetStore: true,
      envelope,
    };
  }

  stopDomain(streamId: string, target: PollingStopTarget<string>): boolean {
    const sessionKey = buildStreamDomainSessionKey(streamId, target.domain);
    const session = this.snapshotSessionStoreService.get(sessionKey);

    this.pollingRuntimeRegistryService.clear(sessionKey);
    if (session) {
      this.snapshotSessionStoreService.delete(sessionKey);
      this.logger.log(
        'Stopped polling for stream ' +
          streamId +
          ' on domain ' +
          target.domain +
          '.',
      );
      return true;
    }

    return false;
  }

  pauseStreams(streamIds: string[]): void {
    Array.from(new Set(streamIds)).forEach((streamId) => {
      const sessions = this.snapshotSessionStoreService.listByStreamId(streamId);
      sessions.forEach((session) => {
        const paused = this.pollingRuntimeRegistryService.pause(
          session.sessionKey,
          () => {
            this.snapshotSessionStoreService.delete(session.sessionKey);
            this.logger.log(
              'Destroyed paused polling for stream ' +
                streamId +
                ' on ' +
                session.sourceKey +
                '.',
            );
          },
          POLLING_GRACE_PERIOD_MS,
        );

        if (paused) {
          this.logger.log(
            'Paused polling for stream ' +
              streamId +
              ' on ' +
              session.sourceKey +
              ' for ' +
              POLLING_GRACE_PERIOD_MS +
              'ms.',
          );
        }
      });
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
      const domainSource = this.pollingDomainRegistryService.resolve(
        session.target,
      );
      const latestSnapshot = await domainSource.fetch(session.target);
      if (!this.pollingRuntimeRegistryService.isActive(sessionKey)) {
        return;
      }

      const operations = this.diffPatchService.createPatch(
        session.lastSnapshot,
        latestSnapshot,
      );

      if (operations.length === 0) {
        return;
      }

      const snapshotHash = createSnapshotHash(latestSnapshot);
      const updatedSession = this.snapshotSessionStoreService.updateSnapshot(
        sessionKey,
        latestSnapshot,
        snapshotHash,
      );
      if (!updatedSession) {
        return;
      }

      await this.emitPatch(streamId, {
        sourceKey: updatedSession.sourceKey,
        target: updatedSession.target,
        version: updatedSession.version,
        snapshotHash: updatedSession.snapshotHash,
        receivedAt: new Date().toISOString(),
        operations,
      });
    } catch (error) {
      await this.emitError(streamId, {
        sourceKey: session.sourceKey,
        target: session.target,
        phase: 'poll',
        receivedAt: new Date().toISOString(),
        message: this.getErrorMessage(
          error,
          'Failed to poll the latest state.',
        ),
      });
    } finally {
      this.pollingRuntimeRegistryService.endPolling(sessionKey);
    }
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

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }

  private createPollingInterval(
    streamId: string,
    target: PollingSubscriptionTarget<string>,
  ): ReturnType<typeof setInterval> {
    const domainSource = this.pollingDomainRegistryService.resolve(target);
    return setInterval(() => {
      void this.pollDomain(streamId, target.domain);
    }, domainSource.getPollIntervalMs());
  }

  private createSnapshotEnvelope(
    session: SnapshotSessionRecord<JsonObject, string>,
  ): PollingSnapshotEnvelope<JsonObject, string> {
    return {
      sourceKey: session.sourceKey,
      target: session.target,
      version: session.version,
      snapshotHash: session.snapshotHash,
      receivedAt: new Date().toISOString(),
      snapshot: session.lastSnapshot,
    };
  }
}
