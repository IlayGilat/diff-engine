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
  private readonly baseUrl = process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';

  constructor() {
    super({
      domain: 'hotspots',
      pollIntervalMs: Number(process.env.HOTSPOTS_POLL_INTERVAL_MS ?? 1500),
    });
  }

  async fetch(
    target: PollingSubscriptionTarget<'hotspots'>,
  ): Promise<HotspotsLayerSnapshot> {
    const response = await fetch(this.buildRequestUrl(target), {
      headers: {
        'x-parli-domain': this.definition.domain,
      },
    });

    if (!response.ok) {
      throw new Error(
        'External API returned status ' +
          response.status +
          ' for domain "' +
          this.definition.domain +
          '".',
      );
    }

    return this.mapResponse(
      (await response.json()) as HotspotsLayerSnapshot,
    );
  }

  private buildRequestUrl(
    target: PollingSubscriptionTarget<'hotspots'>,
  ): string {
    const params = new URLSearchParams({
      email: target.email,
    });

    return this.baseUrl + '/data/hotspots?' + params.toString();
  }

  private mapResponse(snapshot: HotspotsLayerSnapshot): HotspotsLayerSnapshot {
    return snapshot;
  }
}
