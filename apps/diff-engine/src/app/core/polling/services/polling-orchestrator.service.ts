import { Injectable, Logger } from '@nestjs/common';
import {
  JsonObject,
  PollingPatchEnvelope,
  PollingSnapshotEnvelope,
  PollingStopTarget,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  normalizePollingTarget,
} from '@org/models';
import { PollingEventPublisherService } from '../../realtime/polling-event-publisher.service';
import { DiffPatchService } from './diff-patch.service';
import { PollingDomainRegistryService } from './polling-domain-registry.service';
import { PollingRuntimeRegistryService } from '../runtime/polling-runtime-registry.service';
import { buildStreamDomainSessionKey } from '../runtime/session-key.util';
import { SnapshotSessionStoreService } from '../store/services/snapshot-session-store.service';

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
      const sessionKey = buildStreamDomainSessionKey(streamId, target.domain);
      const intervalId = setInterval(() => {
        void this.pollDomain(streamId, target.domain);
      }, domainSource.getPollIntervalMs());

      const session = this.snapshotSessionStoreService.create(
        sessionKey,
        streamId,
        target,
        snapshot,
      );
      this.pollingRuntimeRegistryService.register(sessionKey, intervalId);

      const envelope: PollingSnapshotEnvelope<JsonObject, string> = {
        sourceKey: session.sourceKey,
        target: session.target,
        version: session.version,
        receivedAt: new Date().toISOString(),
        snapshot,
      };

      this.logger.log(
        'Started polling for stream ' + streamId + ' on ' + session.sourceKey,
      );
      return envelope;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, 'Failed to start polling.'));
    }
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
      'Stopped polling for stream ' +
        streamId +
        ' on domain ' +
        target.domain +
        '.',
    );
    return true;
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
}
