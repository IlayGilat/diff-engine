import { Injectable, inject } from '@angular/core';
import {
  JsonObject,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  RealtimeDomainClientEvent,
  buildSourceKey,
  normalizePollingTarget,
} from '@org/models';
import { Apollo, gql } from 'apollo-angular';
import { Observable, of } from 'rxjs';

function parseRealtimePayload<TValue>(payload: string): TValue {
  return JSON.parse(payload) as TValue;
}

const POLLING_EVENTS_SUBSCRIPTION = gql`
  subscription PollingEvents($domain: String!, $email: String!) {
    pollingEvents(domain: $domain, email: $email)
  }
`;

@Injectable({
  providedIn: 'root',
})
export class RealtimeSubscriptionClientService {
  private readonly apollo = inject(Apollo);

  connect<TDomain extends string, TSnapshot extends JsonObject>(
    target: PollingSubscriptionTarget<TDomain>,
  ): Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>> {
    const normalizedTarget = normalizePollingTarget(target);
    if (!normalizedTarget.domain || !normalizedTarget.email) {
      return of(
        this.createClientErrorEvent(normalizedTarget, 'Both domain and email are required.'),
      ) as Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>>;
    }

    return new Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>>((subscriber) => {
      let hasReceivedPayload = false;
      const graphqlSubscription = this.apollo
        .subscribe<{ pollingEvents: string }>({
          query: POLLING_EVENTS_SUBSCRIPTION,
          variables: {
            domain: normalizedTarget.domain,
            email: normalizedTarget.email,
          },
          fetchPolicy: 'no-cache',
          errorPolicy: 'all',
        })
        .subscribe({
          next: (result) => {
            if (result.error) {
              subscriber.next(
                this.createClientErrorEvent(
                  normalizedTarget,
                  result.error.message || 'GraphQL subscription failed.',
                ) as RealtimeDomainClientEvent<TSnapshot, TDomain>,
              );
            }

            const payload = result.data?.pollingEvents;
            if (!payload) {
              return;
            }

            if (!hasReceivedPayload) {
              hasReceivedPayload = true;
              subscriber.next({
                kind: 'connected',
                sourceKey: buildSourceKey(normalizedTarget),
                target: normalizedTarget,
                receivedAt: new Date().toISOString(),
              });
            }

            subscriber.next(
              parseRealtimePayload<RealtimeDomainClientEvent<JsonObject, string>>(
                payload,
              ) as RealtimeDomainClientEvent<TSnapshot, TDomain>,
            );
          },
          error: (error) => {
            subscriber.next(
              this.createClientErrorEvent(
                normalizedTarget,
                this.getSubscriptionErrorMessage(error),
              ) as RealtimeDomainClientEvent<TSnapshot, TDomain>,
            );
          },
          complete: () => {
            if (hasReceivedPayload) {
              subscriber.next({
                kind: 'disconnected',
                sourceKey: buildSourceKey(normalizedTarget),
                target: normalizedTarget,
                receivedAt: new Date().toISOString(),
              });
            }

            subscriber.complete();
          },
        });

      return () => {
        graphqlSubscription.unsubscribe();
      };
    });
  }

  private createClientErrorEvent(
    target: PollingSubscriptionTarget<string>,
    message: string,
  ): RealtimeDomainClientEvent<JsonObject, string> {
    const envelope: PollingStreamErrorEnvelope<string> = {
      sourceKey: buildSourceKey(target),
      target,
      phase: 'connect',
      receivedAt: new Date().toISOString(),
      message,
    };

    return {
      kind: 'error',
      envelope,
    };
  }

  private getSubscriptionErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to connect to the realtime GraphQL subscription.';
  }
}
