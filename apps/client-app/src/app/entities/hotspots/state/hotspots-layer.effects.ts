import { Injectable } from '@angular/core';
import { HotspotsLayerSnapshot, RealtimeFeatureKey } from '@org/models';
import { AbstractRealtimeEntityEffects } from '../../../core/realtime/effects/abstract-realtime-entity.effects';

@Injectable()
export class HotspotsLayerEffects extends AbstractRealtimeEntityEffects<
  'hotspots',
  HotspotsLayerSnapshot
> {
  constructor() {
    super('hotspots', RealtimeFeatureKey.HotspotsLayer);
  }
}
