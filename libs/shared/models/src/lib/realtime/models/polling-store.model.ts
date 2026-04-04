import type { Dictionary } from 'lodash';
import { JsonObject } from '../../common/models/json-value.model';
import { PollingSubscriptionTarget } from './realtime-polling.model';

export interface PollingRuntimeState {
  intervalId: ReturnType<typeof setInterval> | null;
  destroyTimeoutId: ReturnType<typeof setTimeout> | null;
  isPolling: boolean;
  lifecycle: 'active' | 'paused';
}

export interface SnapshotSessionRecord<
  TSnapshot extends JsonObject = JsonObject,
  TDomain extends string = string,
> {
  sessionKey: string;
  streamId: string;
  sourceKey: string;
  target: PollingSubscriptionTarget<TDomain>;
  version: number;
  snapshotHash: string;
  lastSnapshot: TSnapshot;
}

export interface SnapshotStoreAdapter {
  set<TSnapshot extends JsonObject>(
    record: SnapshotSessionRecord<TSnapshot>,
  ): SnapshotSessionRecord<TSnapshot>;
  get<TSnapshot extends JsonObject>(
    sessionKey: string,
  ): SnapshotSessionRecord<TSnapshot> | undefined;
  delete(sessionKey: string): void;
  listByStreamId<TSnapshot extends JsonObject>(
    streamId: string,
  ): Array<SnapshotSessionRecord<TSnapshot>>;
}

export type PollingRuntimeDictionary = Dictionary<PollingRuntimeState>;

export type SnapshotSessionDictionary = Dictionary<SnapshotSessionRecord>;
