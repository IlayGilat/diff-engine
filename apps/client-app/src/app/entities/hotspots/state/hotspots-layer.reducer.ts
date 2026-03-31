import { HotspotsLayerSnapshot } from '@org/models';
import { AbstractRealtimeEntityReducer } from '../../../core/realtime/reducers/abstract-realtime-entity-reducer';
import { RealtimeFeatureKey } from '@org/models';

class HotspotsLayerReducer extends AbstractRealtimeEntityReducer<
  'hotspots',
  HotspotsLayerSnapshot
> {
  constructor() {
    super('hotspots', RealtimeFeatureKey.HotspotsLayer);
  }
}

const hotspotsLayerState = new HotspotsLayerReducer();

export const hotspotsLayerReducer = hotspotsLayerState.reducer;
export const hotspotsLayerSelectors = hotspotsLayerState.selectors;
