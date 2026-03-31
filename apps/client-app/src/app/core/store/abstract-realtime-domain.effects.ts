import { inject } from '@angular/core';
import { JsonObject, RealtimeDomainClientEvent } from '@org/models';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { map, mergeMap, takeUntil, tap } from 'rxjs';
import { GraphqlDomainStreamClientService } from '../socket/graphql-domain-stream.client';
import { RealtimeDomainActionGroup } from './realtime-domain-actions.factory';

export abstract class AbstractRealtimeDomainEffects<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  protected readonly actions$ = inject(Actions);
  protected readonly socketClient = inject(GraphqlDomainStreamClientService);

  protected createConnectEffect(
    domain: TDomain,
    actions: RealtimeDomainActionGroup<TDomain, TSnapshot>,
  ) {
    return createEffect(() =>
      this.actions$.pipe(
        ofType(actions.connectRequested),
        mergeMap((action: { email: string }) =>
          this.socketClient
            .connect<TDomain, TSnapshot>({
              domain,
              email: action.email,
            })
            .pipe(
              map((event) => this.mapRealtimeEventToAction(actions, event)),
              takeUntil(
                this.actions$.pipe(ofType(actions.disconnectRequested)),
              ),
            ),
        ),
      ),
    );
  }

  protected createDisconnectEffect(
    domain: TDomain,
    actions: RealtimeDomainActionGroup<TDomain, TSnapshot>,
  ) {
    return createEffect(
      () =>
        this.actions$.pipe(
          ofType(actions.disconnectRequested),
          tap(() => {
            this.socketClient.disconnect(domain);
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
