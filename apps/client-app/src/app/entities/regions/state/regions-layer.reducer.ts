import { RealtimeFeatureKey, RegionsLayerSnapshot } from '@org/models';
import { AbstractRealtimeEntityReducer } from '../../../core/realtime/reducers/abstract-realtime-entity-reducer';

class RegionsLayerReducer extends AbstractRealtimeEntityReducer<
  'regions',
  RegionsLayerSnapshot
> {
  constructor() {
    super('regions', RealtimeFeatureKey.RegionsLayer);
  }
}

const regionsLayerState = new RegionsLayerReducer();

export const regionsLayerReducer = regionsLayerState.reducer;
export const regionsLayerSelectors = regionsLayerState.selectors;
