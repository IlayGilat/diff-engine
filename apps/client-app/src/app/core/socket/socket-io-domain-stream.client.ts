import { Injectable } from '@angular/core';
import {
  DIFF_ENGINE_SOCKET_EVENTS,
  JsonObject,
  PollingStopTarget,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  RealtimeDomainClientEvent,
  buildSourceKey,
  normalizePollingTarget,
} from '@org/models';
import { Observable, Subject, filter } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { RealtimeClientConfigService } from '../config/realtime-client-config.service';
import { AbstractDomainStreamClient } from './domain-stream-client.base';

@Injectable({
  providedIn: 'root',
})
export class SocketIoDomainStreamClientService extends AbstractDomainStreamClient {
  private socket: Socket | null = null;
  private readonly activeTargets = new Map<string, PollingSubscriptionTarget<string>>();
  private readonly eventStream = new Subject<
    RealtimeDomainClientEvent<JsonObject, string>
  >();

  constructor(
    private readonly realtimeClientConfigService: RealtimeClientConfigService,
  ) {
    super();
  }

  connect<TDomain extends string, TSnapshot extends JsonObject>(
    target: PollingSubscriptionTarget<TDomain>,
  ): Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>> {
    const normalizedTarget = normalizePollingTarget(target);
    this.ensureSocket();
    this.activeTargets.set(normalizedTarget.domain, normalizedTarget);
    this.startDomain(normalizedTarget);

    return this.eventStream.pipe(
      filter((event) => this.getEventDomain(event) === normalizedTarget.domain),
    ) as Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>>;
  }

  disconnect(domainKey: string): void {
    const target = this.activeTargets.get(domainKey);
    if (!target) {
      return;
    }

    this.activeTargets.delete(domainKey);
    this.emitDomainDisconnected(target);

    if (this.socket?.connected) {
      const stopPayload: PollingStopTarget<string> = {
        domain: target.domain,
      };

      this.socket.emit(DIFF_ENGINE_SOCKET_EVENTS.stopPolling, stopPayload);
    }

    if (this.activeTargets.size === 0) {
      this.closeSocket();
    }
  }

  private ensureSocket(): void {
    if (this.socket) {
      return;
    }

    const socket = io(this.realtimeClientConfigService.diffEngineUrl, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      this.activeTargets.forEach((target) => {
        this.startDomain(target);
      });
    });

    socket.on('disconnect', () => {
      this.activeTargets.forEach((target) => {
        this.emitDomainDisconnected(target);
      });
    });

    socket.on(DIFF_ENGINE_SOCKET_EVENTS.fullState, (envelope) => {
      this.eventStream.next({
        kind: 'snapshot',
        envelope,
      });
    });

    socket.on(DIFF_ENGINE_SOCKET_EVENTS.patch, (envelope) => {
      this.eventStream.next({
        kind: 'patch',
        envelope,
      });
    });

    socket.on(
      DIFF_ENGINE_SOCKET_EVENTS.startError,
      (envelope: PollingStreamErrorEnvelope<string>) => {
        this.eventStream.next({
          kind: 'error',
          envelope,
        });
      },
    );

    socket.on(
      DIFF_ENGINE_SOCKET_EVENTS.pollingError,
      (envelope: PollingStreamErrorEnvelope<string>) => {
        this.eventStream.next({
          kind: 'error',
          envelope,
        });
      },
    );

    socket.on('connect_error', (error: Error) => {
      this.activeTargets.forEach((target) => {
        this.eventStream.next({
          kind: 'error',
          envelope: {
            sourceKey: buildSourceKey(target),
            target,
            phase: 'connect',
            receivedAt: new Date().toISOString(),
            message: error.message,
          },
        });
      });
    });

    this.socket = socket;
  }

  private startDomain(target: PollingSubscriptionTarget<string>): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit(DIFF_ENGINE_SOCKET_EVENTS.startPolling, target);
    this.eventStream.next({
      kind: 'connected',
      sourceKey: buildSourceKey(target),
      target,
      receivedAt: new Date().toISOString(),
    });
  }

  private emitDomainDisconnected(
    target: PollingSubscriptionTarget<string>,
  ): void {
    this.eventStream.next({
      kind: 'disconnected',
      sourceKey: buildSourceKey(target),
      target,
      receivedAt: new Date().toISOString(),
    });
  }

  private getEventDomain(
    event: RealtimeDomainClientEvent<JsonObject, string>,
  ): string {
    if (event.kind === 'snapshot' || event.kind === 'patch' || event.kind === 'error') {
      return event.envelope.target.domain;
    }

    return event.target.domain;
  }

  private closeSocket(): void {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.socket = null;
  }
}
