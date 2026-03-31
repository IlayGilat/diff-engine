import { Injectable } from '@angular/core';
import { RegionsLayerSnapshot } from '@org/models';
import { AbstractRealtimeDomainEffects } from '../../../core/store/abstract-realtime-domain.effects';
import { regionsLayerActions, regionsLayerDefinition } from './regions-layer.actions';

@Injectable()
export class RegionsLayerEffects extends AbstractRealtimeDomainEffects<
  'regions',
  RegionsLayerSnapshot
> {
  readonly connect$ = this.createConnectEffect(
    regionsLayerDefinition.domain,
    regionsLayerActions,
  );

  readonly disconnect$ = this.createDisconnectEffect(
    regionsLayerDefinition.domain,
    regionsLayerActions,
  );
}
