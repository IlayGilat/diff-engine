import { Injectable } from '@nestjs/common';
import { ActivitySnapshot } from '@org/models';
import { AbstractExternalPollingDomainSource } from '../../core/polling/external-polling-domain-source.abstract';

@Injectable()
export class ActivityExternalSourceService extends AbstractExternalPollingDomainSource<
  'activity',
  ActivitySnapshot
> {
  readonly definition = {
    domain: 'activity' as const,
    endpointPath: '/data/activity',
    pollIntervalMs: Number(process.env.ACTIVITY_POLL_INTERVAL_MS ?? 1500),
    staticHeaders: {
      'x-parli-domain': 'activity',
    },
  };
}
