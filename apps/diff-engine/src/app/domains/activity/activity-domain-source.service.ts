import { Injectable } from '@nestjs/common';
import { ActivitySnapshot, JsonObject, PollingSubscriptionTarget } from '@org/models';
import { AbstractPollingDomainSource } from '../../core/polling/polling-domain-source.abstract';

@Injectable()
export class ActivityDomainSourceService extends AbstractPollingDomainSource<
  'activity',
  ActivitySnapshot
> {
  readonly definition = {
    domain: 'activity' as const,
    pollIntervalMs: Number(process.env.ACTIVITY_POLL_INTERVAL_MS ?? 1500),
  };

  private readonly baseUrl =
    process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';

  async fetch(
    target: PollingSubscriptionTarget<'activity'>,
  ): Promise<ActivitySnapshot> {
    return this.fetchJson<ActivitySnapshot>('/data/activity', target, {
      'x-parli-domain': 'activity',
    });
  }

  private async fetchJson<TSnapshot extends JsonObject>(
    path: string,
    target: PollingSubscriptionTarget<'activity'>,
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
