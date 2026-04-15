import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import {
  ActiveRealtimeStream,
  Dictionary,
  JsonObject,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  RealtimeDomainClientEvent,
  buildSourceKey,
  normalizePollingTarget,
} from '@org/models';
import { Client, createClient } from 'graphql-ws';
import { Observable, Subject, filter } from 'rxjs';
import { RealtimeClientConfigService } from '../../config/services/realtime-client-config.service';
import { AbstractDomainStreamClient } from './domain-stream-client.base';

function parseRealtimePayload<TValue>(payload: string): TValue {
  return JSON.parse(payload) as TValue;
}

@Injectable({
  providedIn: 'root',
})
export class GraphqlDomainStreamClientService extends AbstractDomainStreamClient {
  private readonly realtimeClientConfigService = inject(RealtimeClientConfigService);
  private graphqlWsClient: Client | null = null;
  private readonly activeTargets: Dictionary<ActiveRealtimeStream> = {};
  private readonly eventStream = new Subject<
    RealtimeDomainClientEvent<JsonObject, string>
  >();

  connect<TDomain extends string, TSnapshot extends JsonObject>(
    target: PollingSubscriptionTarget<TDomain>,
  ): Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>> {
    const normalizedTarget = normalizePollingTarget(target);
    if (!normalizedTarget.domain || !normalizedTarget.email) {
      queueMicrotask(() => {
        this.emitClientError(
          normalizedTarget,
          'Both domain and email are required.',
        );
      });

      return this.selectDomainEventStream<TDomain, TSnapshot>(
        normalizedTarget.domain,
      );
    }

    this.disconnect(normalizedTarget.domain);

    const stream: ActiveRealtimeStream = {
      target: normalizedTarget,
      hasReceivedPayload: false,
    };

    this.activeTargets[normalizedTarget.domain] = stream;
    this.ensureGraphqlWsClient();
    this.startSubscription(stream);

    return this.selectDomainEventStream<TDomain, TSnapshot>(
      normalizedTarget.domain,
    );
  }

  disconnect(domainKey: string): void {
    const stream = this.activeTargets[domainKey];
    if (!stream) {
      return;
    }

    delete this.activeTargets[domainKey];
    stream.unsubscribe?.();
    this.emitDomainDisconnected(stream.target);

    if (Object.keys(this.activeTargets).length === 0) {
      this.closeGraphqlWsClient();
    }
  }

  private ensureGraphqlWsClient(): void {
    if (this.graphqlWsClient) {
      return;
    }

    this.graphqlWsClient = createClient({
      url: this.realtimeClientConfigService.realtimeGraphqlWsUrl,
      on: {
        closed: () => {
          Object.values(this.activeTargets).forEach((stream) => {
            stream.hasReceivedPayload = false;
            this.emitDomainDisconnected(stream.target);
          });
        },
      },
    });
  }

  private startSubscription(stream: ActiveRealtimeStream): void {
    if (!this.graphqlWsClient) {
      return;
    }

    stream.unsubscribe = this.graphqlWsClient.subscribe(
      {
        query: `
          subscription PollingEvents($domain: String!, $email: String!) {
            pollingEvents(domain: $domain, email: $email)
          }
        `,
        variables: {
          domain: stream.target.domain,
          email: stream.target.email,
        },
      },
      {
        next: (result) => {
          const payload = result.data?.['pollingEvents'];
          if (!payload) {
            return;
          }

          if (!stream.hasReceivedPayload) {
            stream.hasReceivedPayload = true;
            this.eventStream.next({
              kind: 'connected',
              sourceKey: buildSourceKey(stream.target),
              target: stream.target,
              receivedAt: new Date().toISOString(),
            });
          }

          this.eventStream.next(
            parseRealtimePayload<RealtimeDomainClientEvent<JsonObject, string>>(
              payload as string,
            ),
          );
        },
        error: (error) => {
          this.emitClientError(stream.target, this.getGraphqlWsErrorMessage(error));
        },
        complete: () => {
          if (
            this.activeTargets[stream.target.domain] &&
            stream.hasReceivedPayload
          ) {
            this.emitDomainDisconnected(stream.target);
          }
        },
      },
    );
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

  private emitClientError(
    target: PollingSubscriptionTarget<string>,
    message: string,
  ): void {
    const envelope: PollingStreamErrorEnvelope<string> = {
      sourceKey: buildSourceKey(target),
      target,
      phase: 'connect',
      receivedAt: new Date().toISOString(),
      message,
    };

    this.eventStream.next({
      kind: 'error',
      envelope,
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

  private selectDomainEventStream<TDomain extends string, TSnapshot extends JsonObject>(
    domainKey: string,
  ): Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>> {
    return this.eventStream.pipe(
      filter((event) => this.getEventDomain(event) === domainKey),
    ) as Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>>;
  }

  private getGraphqlWsErrorMessage(error: unknown): string {
    if (Array.isArray(error) && error.length > 0) {
      const firstError = error[0] as { message?: string };
      if (firstError.message) {
        return firstError.message;
      }
    }

    return this.getErrorMessage(error);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to connect to the realtime GraphQL stream.';
  }

  private closeGraphqlWsClient(): void {
    if (!this.graphqlWsClient) {
      return;
    }

    void this.graphqlWsClient.dispose();
    this.graphqlWsClient = null;
  }
}
