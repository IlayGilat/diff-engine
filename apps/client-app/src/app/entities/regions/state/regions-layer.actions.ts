import { RegionsLayerSnapshot, RealtimeFeatureKey } from '@org/models';
import { AbstractRealtimeEntityActions } from '../../../core/realtime/actions/abstract-realtime-entity-actions';

class RegionsLayerActions extends AbstractRealtimeEntityActions<
  'regions',
  RegionsLayerSnapshot
> {
  constructor() {
    super('regions', RealtimeFeatureKey.RegionsLayer);
  }
}

export const regionsLayerActions = new RegionsLayerActions();
