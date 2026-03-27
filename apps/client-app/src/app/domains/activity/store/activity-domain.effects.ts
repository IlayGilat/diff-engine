import { Injectable } from '@angular/core';
import { ActivitySnapshot } from '@org/models';
import { AbstractRealtimeDomainEffects } from '../../../core/store/abstract-realtime-domain.effects';
import { activityDomainStore } from './activity-domain.store';

@Injectable()
export class ActivityDomainEffects extends AbstractRealtimeDomainEffects<
  'activity',
  ActivitySnapshot
> {
  readonly connect$ = this.createConnectEffect(activityDomainStore);
  readonly disconnect$ = this.createDisconnectEffect(activityDomainStore);
}
