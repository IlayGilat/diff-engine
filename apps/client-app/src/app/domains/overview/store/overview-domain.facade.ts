import { Injectable } from '@angular/core';
import { OverviewSnapshot } from '@org/models';
import { Store } from '@ngrx/store';
import { AbstractRealtimeDomainFacade } from '../../../core/store/abstract-realtime-domain.facade';
import { overviewDomainStore } from './overview-domain.store';

@Injectable({
  providedIn: 'root',
})
export class OverviewDomainFacade extends AbstractRealtimeDomainFacade<
  'overview',
  OverviewSnapshot
> {
  constructor(store: Store) {
    super(store, overviewDomainStore);
  }
}
