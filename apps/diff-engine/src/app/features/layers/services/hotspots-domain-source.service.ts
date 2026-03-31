import {
  HotspotsLayerSnapshot,
  PollingSubscriptionTarget,
} from '@org/models';
import { Injectable } from '@nestjs/common';
import { AbstractPollingDomainSource } from '../../../core/polling/abstractions/polling-domain-source.abstract';

@Injectable()
export class HotspotsDomainSourceService extends AbstractPollingDomainSource<
  'hotspots',
  HotspotsLayerSnapshot
> {
  constructor() {
    super({
      domain: 'hotspots',
      pollIntervalMs: Number(process.env.HOTSPOTS_POLL_INTERVAL_MS ?? 1500),
      baseUrl: process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334',
      path: '/data/hotspots',
      headers: {
        'x-parli-domain': 'hotspots',
      },
    });
  }

  async fetch(
    target: PollingSubscriptionTarget<'hotspots'>,
  ): Promise<HotspotsLayerSnapshot> {
    return this.fetchJson(target);
  }
}
