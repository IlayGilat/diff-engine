import { ActivityDomainEffects } from './activity/store/activity-domain.effects';
import { activityDomainStore } from './activity/store/activity-domain.store';
import { OverviewDomainEffects } from './overview/store/overview-domain.effects';
import { overviewDomainStore } from './overview/store/overview-domain.store';

export const REALTIME_DOMAIN_REDUCERS = {
  [overviewDomainStore.definition.featureKey]: overviewDomainStore.reducer,
  [activityDomainStore.definition.featureKey]: activityDomainStore.reducer,
};

export const REALTIME_DOMAIN_EFFECTS = [
  OverviewDomainEffects,
  ActivityDomainEffects,
];
