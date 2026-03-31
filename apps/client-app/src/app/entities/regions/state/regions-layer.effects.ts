import { Injectable } from '@angular/core';
import { RealtimeFeatureKey, RegionsLayerSnapshot } from '@org/models';
import { AbstractRealtimeEntityEffects } from '../../../core/realtime/effects/abstract-realtime-entity.effects';

@Injectable()
export class RegionsLayerEffects extends AbstractRealtimeEntityEffects<
  'regions',
  RegionsLayerSnapshot
> {
  constructor() {
    super('regions', RealtimeFeatureKey.RegionsLayer);
  }
}
