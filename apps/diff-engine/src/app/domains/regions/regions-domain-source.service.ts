import {
  JsonObject,
  PollingSubscriptionTarget,
  RegionsLayerSnapshot,
} from '@org/models';
import { Injectable } from '@nestjs/common';
import { AbstractPollingDomainSource } from '../../core/polling/polling-domain-source.abstract';

@Injectable()
export class RegionsDomainSourceService extends AbstractPollingDomainSource<
  'regions',
  RegionsLayerSnapshot
> {
  readonly definition = {
    domain: 'regions' as const,
    pollIntervalMs: Number(process.env.REGIONS_POLL_INTERVAL_MS ?? 2000),
  };

  private readonly baseUrl =
    process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';

  async fetch(
    target: PollingSubscriptionTarget<'regions'>,
  ): Promise<RegionsLayerSnapshot> {
    return this.fetchJson<RegionsLayerSnapshot>('/data/regions', target, {
      'x-parli-domain': 'regions',
    });
  }

  private async fetchJson<TSnapshot extends JsonObject>(
    path: string,
    target: PollingSubscriptionTarget<'regions'>,
    headers: Record<string, string> = {},
  ): Promise<TSnapshot> {
    const params = new URLSearchParams({
      email: target.email,
    });
    const response = await fetch(this.baseUrl + path + '?' + params.toString(), {
      headers,
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

    return (await response.json()) as TSnapshot;
  }
}
