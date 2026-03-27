import { JsonObject } from '../json-value.model';

export interface ActivityMeta extends JsonObject {
  ownerEmail: string;
  domain: 'activity';
  generatedAt: string;
  lastUpdated: string;
  requestCount: number;
}

export interface ActivityStreamSnapshot extends JsonObject {
  eventsPerMinute: number;
  activeWorkers: number;
  patchBurst: number;
  averageResponseMs: number;
}

export interface ActivityWorkerSnapshot extends JsonObject {
  id: string;
  label: string;
  online: boolean;
  utilization: number;
  tasksInFlight: number;
}

export interface ActivityChannelSnapshot extends JsonObject {
  id: string;
  label: string;
  ratePerMinute: number;
  successRate: number;
  backlog: number;
}

export interface ActivityEventSnapshot extends JsonObject {
  id: string;
  at: string;
  channel: string;
  type: 'SYNC' | 'IMPORT' | 'ALERT' | 'CHECKPOINT';
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface ActivitySnapshot extends JsonObject {
  meta: ActivityMeta;
  stream: ActivityStreamSnapshot;
  workers: ActivityWorkerSnapshot[];
  channels: ActivityChannelSnapshot[];
  events: ActivityEventSnapshot[];
}
