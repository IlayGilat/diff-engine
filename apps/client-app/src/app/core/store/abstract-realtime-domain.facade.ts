import { JsonObject } from '@org/models';
import { Action, Store } from '@ngrx/store';
import { RealtimeDomainStoreBundle } from './realtime-domain-store.factory';

export abstract class AbstractRealtimeDomainFacade<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  readonly state$;
  readonly session$;
  readonly snapshot$;
  readonly patchLog$;

  protected constructor(
    protected readonly store: Store,
    protected readonly storeBundle: RealtimeDomainStoreBundle<TDomain, TSnapshot>,
  ) {
    this.state$ = this.store.select(storeBundle.selectors.selectFeatureState);
    this.session$ = this.store.select(storeBundle.selectors.selectSession);
    this.snapshot$ = this.store.select(storeBundle.selectors.selectSnapshot);
    this.patchLog$ = this.store.select(storeBundle.selectors.selectPatchLog);
  }

  get definition() {
    return this.storeBundle.definition;
  }

  connect(email: string): void {
    this.store.dispatch(
      this.storeBundle.actions.connectRequested({ email }) as Action,
    );
  }

  disconnect(): void {
    this.store.dispatch(
      this.storeBundle.actions.disconnectRequested() as Action,
    );
  }
}
