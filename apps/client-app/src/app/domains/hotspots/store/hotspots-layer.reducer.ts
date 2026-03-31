import { HotspotsLayerSnapshot } from '@org/models';
import {
  createRealtimeDomainReducer,
  createRealtimeDomainSelectors,
} from '../../../core/store/realtime-domain-reducer.factory';
import {
  hotspotsLayerActions,
  hotspotsLayerDefinition,
} from './hotspots-layer.actions';

export const hotspotsLayerReducer = createRealtimeDomainReducer<
  'hotspots',
  HotspotsLayerSnapshot
>(hotspotsLayerDefinition, hotspotsLayerActions);

export const hotspotsLayerSelectors = createRealtimeDomainSelectors<
  'hotspots',
  HotspotsLayerSnapshot
>(hotspotsLayerDefinition.featureKey);
