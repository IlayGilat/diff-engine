import { ActivitySnapshot } from '@org/models';
import { createRealtimeDomainStore } from '../../../core/store/realtime-domain-store.factory';

export const activityDomainStore = createRealtimeDomainStore<
  'activity',
  ActivitySnapshot
>({
  domain: 'activity',
  featureKey: 'activityRealtime',
  displayName: 'Activity',
  description: 'Worker, event, and channel activity stream.',
  accentColor: '#ef6c00',
});
