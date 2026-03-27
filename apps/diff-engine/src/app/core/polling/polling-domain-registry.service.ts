import { Injectable } from '@nestjs/common';
import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { ActivityExternalSourceService } from '../../domains/activity/activity-external-source.service';
import { OverviewExternalSourceService } from '../../domains/overview/overview-external-source.service';
import { AbstractPollingDomainSource } from './polling-domain-source.abstract';

@Injectable()
export class PollingDomainRegistryService {
  private readonly sources: Array<AbstractPollingDomainSource<string, JsonObject>>;

  constructor(
    overviewExternalSourceService: OverviewExternalSourceService,
    activityExternalSourceService: ActivityExternalSourceService,
  ) {
    this.sources = [
      overviewExternalSourceService,
      activityExternalSourceService,
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
