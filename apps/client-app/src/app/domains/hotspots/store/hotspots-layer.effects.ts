import { Injectable } from '@angular/core';
import { HotspotsLayerSnapshot } from '@org/models';
import { AbstractRealtimeDomainEffects } from '../../../core/store/abstract-realtime-domain.effects';
import {
  hotspotsLayerActions,
  hotspotsLayerDefinition,
} from './hotspots-layer.actions';

@Injectable()
export class HotspotsLayerEffects extends AbstractRealtimeDomainEffects<
  'hotspots',
  HotspotsLayerSnapshot
> {
  readonly connect$ = this.createConnectEffect(
    hotspotsLayerDefinition.domain,
    hotspotsLayerActions,
  );

  readonly disconnect$ = this.createDisconnectEffect(
    hotspotsLayerDefinition.domain,
    hotspotsLayerActions,
  );
}
