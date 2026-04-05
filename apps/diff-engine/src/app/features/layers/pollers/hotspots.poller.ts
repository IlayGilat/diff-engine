import { Injectable } from '@nestjs/common';
import { HotspotsLayerSnapshot, JsonObject } from '@org/models';
import { PollingDomainPoller } from '../../../core/polling/pollers/polling-domain-poller.model';

@Injectable()
export class HotspotsPoller
  implements PollingDomainPoller<'hotspots', HotspotsLayerSnapshot>
{
  readonly domain = 'hotspots';
  readonly pollIntervalMs = Number(process.env.HOTSPOTS_POLL_INTERVAL_MS ?? 1_500);

  // Fetches the latest hotspots snapshot from the external API.
  async fetch(
    params: JsonObject,
    signal?: AbortSignal,
  ): Promise<HotspotsLayerSnapshot> {
    const email = this.readEmail(params);
    const response = await fetch(this.buildUrl(email), {
      headers: {
        'x-parli-domain': 'hotspots',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(
        'External API returned status ' + response.status + ' for domain "hotspots".',
      );
    }

    return (await response.json()) as HotspotsLayerSnapshot;
  }

  // Reads the params expected by the hotspots domain.
  private readEmail(params: JsonObject): string {
    const email = params['email'];
    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new Error('hotspots params.email is required.');
    }

    return email.trim().toLowerCase();
  }

  // Builds the hotspots endpoint URL for one request.
  private buildUrl(email: string): string {
    const baseUrl = process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';
    const searchParams = new URLSearchParams({
      email,
    });

    return baseUrl + '/data/hotspots?' + searchParams.toString();
  }
}
