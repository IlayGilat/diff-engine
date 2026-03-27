import { Injectable } from '@angular/core';
import { OverviewSnapshot } from '@org/models';
import { AbstractRealtimeDomainEffects } from '../../../core/store/abstract-realtime-domain.effects';
import { overviewDomainStore } from './overview-domain.store';

@Injectable()
export class OverviewDomainEffects extends AbstractRealtimeDomainEffects<
  'overview',
  OverviewSnapshot
> {
  readonly connect$ = this.createConnectEffect(overviewDomainStore);
  readonly disconnect$ = this.createDisconnectEffect(overviewDomainStore);
}
