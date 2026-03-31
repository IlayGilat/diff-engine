import { HotspotsLayerEffects } from '../hotspots/state/hotspots-layer.effects';
import { hotspotsLayerDefinition } from '../hotspots/state/hotspots-layer.actions';
import { hotspotsLayerReducer } from '../hotspots/state/hotspots-layer.reducer';
import { RegionsLayerEffects } from '../regions/state/regions-layer.effects';
import { regionsLayerDefinition } from '../regions/state/regions-layer.actions';
import { regionsLayerReducer } from '../regions/state/regions-layer.reducer';

export const REALTIME_DOMAIN_REDUCERS = {
  [regionsLayerDefinition.featureKey]: regionsLayerReducer,
  [hotspotsLayerDefinition.featureKey]: hotspotsLayerReducer,
};

export const REALTIME_DOMAIN_EFFECTS = [
  RegionsLayerEffects,
  HotspotsLayerEffects,
];
