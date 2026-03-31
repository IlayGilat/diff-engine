import { Injectable } from '@angular/core';
import {
  JsonObject,
  PollingSnapshotEnvelope,
  PollingStopTarget,
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

interface ActiveRealtimeStream {
  streamId: string;
  target: PollingSubscriptionTarget<string>;
  unsubscribe?: () => void;
}

interface GraphqlResponse<TData> {
  data?: TData;
  errors?: Array<{ message: string }>;
}

function parseRealtimePayload<TValue>(payload: string): TValue {
  return JSON.parse(payload) as TValue;
}

@Injectable({
  providedIn: 'root',
})
export class GraphqlDomainStreamClientService extends AbstractDomainStreamClient {
  private graphqlWsClient: Client | null = null;
  private readonly activeTargets = new Map<string, ActiveRealtimeStream>();
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
    this.disconnect(normalizedTarget.domain);

    const stream: ActiveRealtimeStream = {
      streamId: this.createStreamId(normalizedTarget),
      target: normalizedTarget,
    };

    this.activeTargets.set(normalizedTarget.domain, stream);
    this.ensureGraphqlWsClient();
    this.startSubscription(stream);
    void this.startDomain(stream);

    return this.eventStream.pipe(
      filter((event) => this.getEventDomain(event) === normalizedTarget.domain),
    ) as Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>>;
  }

  disconnect(domainKey: string): void {
    const stream = this.activeTargets.get(domainKey);
    if (!stream) {
      return;
    }

    this.activeTargets.delete(domainKey);
    stream.unsubscribe?.();
    void this.stopDomain(stream);
    this.emitDomainDisconnected(stream.target);

    if (this.activeTargets.size === 0) {
      this.closeGraphqlWsClient();
    }
  }

  private ensureGraphqlWsClient(): void {
    if (this.graphqlWsClient) {
      return;
    }

    this.graphqlWsClient = createClient({
      url: this.realtimeClientConfigService.diffEngineWsUrl,
      on: {
        closed: () => {
          this.activeTargets.forEach((stream) => {
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
          subscription PollingEvents($streamId: String!) {
            pollingEvents(streamId: $streamId)
          }
        `,
        variables: {
          streamId: stream.streamId,
        },
      },
      {
        next: (result) => {
          const payload = result.data?.['pollingEvents'];
          if (!payload) {
            return;
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
          if (this.activeTargets.has(stream.target.domain)) {
            this.emitDomainDisconnected(stream.target);
          }
        },
      },
    );
  }

  private async startDomain(stream: ActiveRealtimeStream): Promise<void> {
    try {
      const started = await this.executeOperation<{
        startPolling: string;
      }>(
        `
          mutation StartPolling(
            $streamId: String!
            $domain: String!
            $email: String!
          ) {
            startPolling(
              streamId: $streamId
              domain: $domain
              email: $email
            )
          }
        `,
        {
          streamId: stream.streamId,
          domain: stream.target.domain,
          email: stream.target.email,
        },
      );

      this.eventStream.next({
        kind: 'connected',
        sourceKey: buildSourceKey(stream.target),
        target: stream.target,
        receivedAt: new Date().toISOString(),
      });
      this.eventStream.next({
        kind: 'snapshot',
        envelope: parseRealtimePayload<PollingSnapshotEnvelope<JsonObject, string>>(
          started.startPolling,
        ),
      });
    } catch (error) {
      this.emitClientError(stream.target, this.getErrorMessage(error));
    }
  }

  private async stopDomain(stream: ActiveRealtimeStream): Promise<void> {
    const stopPayload: PollingStopTarget<string> = {
      domain: stream.target.domain,
    };

    try {
      await this.executeOperation<{ stopPolling: boolean }>(
        `
          mutation StopPolling($streamId: String!, $domain: String!) {
            stopPolling(streamId: $streamId, domain: $domain)
          }
        `,
        {
          streamId: stream.streamId,
          domain: stopPayload.domain,
        },
      );
    } catch {
      return;
    }
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

  private createStreamId(target: PollingSubscriptionTarget<string>): string {
    return (
      target.domain +
      '-' +
      Math.random().toString(36).slice(2, 10) +
      '-' +
      Date.now().toString(36)
    );
  }

  private async executeOperation<TData>(
    query: string,
    variables: Record<string, string>,
  ): Promise<TData> {
    const response = await fetch(this.realtimeClientConfigService.diffEngineHttpUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error('GraphQL request failed with status ' + response.status + '.');
    }

    const payload = (await response.json()) as GraphqlResponse<TData>;
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join(', '));
    }

    if (!payload.data) {
      throw new Error('GraphQL response did not include data.');
    }

    return payload.data;
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

    return 'Failed to connect to the realtime stream.';
  }

  private closeGraphqlWsClient(): void {
    if (!this.graphqlWsClient) {
      return;
    }

    void this.graphqlWsClient.dispose();
    this.graphqlWsClient = null;
  }
}
