import { Injectable } from '@nestjs/common';
import { JsonObject } from '@org/models';
import { SnapshotSessionRecord } from '../snapshot-session-record.model';
import { SnapshotStoreAdapter } from './snapshot-store.adapter';

@Injectable()
export class InMemorySnapshotStoreAdapter implements SnapshotStoreAdapter {
  private readonly records = new Map<string, SnapshotSessionRecord>();

  set<TSnapshot extends JsonObject>(
    record: SnapshotSessionRecord<TSnapshot>,
  ): SnapshotSessionRecord<TSnapshot> {
    this.records.set(record.sessionKey, record);
    return record;
  }

  get<TSnapshot extends JsonObject>(
    sessionKey: string,
  ): SnapshotSessionRecord<TSnapshot> | undefined {
    return this.records.get(sessionKey) as
      | SnapshotSessionRecord<TSnapshot>
      | undefined;
  }

  delete(sessionKey: string): void {
    this.records.delete(sessionKey);
  }

  listBySocket<TSnapshot extends JsonObject>(
    socketId: string,
  ): Array<SnapshotSessionRecord<TSnapshot>> {
    return Array.from(this.records.values()).filter(
      (record) => record.socketId === socketId,
    ) as Array<SnapshotSessionRecord<TSnapshot>>;
  }
}
