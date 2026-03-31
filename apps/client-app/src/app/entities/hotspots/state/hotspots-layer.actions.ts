import { HotspotsLayerSnapshot, RealtimeFeatureKey } from '@org/models';
import { AbstractRealtimeEntityActions } from '../../../core/realtime/actions/abstract-realtime-entity-actions';

class HotspotsLayerActions extends AbstractRealtimeEntityActions<
  'hotspots',
  HotspotsLayerSnapshot
> {
  constructor() {
    super('hotspots', RealtimeFeatureKey.HotspotsLayer);
  }
}

export const hotspotsLayerActions = new HotspotsLayerActions();
