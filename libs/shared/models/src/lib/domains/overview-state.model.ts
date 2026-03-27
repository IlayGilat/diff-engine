import { JsonObject } from '../json-value.model';

export interface OverviewMetricCard extends JsonObject {
  id: string;
  label: string;
  value: number;
  unit: string;
  delta: number;
  direction: 'up' | 'down';
}

export interface OverviewQueueSnapshot extends JsonObject {
  id: string;
  label: string;
  backlog: number;
  loadPercent: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface OverviewRegionSnapshot extends JsonObject {
  id: string;
  label: string;
  traffic: number;
  latencyMs: number;
  errorRate: number;
}

export interface OverviewHighlight extends JsonObject {
  headline: string;
  detail: string;
  tone: 'good' | 'warning' | 'critical';
}

export interface OverviewMeta extends JsonObject {
  ownerEmail: string;
  domain: 'overview';
  generatedAt: string;
  lastUpdated: string;
  requestCount: number;
}

export interface OverviewSnapshot extends JsonObject {
  meta: OverviewMeta;
  summary: {
    liveUsers: number;
    throughputPerMinute: number;
    errorRate: number;
    revenueImpact: number;
  };
  metrics: OverviewMetricCard[];
  queues: OverviewQueueSnapshot[];
  regions: OverviewRegionSnapshot[];
  highlights: OverviewHighlight[];
}
