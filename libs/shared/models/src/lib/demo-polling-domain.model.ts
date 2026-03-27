export const DEMO_POLLING_DOMAINS = ['overview', 'activity'] as const;

export type DemoPollingDomain = (typeof DEMO_POLLING_DOMAINS)[number];

export function isDemoPollingDomain(
  value: string,
): value is DemoPollingDomain {
  return DEMO_POLLING_DOMAINS.indexOf(value as DemoPollingDomain) > -1;
}
