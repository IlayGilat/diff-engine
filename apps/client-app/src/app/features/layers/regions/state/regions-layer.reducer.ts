import { RegionsLayerSnapshot } from '@org/models';
import {
  createRealtimeDomainReducer,
  createRealtimeDomainSelectors,
} from '../../../../core/realtime/factories/realtime-domain-reducer.factory';
import { regionsLayerActions, regionsLayerDefinition } from './regions-layer.actions';

export const regionsLayerReducer = createRealtimeDomainReducer<
  'regions',
  RegionsLayerSnapshot
>(regionsLayerDefinition, regionsLayerActions);

export const regionsLayerSelectors = createRealtimeDomainSelectors<
  'regions',
  RegionsLayerSnapshot
>(regionsLayerDefinition.featureKey);
