import { JsonObject } from './json-value.model';

export const DEMO_MAP_WORLD_BOUNDS = {
  minX: 0,
  minY: 0,
  maxX: 100,
  maxY: 100,
} as const;

export const DEMO_MAP_GRID_STEP = 20;

export type GeoFeatureStatus = 'stable' | 'watch' | 'critical';

export interface LayerMeta<TDomain extends string = string> extends JsonObject {
  ownerEmail: string;
  domain: TDomain;
  generatedAt: string;
  lastUpdated: string;
  requestCount: number;
}

export interface GeoPoint extends JsonObject {
  x: number;
  y: number;
}

export interface GeoPolygonFeature extends JsonObject {
  id: string;
  label: string;
  status: GeoFeatureStatus;
  fill: string;
  stroke: string;
  intensity: number;
  points: GeoPoint[];
}

export interface GeoCircleFeature extends JsonObject {
  id: string;
  label: string;
  status: GeoFeatureStatus;
  color: string;
  intensity: number;
  radius: number;
  center: GeoPoint;
}
