import { Injectable } from '@angular/core';
import { ActivitySnapshot } from '@org/models';
import { Store } from '@ngrx/store';
import { AbstractRealtimeDomainFacade } from '../../../core/store/abstract-realtime-domain.facade';
import { activityDomainStore } from './activity-domain.store';

@Injectable({
  providedIn: 'root',
})
export class ActivityDomainFacade extends AbstractRealtimeDomainFacade<
  'activity',
  ActivitySnapshot
> {
  constructor(store: Store) {
    super(store, activityDomainStore);
  }
}
