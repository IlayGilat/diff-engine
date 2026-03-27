import { OverviewSnapshot } from '@org/models';
import { createRealtimeDomainStore } from '../../../core/store/realtime-domain-store.factory';

export const overviewDomainStore = createRealtimeDomainStore<
  'overview',
  OverviewSnapshot
>({
  domain: 'overview',
  featureKey: 'overviewRealtime',
  displayName: 'Overview',
  description: 'KPI, queue, and regional health stream.',
  accentColor: '#1f6feb',
});
