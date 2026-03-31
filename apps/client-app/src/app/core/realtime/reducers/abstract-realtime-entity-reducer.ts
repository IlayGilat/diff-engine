import {
  JsonObject,
  RealtimeDomainDefinition,
  RealtimeDomainFeatureState,
  RealtimeDomainSelectors,
  RealtimeFeatureKey,
} from '@org/models';
import { ActionReducer } from '@ngrx/store';
import { createRealtimeDomainActions } from '../factories/realtime-domain-actions.factory';
import { createRealtimeDomainDefinition } from '../factories/realtime-domain-definition.factory';
import {
  createRealtimeDomainReducer,
  createRealtimeDomainSelectors,
} from '../factories/realtime-domain-reducer.factory';

export abstract class AbstractRealtimeEntityReducer<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  readonly definition: RealtimeDomainDefinition<TDomain>;
  readonly reducer: ActionReducer<RealtimeDomainFeatureState<TSnapshot, TDomain>>;
  readonly selectors: RealtimeDomainSelectors<TDomain, TSnapshot>;

  protected constructor(domain: TDomain, featureKey: RealtimeFeatureKey) {
    this.definition = createRealtimeDomainDefinition(domain, featureKey);

    const actions = createRealtimeDomainActions<TDomain, TSnapshot>(featureKey);
    this.reducer = createRealtimeDomainReducer(this.definition, actions);
    this.selectors = createRealtimeDomainSelectors<TDomain, TSnapshot>(
      featureKey,
    );
  }
}
