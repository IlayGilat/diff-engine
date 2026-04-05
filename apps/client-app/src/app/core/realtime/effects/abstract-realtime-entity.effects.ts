import { inject } from '@angular/core';
import {
  JsonObject,
  RealtimeDomainActionGroup,
  RealtimeDomainClientEvent,
  RealtimeDomainDefinition,
  RealtimeFeatureKey,
} from '@org/models';
import {
  Actions,
  CreateEffectMetadata,
  createEffect,
  ofType,
} from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, map, mergeMap, takeUntil, tap } from 'rxjs';
import { GraphqlDomainStreamClientService } from '../clients/graphql-domain-stream.client';
import { createRealtimeDomainActions } from '../factories/realtime-domain-actions.factory';
import { createRealtimeDomainDefinition } from '../factories/realtime-domain-definition.factory';

export abstract class AbstractRealtimeEntityEffects<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  protected readonly actions$ = inject(Actions);
  protected readonly socketClient = inject(GraphqlDomainStreamClientService);
  protected readonly definition: RealtimeDomainDefinition<TDomain>;
  protected readonly entityActions: RealtimeDomainActionGroup<TDomain, TSnapshot>;
  readonly connect$: Observable<Action> & CreateEffectMetadata;
  readonly disconnect$: Observable<Action> & CreateEffectMetadata;

  protected constructor(domain: TDomain, featureKey: RealtimeFeatureKey) {
    this.definition = createRealtimeDomainDefinition(domain, featureKey);
    this.entityActions = createRealtimeDomainActions<TDomain, TSnapshot>(
      featureKey,
    );
    this.connect$ = this.createConnectEffect(
      this.definition.domain,
      this.entityActions,
    );
    this.disconnect$ = this.createDisconnectEffect(
      this.definition.domain,
      this.entityActions,
    );
  }

  // Opens the realtime stream when the domain connect action is dispatched.
  protected createConnectEffect(
    domain: TDomain,
    actions: RealtimeDomainActionGroup<TDomain, TSnapshot>,
  ): Observable<Action> & CreateEffectMetadata {
    return createEffect(() =>
      this.actions$.pipe(
        ofType(actions.connectRequested),
        mergeMap((action: { params: JsonObject }) =>
          this.socketClient
            .connect<TDomain, TSnapshot>({
              streamId: '',
              domain,
              params: action.params,
            })
            .pipe(
              map((event) => this.mapRealtimeEventToAction(actions, event)),
              takeUntil(this.actions$.pipe(ofType(actions.disconnectRequested))),
            ),
        ),
      ),
    );
  }

  // Closes the realtime stream when the domain disconnect action is dispatched.
  protected createDisconnectEffect(
    domain: TDomain,
    actions: RealtimeDomainActionGroup<TDomain, TSnapshot>,
  ): Observable<Action> & CreateEffectMetadata {
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

  // Maps shared realtime events into the domain-specific NgRx actions.
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
