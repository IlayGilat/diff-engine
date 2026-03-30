import { Injectable } from '@nestjs/common';
import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { ActivityDomainSourceService } from '../../domains/activity/activity-domain-source.service';
import { OverviewDomainSourceService } from '../../domains/overview/overview-domain-source.service';
import { AbstractPollingDomainSource } from './polling-domain-source.abstract';

@Injectable()
export class PollingDomainRegistryService {
  private readonly sources: Array<AbstractPollingDomainSource<string, JsonObject>>;

  constructor(
    overviewDomainSourceService: OverviewDomainSourceService,
    activityDomainSourceService: ActivityDomainSourceService,
  ) {
    this.sources = [
      overviewDomainSourceService,
      activityDomainSourceService,
    ];
  }

  resolve<TDomain extends string>(
    target: PollingSubscriptionTarget<TDomain>,
  ): AbstractPollingDomainSource<TDomain, JsonObject> {
    const source = this.sources.find((candidate) => candidate.supports(target));
    if (!source) {
      throw new Error('Unsupported polling domain "' + target.domain + '".');
    }

    return source as AbstractPollingDomainSource<TDomain, JsonObject>;
  }
}
