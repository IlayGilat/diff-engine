import { Injectable } from '@nestjs/common';
import { JsonObject, OverviewSnapshot, PollingSubscriptionTarget } from '@org/models';
import { AbstractPollingDomainSource } from '../../core/polling/polling-domain-source.abstract';

@Injectable()
export class OverviewDomainSourceService extends AbstractPollingDomainSource<
  'overview',
  OverviewSnapshot
> {
  readonly definition = {
    domain: 'overview' as const,
    pollIntervalMs: Number(process.env.OVERVIEW_POLL_INTERVAL_MS ?? 2000),
  };

  private readonly baseUrl =
    process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';

  async fetch(
    target: PollingSubscriptionTarget<'overview'>,
  ): Promise<OverviewSnapshot> {
    return this.fetchJson<OverviewSnapshot>('/data/overview', target, {
      'x-parli-domain': 'overview',
    });
  }

  private async fetchJson<TSnapshot extends JsonObject>(
    path: string,
    target: PollingSubscriptionTarget<'overview'>,
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
