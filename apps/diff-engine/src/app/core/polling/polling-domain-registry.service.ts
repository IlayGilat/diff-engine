import { Injectable } from '@nestjs/common';
import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { HotspotsDomainSourceService } from '../../domains/hotspots/hotspots-domain-source.service';
import { RegionsDomainSourceService } from '../../domains/regions/regions-domain-source.service';
import { AbstractPollingDomainSource } from './polling-domain-source.abstract';
import {
  PollingOperationResult,
  pollingFail,
  pollingOk,
} from './polling-operation-result.model';

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
  ): PollingOperationResult<AbstractPollingDomainSource<TDomain, JsonObject>> {
    const source = this.sources.find((candidate) => candidate.supports(target));
    if (!source) {
      return pollingFail(
        'UNSUPPORTED_DOMAIN',
        'Unsupported polling domain "' + target.domain + '".',
        {
          domain: target.domain,
        },
      );
    }

    return pollingOk(
      source as AbstractPollingDomainSource<TDomain, JsonObject>,
      {
        domain: target.domain,
      },
    );
  }
}
