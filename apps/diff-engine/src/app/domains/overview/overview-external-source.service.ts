import { Injectable } from '@nestjs/common';
import { OverviewSnapshot } from '@org/models';
import { AbstractExternalPollingDomainSource } from '../../core/polling/external-polling-domain-source.abstract';

@Injectable()
export class OverviewExternalSourceService extends AbstractExternalPollingDomainSource<
  'overview',
  OverviewSnapshot
> {
  readonly definition = {
    domain: 'overview' as const,
    endpointPath: '/data/overview',
    pollIntervalMs: Number(process.env.OVERVIEW_POLL_INTERVAL_MS ?? 2000),
    staticHeaders: {
      'x-parli-domain': 'overview',
    },
  };
}
