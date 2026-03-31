import { HotspotsLayerEffects } from './hotspots/store/hotspots-layer.effects';
import { hotspotsLayerDefinition } from './hotspots/store/hotspots-layer.actions';
import { hotspotsLayerReducer } from './hotspots/store/hotspots-layer.reducer';
import { RegionsLayerEffects } from './regions/store/regions-layer.effects';
import { regionsLayerDefinition } from './regions/store/regions-layer.actions';
import { regionsLayerReducer } from './regions/store/regions-layer.reducer';

export const REALTIME_DOMAIN_REDUCERS = {
  [regionsLayerDefinition.featureKey]: regionsLayerReducer,
  [hotspotsLayerDefinition.featureKey]: hotspotsLayerReducer,
};

export const REALTIME_DOMAIN_EFFECTS = [
  RegionsLayerEffects,
  HotspotsLayerEffects,
];
