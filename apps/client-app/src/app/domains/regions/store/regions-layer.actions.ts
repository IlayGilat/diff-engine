import { RegionsLayerSnapshot } from '@org/models';
import { createRealtimeDomainActions } from '../../../core/store/realtime-domain-actions.factory';
import { RealtimeDomainDefinition } from '../../../core/store/realtime-domain-state.model';

export const regionsLayerDefinition: RealtimeDomainDefinition<
  'regions',
  RegionsLayerSnapshot
> = {
  domain: 'regions',
  featureKey: 'regionsLayer',
  displayName: 'Regions',
  description: 'Territory polygons that pulse as area intensity changes.',
  accentColor: '#0f766e',
};

export const regionsLayerActions = createRealtimeDomainActions<
  'regions',
  RegionsLayerSnapshot
>(regionsLayerDefinition.featureKey);
