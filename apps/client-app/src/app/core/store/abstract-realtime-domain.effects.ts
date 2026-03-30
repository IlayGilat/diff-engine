import { inject } from '@angular/core';
import { JsonObject, RealtimeDomainClientEvent } from '@org/models';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { map, mergeMap, takeUntil, tap } from 'rxjs';
import { GraphqlDomainStreamClientService } from '../socket/graphql-domain-stream.client';
import {
  RealtimeDomainActionGroup,
  RealtimeDomainStoreBundle,
} from './realtime-domain-store.factory';

export abstract class AbstractRealtimeDomainEffects<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  protected readonly actions$ = inject(Actions);
  protected readonly socketClient = inject(GraphqlDomainStreamClientService);

  protected createConnectEffect(
    storeBundle: RealtimeDomainStoreBundle<TDomain, TSnapshot>,
  ) {
    return createEffect(() =>
      this.actions$.pipe(
        ofType(storeBundle.actions.connectRequested),
        mergeMap((action: { email: string }) =>
          this.socketClient
            .connect<TDomain, TSnapshot>({
              domain: storeBundle.definition.domain,
              email: action.email,
            })
            .pipe(
              map((event) =>
                this.mapRealtimeEventToAction(storeBundle.actions, event),
              ),
              takeUntil(
                this.actions$.pipe(ofType(storeBundle.actions.disconnectRequested)),
              ),
            ),
        ),
      ),
    );
  }

  protected createDisconnectEffect(
    storeBundle: RealtimeDomainStoreBundle<TDomain, TSnapshot>,
  ) {
    return createEffect(
      () =>
        this.actions$.pipe(
          ofType(storeBundle.actions.disconnectRequested),
          tap(() => {
            this.socketClient.disconnect(storeBundle.definition.domain);
          }),
        ),
      { dispatch: false },
    );
  }

  private mapRealtimeEventToAction(
    actions: RealtimeDomainActionGroup<TDomain, TSnapshot>,
    event: RealtimeDomainClientEvent<TSnapshot, TDomain>,
  ): Action {
    switch (event.kind) {
      case 'connected':
        return actions.connected({
          sourceKey: event.sourceKey,
          target: event.target,
          receivedAt: event.receivedAt,
        }) as Action;
      case 'disconnected':
        return actions.disconnected({
          sourceKey: event.sourceKey,
          target: event.target,
          receivedAt: event.receivedAt,
        }) as Action;
      case 'snapshot':
        return actions.snapshotReceived({
          envelope: event.envelope,
        }) as Action;
      case 'patch':
        return actions.patchReceived({
          envelope: event.envelope,
        }) as Action;
      case 'error':
        return actions.streamErrorReceived({
          envelope: event.envelope,
        }) as Action;
    }

    throw new Error('Unsupported realtime event kind.');
  }
}
