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
  private readonly baseUrl = process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';

  constructor() {
    super({
      domain: 'regions',
      pollIntervalMs: Number(process.env.REGIONS_POLL_INTERVAL_MS ?? 2000),
    });
  }

  async fetch(
    target: PollingSubscriptionTarget<'regions'>,
  ): Promise<RegionsLayerSnapshot> {
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
      (await response.json()) as RegionsLayerSnapshot,
    );
  }

  private buildRequestUrl(
    target: PollingSubscriptionTarget<'regions'>,
  ): string {
    const params = new URLSearchParams({
      email: target.email,
    });

    return this.baseUrl + '/data/regions?' + params.toString();
  }

  private mapResponse(snapshot: RegionsLayerSnapshot): RegionsLayerSnapshot {
    return snapshot;
  }
}
