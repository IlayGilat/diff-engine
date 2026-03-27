import { Injectable, Logger } from '@nestjs/common';
import {
  DIFF_ENGINE_SOCKET_EVENTS,
  JsonObject,
  PollingStopTarget,
  PollingPatchEnvelope,
  PollingSnapshotEnvelope,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  buildSourceKey,
  normalizePollingTarget,
} from '@org/models';
import { Socket } from 'socket.io';
import { DiffPatchService } from './diff-patch.service';
import { PollingDomainRegistryService } from './polling-domain-registry.service';
import { PollingRuntimeRegistryService } from './runtime/polling-runtime-registry.service';
import { buildSocketDomainSessionKey } from './runtime/session-key.util';
import { SnapshotSessionStoreService } from './store/snapshot-session-store.service';

@Injectable()
export class PollingOrchestratorService {
  private readonly logger = new Logger(PollingOrchestratorService.name);

  constructor(
    private readonly pollingDomainRegistryService: PollingDomainRegistryService,
    private readonly snapshotSessionStoreService: SnapshotSessionStoreService,
    private readonly pollingRuntimeRegistryService: PollingRuntimeRegistryService,
    private readonly diffPatchService: DiffPatchService,
  ) {}

  async start(
    client: Socket,
    rawTarget: PollingSubscriptionTarget<string>,
  ): Promise<void> {
    const target = normalizePollingTarget(rawTarget);
    const sourceKey = buildSourceKey(target);

    if (!target.domain || !target.email) {
      this.emitError(client, {
        sourceKey,
        target,
        phase: 'connect',
        receivedAt: new Date().toISOString(),
        message: 'Both domain and email are required.',
      });
      return;
    }

    this.stopDomain(client.id, {
      domain: target.domain,
    });

    try {
      const domainSource = this.pollingDomainRegistryService.resolve(target);
      const snapshot = await domainSource.fetchSnapshot(target);
      const sessionKey = buildSocketDomainSessionKey(client.id, target.domain);
      const intervalId = setInterval(() => {
        void this.pollDomain(client, target.domain);
      }, domainSource.getPollIntervalMs());

      const session = this.snapshotSessionStoreService.create(
        sessionKey,
        client.id,
        target,
        snapshot,
      );
      this.pollingRuntimeRegistryService.register(sessionKey, intervalId);

      this.emitSnapshot(client, {
        sourceKey: session.sourceKey,
        target: session.target,
        version: session.version,
        receivedAt: new Date().toISOString(),
        snapshot,
      });

      this.logger.log(
        'Started polling for socket ' + client.id + ' on ' + session.sourceKey,
      );
    } catch (error) {
      this.emitError(client, {
        sourceKey,
        target,
        phase: 'connect',
        receivedAt: new Date().toISOString(),
        message: this.getErrorMessage(error, 'Failed to start polling.'),
      });
    }
  }

  stopSocket(socketId: string): void {
    const records = this.snapshotSessionStoreService.listBySocket(socketId);
    records.forEach((record) => {
      this.stopDomain(socketId, {
        domain: record.target.domain,
      });
    });
  }

  stopDomain(socketId: string, target: PollingStopTarget<string>): void {
    const sessionKey = buildSocketDomainSessionKey(socketId, target.domain);
    const session = this.snapshotSessionStoreService.get(sessionKey);
    if (!session) {
      return;
    }

    this.pollingRuntimeRegistryService.clear(sessionKey);
    this.snapshotSessionStoreService.delete(sessionKey);
    this.logger.log(
      'Stopped polling for socket ' +
        socketId +
        ' on domain ' +
        target.domain +
        '.',
    );
  }

  private async pollDomain(client: Socket, domain: string): Promise<void> {
    if (!client.connected) {
      this.stopSocket(client.id);
      return;
    }

    const sessionKey = buildSocketDomainSessionKey(client.id, domain);
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
      const latestSnapshot = await domainSource.fetchSnapshot(session.target);
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

      this.emitPatch(client, {
        sourceKey: updatedSession.sourceKey,
        target: updatedSession.target,
        version: updatedSession.version,
        receivedAt: new Date().toISOString(),
        operations,
      });
    } catch (error) {
      this.emitError(client, {
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

  private emitSnapshot(
    client: Socket,
    envelope: PollingSnapshotEnvelope<JsonObject, string>,
  ): void {
    client.emit(DIFF_ENGINE_SOCKET_EVENTS.fullState, envelope);
  }

  private emitPatch(
    client: Socket,
    envelope: PollingPatchEnvelope<string>,
  ): void {
    client.emit(DIFF_ENGINE_SOCKET_EVENTS.patch, envelope);
  }

  private emitError(
    client: Socket,
    envelope: PollingStreamErrorEnvelope<string>,
  ): void {
    const eventName =
      envelope.phase === 'connect'
        ? DIFF_ENGINE_SOCKET_EVENTS.startError
        : DIFF_ENGINE_SOCKET_EVENTS.pollingError;

    client.emit(eventName, envelope);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }
}
