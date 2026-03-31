import { RealtimeFeatureKey } from '@org/models';
import { HotspotsLayerEffects } from '../../../entities/hotspots/state/hotspots-layer.effects';
import { hotspotsLayerReducer } from '../../../entities/hotspots/state/hotspots-layer.reducer';
import { RegionsLayerEffects } from '../../../entities/regions/state/regions-layer.effects';
import { regionsLayerReducer } from '../../../entities/regions/state/regions-layer.reducer';

export const REALTIME_DOMAIN_REDUCERS = {
  [RealtimeFeatureKey.RegionsLayer]: regionsLayerReducer,
  [RealtimeFeatureKey.HotspotsLayer]: hotspotsLayerReducer,
};

export const REALTIME_DOMAIN_EFFECTS = [
  RegionsLayerEffects,
  HotspotsLayerEffects,
];
