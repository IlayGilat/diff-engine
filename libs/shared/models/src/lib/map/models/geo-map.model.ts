import { JsonObject } from '../../common/models/json-value.model';

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
