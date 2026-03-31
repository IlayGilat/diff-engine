import { HotspotsLayerSnapshot } from '@org/models';
import { createRealtimeDomainActions } from '../../../../core/realtime/factories/realtime-domain-actions.factory';
import { RealtimeDomainDefinition } from '../../../../core/realtime/models/realtime-domain-state.model';

export const hotspotsLayerDefinition: RealtimeDomainDefinition<
  'hotspots',
  HotspotsLayerSnapshot
> = {
  domain: 'hotspots',
  featureKey: 'hotspotsLayer',
  displayName: 'Hotspots',
  description: 'Circular alerts that expand, contract, and relocate over time.',
  accentColor: '#c2410c',
};

export const hotspotsLayerActions = createRealtimeDomainActions<
  'hotspots',
  HotspotsLayerSnapshot
>(hotspotsLayerDefinition.featureKey);
