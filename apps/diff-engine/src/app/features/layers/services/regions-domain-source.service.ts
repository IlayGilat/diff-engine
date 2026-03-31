import {
  PollingSubscriptionTarget,
  RegionsLayerSnapshot,
} from '@org/models';
import { Injectable } from '@nestjs/common';
import { AbstractPollingDomainSource } from '../../../core/polling/abstractions/polling-domain-source.abstract';

@Injectable()
export class RegionsDomainSourceService extends AbstractPollingDomainSource<
  'regions',
  RegionsLayerSnapshot
> {
  constructor() {
    super({
      domain: 'regions',
      pollIntervalMs: Number(process.env.REGIONS_POLL_INTERVAL_MS ?? 2000),
      baseUrl: process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334',
      path: '/data/regions',
      headers: {
        'x-parli-domain': 'regions',
      },
    });
  }

  async fetch(
    target: PollingSubscriptionTarget<'regions'>,
  ): Promise<RegionsLayerSnapshot> {
    return this.fetchJson(target);
  }
}
