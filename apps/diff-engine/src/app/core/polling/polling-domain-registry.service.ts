import { Injectable } from '@nestjs/common';
import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { HotspotsDomainSourceService } from '../../domains/hotspots/hotspots-domain-source.service';
import { RegionsDomainSourceService } from '../../domains/regions/regions-domain-source.service';
import { AbstractPollingDomainSource } from './polling-domain-source.abstract';

@Injectable()
export class PollingDomainRegistryService {
  private readonly sources: Array<AbstractPollingDomainSource<string, JsonObject>>;

  constructor(
    regionsDomainSourceService: RegionsDomainSourceService,
    hotspotsDomainSourceService: HotspotsDomainSourceService,
  ) {
    this.sources = [
      regionsDomainSourceService,
      hotspotsDomainSourceService,
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
