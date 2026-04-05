import { Injectable, inject } from '@angular/core';
import {
  ActiveRealtimeStream,
  Dictionary,
  JsonObject,
  PollingSnapshotEnvelope,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  RealtimeDomainClientEvent,
  buildSourceKey,
  normalizePollingTarget,
} from '@org/models';
import { Client, ClientOptions, createClient } from 'graphql-ws';
import { Observable, Subject, filter } from 'rxjs';
import { RealtimeClientConfigService } from '../../config/services/realtime-client-config.service';
import { AbstractDomainStreamClient } from './domain-stream-client.base';

const HEARTBEAT_INTERVAL_MS = 10_000;

// Parses the string payloads returned by the GraphQL API.
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

  // Opens one domain stream and starts polling from the server.
  connect<TDomain extends string, TSnapshot extends JsonObject>(
    rawTarget: PollingSubscriptionTarget<TDomain>,
  ): Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>> {
    const normalizedTarget = normalizePollingTarget({
      ...rawTarget,
      streamId: rawTarget.streamId || this.createStreamId(rawTarget.domain),
    });

    this.disconnect(normalizedTarget.domain);

    const stream: ActiveRealtimeStream = {
      streamId: normalizedTarget.streamId,
      target: normalizedTarget,
    };

    this.activeTargets[normalizedTarget.domain] = stream;
    this.startSubscription(stream);
    void this.startDomain(stream);

    return this.eventStream.pipe(
      filter((event) => this.getEventDomain(event) === normalizedTarget.domain),
    ) as Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>>;
  }

  // Closes one active domain stream and stops server polling.
  disconnect(domainKey: string): void {
    const stream = this.activeTargets[domainKey];
    if (!stream) {
      return;
    }

    delete this.activeTargets[domainKey];
    this.stopHeartbeat(stream);
    stream.unsubscribe?.();
    this.emitDomainDisconnected(stream.target);

    void this.stopDomain(stream).finally(() => {
      if (Object.keys(this.activeTargets).length === 0) {
        this.closeGraphqlWsClient();
      }
    });
  }

  // Creates the shared graphql-ws client on first use.
  private ensureGraphqlWsClient(): Client {
    if (this.graphqlWsClient) {
      return this.graphqlWsClient;
    }

    const options: ClientOptions = {
      url: this.realtimeClientConfigService.diffEngineWsUrl,
      on: {
        connected: (_socket, _payload, wasRetry) => {
          if (!wasRetry) {
            return;
          }

          Object.values(this.activeTargets).forEach((stream) => {
            void this.startDomain(stream);
          });
        },
        closed: () => {
          Object.values(this.activeTargets).forEach((stream) => {
            this.stopHeartbeat(stream);
            this.emitDomainDisconnected(stream.target);
          });
        },
      },
    };

    this.graphqlWsClient = createClient(options);
    return this.graphqlWsClient;
  }

  // Starts the event subscription for one stream id.
  private startSubscription(stream: ActiveRealtimeStream): void {
    const graphqlWsClient = this.ensureGraphqlWsClient();

    stream.unsubscribe = graphqlWsClient.subscribe(
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
          if (!this.isActiveStream(stream)) {
            return;
          }

          const payload = result.data?.['pollingEvents'];
          if (!payload) {
            return;
          }

          const event =
            parseRealtimePayload<RealtimeDomainClientEvent<JsonObject, string>>(
              payload as string,
            );
          this.eventStream.next(event);
        },
        error: (error) => {
          if (!this.isActiveStream(stream)) {
            return;
          }

          this.emitClientError(stream.target, this.getGraphqlWsErrorMessage(error));
        },
        complete: () => {
          if (this.activeTargets[stream.target.domain]) {
            this.emitDomainDisconnected(stream.target);
          }
        },
      },
    );
  }

  // Starts server polling and emits a fresh snapshot for the store.
  private async startDomain(stream: ActiveRealtimeStream): Promise<void> {
    this.stopHeartbeat(stream);

    try {
      const started = await this.executeOperation<{
        startPolling: string;
      }>(
        `
          mutation StartPolling(
            $streamId: String!
            $domain: String!
            $params: JSONObject!
          ) {
            startPolling(
              streamId: $streamId
              domain: $domain
              params: $params
            )
          }
        `,
        {
          streamId: stream.streamId,
          domain: stream.target.domain,
          params: stream.target.params,
        },
      );

      if (!this.isActiveStream(stream)) {
        return;
      }

      const snapshotEnvelope =
        parseRealtimePayload<PollingSnapshotEnvelope<JsonObject, string>>(
          started.startPolling,
        );

      this.startHeartbeat(stream);
      this.eventStream.next({
        kind: 'connected',
        sourceKey: buildSourceKey(stream.target),
        target: stream.target,
        receivedAt: new Date().toISOString(),
      });
      this.eventStream.next({
        kind: 'snapshot',
        envelope: snapshotEnvelope,
      });
    } catch (error) {
      if (this.isActiveStream(stream)) {
        this.emitClientError(stream.target, this.getErrorMessage(error));
      }
    }
  }

  // Stops server polling for one stream.
  private async stopDomain(stream: ActiveRealtimeStream): Promise<void> {
    try {
      await this.executeOperation<{ stopPolling: boolean }>(
        `
          mutation StopPolling($streamId: String!) {
            stopPolling(streamId: $streamId)
          }
        `,
        {
          streamId: stream.streamId,
        },
      );
    } catch {
      return;
    }
  }

  // Starts the TTL heartbeat on the same websocket connection.
  private startHeartbeat(stream: ActiveRealtimeStream): void {
    this.stopHeartbeat(stream);

    stream.heartbeatIntervalId = setInterval(() => {
      void this.sendHeartbeat(stream);
    }, HEARTBEAT_INTERVAL_MS);
  }

  // Stops the TTL heartbeat when a stream disconnects.
  private stopHeartbeat(stream: ActiveRealtimeStream): void {
    if (!stream.heartbeatIntervalId) {
      return;
    }

    clearInterval(stream.heartbeatIntervalId);
    stream.heartbeatIntervalId = undefined;
  }

  // Refreshes the server lease and restarts polling if the lease was lost.
  private async sendHeartbeat(stream: ActiveRealtimeStream): Promise<void> {
    if (!this.isActiveStream(stream)) {
      return;
    }

    try {
      const heartbeat = await this.executeOperation<{ heartbeat: boolean }>(
        `
          mutation Heartbeat($streamId: String!) {
            heartbeat(streamId: $streamId)
          }
        `,
        {
          streamId: stream.streamId,
        },
      );

      if (!heartbeat.heartbeat && this.isActiveStream(stream)) {
        await this.startDomain(stream);
      }
    } catch (error) {
      if (this.isActiveStream(stream)) {
        this.emitClientError(stream.target, this.getErrorMessage(error));
      }
    }
  }

  // Emits a disconnected event for one domain target.
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

  // Emits a client-side connect error as a normal stream event.
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

  // Reads the domain key from any realtime event shape.
  private getEventDomain(
    event: RealtimeDomainClientEvent<JsonObject, string>,
  ): string {
    if (
      event.kind === 'snapshot' ||
      event.kind === 'patch' ||
      event.kind === 'error'
    ) {
      return event.envelope.target.domain;
    }

    return event.target.domain;
  }

  // Creates a stable stream id for the life of one connected domain.
  private createStreamId(domain: string): string {
    return (
      domain +
      '-' +
      Math.random().toString(36).slice(2, 10) +
      '-' +
      Date.now().toString(36)
    );
  }

  // Runs GraphQL mutations over the active websocket so one pod owns the stream.
  private executeOperation<TData>(
    query: string,
    variables: Dictionary<unknown>,
  ): Promise<TData> {
    const graphqlWsClient = this.ensureGraphqlWsClient();

    return new Promise<TData>((resolve, reject) => {
      let isSettled = false;
      let unsubscribe: (() => void) | undefined;

      unsubscribe = graphqlWsClient.subscribe(
        {
          query,
          variables,
        },
        {
          next: (result) => {
            if (isSettled) {
              return;
            }

            if (result.errors?.length) {
              isSettled = true;
              unsubscribe?.();
              reject(
                new Error(
                  result.errors.map((error) => error.message).join(', '),
                ),
              );
              return;
            }

            if (!result.data) {
              return;
            }

            isSettled = true;
            unsubscribe?.();
            resolve(result.data as TData);
          },
          error: (error) => {
            if (isSettled) {
              return;
            }

            isSettled = true;
            reject(new Error(this.getGraphqlWsErrorMessage(error)));
          },
          complete: () => {
            if (isSettled) {
              return;
            }

            reject(new Error('GraphQL operation completed without data.'));
          },
        },
      );
    });
  }

  // Turns graphql-ws transport errors into readable messages.
  private getGraphqlWsErrorMessage(error: unknown): string {
    if (Array.isArray(error) && error.length > 0) {
      const firstError = error[0] as { message?: string };
      if (firstError.message) {
        return firstError.message;
      }
    }

    return this.getErrorMessage(error);
  }

  // Turns unknown errors into a stable client message.
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to connect to the realtime stream.';
  }

  // Disposes the shared websocket client when nothing is using it.
  private closeGraphqlWsClient(): void {
    if (!this.graphqlWsClient) {
      return;
    }

    void this.graphqlWsClient.dispose();
    this.graphqlWsClient = null;
  }

  // Checks whether the stream still matches the active domain entry.
  private isActiveStream(stream: ActiveRealtimeStream): boolean {
    return this.activeTargets[stream.target.domain]?.streamId === stream.streamId;
  }
}
