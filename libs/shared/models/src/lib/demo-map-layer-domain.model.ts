export const DEMO_MAP_LAYER_DOMAINS = ['regions', 'hotspots'] as const;

export type DemoMapLayerDomain = (typeof DEMO_MAP_LAYER_DOMAINS)[number];

export function isDemoMapLayerDomain(
  value: string,
): value is DemoMapLayerDomain {
  return DEMO_MAP_LAYER_DOMAINS.indexOf(value as DemoMapLayerDomain) > -1;
}
