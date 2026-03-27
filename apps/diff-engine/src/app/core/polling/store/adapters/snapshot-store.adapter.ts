import { JsonObject } from '@org/models';
import { SnapshotSessionRecord } from '../snapshot-session-record.model';

export interface SnapshotStoreAdapter {
  set<TSnapshot extends JsonObject>(
    record: SnapshotSessionRecord<TSnapshot>,
  ): SnapshotSessionRecord<TSnapshot>;
  get<TSnapshot extends JsonObject>(
    sessionKey: string,
  ): SnapshotSessionRecord<TSnapshot> | undefined;
  delete(sessionKey: string): void;
  listBySocket<TSnapshot extends JsonObject>(
    socketId: string,
  ): Array<SnapshotSessionRecord<TSnapshot>>;
}
