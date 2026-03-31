import {
  HotspotsLayerSnapshot,
  JsonObject,
  PollingSubscriptionTarget,
} from '@org/models';
import { Injectable } from '@nestjs/common';
import { AbstractPollingDomainSource } from '../../core/polling/polling-domain-source.abstract';

@Injectable()
export class HotspotsDomainSourceService extends AbstractPollingDomainSource<
  'hotspots',
  HotspotsLayerSnapshot
> {
  readonly definition = {
    domain: 'hotspots' as const,
    pollIntervalMs: Number(process.env.HOTSPOTS_POLL_INTERVAL_MS ?? 1500),
  };

  private readonly baseUrl =
    process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';

  async fetch(
    target: PollingSubscriptionTarget<'hotspots'>,
  ): Promise<HotspotsLayerSnapshot> {
    return this.fetchJson<HotspotsLayerSnapshot>('/data/hotspots', target, {
      'x-parli-domain': 'hotspots',
    });
  }

  private async fetchJson<TSnapshot extends JsonObject>(
    path: string,
    target: PollingSubscriptionTarget<'hotspots'>,
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
