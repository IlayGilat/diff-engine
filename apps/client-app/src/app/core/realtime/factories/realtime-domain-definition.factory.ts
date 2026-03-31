import { RealtimeDomainDefinition, RealtimeFeatureKey } from '@org/models';

export function createRealtimeDomainDefinition<TDomain extends string>(
  domain: TDomain,
  featureKey: RealtimeFeatureKey,
): RealtimeDomainDefinition<TDomain> {
  return {
    domain,
    featureKey,
  };
}
