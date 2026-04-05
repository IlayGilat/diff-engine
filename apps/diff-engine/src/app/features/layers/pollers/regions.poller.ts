import { Injectable } from '@nestjs/common';
import { JsonObject, RegionsLayerSnapshot } from '@org/models';
import { PollingDomainPoller } from '../../../core/polling/pollers/polling-domain-poller.model';

@Injectable()
export class RegionsPoller
  implements PollingDomainPoller<'regions', RegionsLayerSnapshot>
{
  readonly domain = 'regions';
  readonly pollIntervalMs = Number(process.env.REGIONS_POLL_INTERVAL_MS ?? 2_000);

  // Fetches the latest regions snapshot from the external API.
  async fetch(
    params: JsonObject,
    signal?: AbortSignal,
  ): Promise<RegionsLayerSnapshot> {
    const email = this.readEmail(params);
    const response = await fetch(this.buildUrl(email), {
      headers: {
        'x-parli-domain': 'regions',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(
        'External API returned status ' + response.status + ' for domain "regions".',
      );
    }

    return (await response.json()) as RegionsLayerSnapshot;
  }

  // Reads the params expected by the regions domain.
  private readEmail(params: JsonObject): string {
    const email = params['email'];
    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new Error('regions params.email is required.');
    }

    return email.trim().toLowerCase();
  }

  // Builds the regions endpoint URL for one request.
  private buildUrl(email: string): string {
    const baseUrl = process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';
    const searchParams = new URLSearchParams({
      email,
    });

    return baseUrl + '/data/regions?' + searchParams.toString();
  }
}
