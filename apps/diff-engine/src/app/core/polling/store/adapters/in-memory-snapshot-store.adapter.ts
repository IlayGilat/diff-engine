import { Dictionary, JsonObject, SnapshotSessionRecord, SnapshotStoreAdapter } from '@org/models';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemorySnapshotStoreAdapter implements SnapshotStoreAdapter {
  private readonly records: Dictionary<SnapshotSessionRecord> = {};

  set<TSnapshot extends JsonObject>(
    record: SnapshotSessionRecord<TSnapshot>,
  ): SnapshotSessionRecord<TSnapshot> {
    this.records[record.sessionKey] = record;
    return record;
  }

  get<TSnapshot extends JsonObject>(
    sessionKey: string,
  ): SnapshotSessionRecord<TSnapshot> | undefined {
    return this.records[sessionKey] as
      | SnapshotSessionRecord<TSnapshot>
      | undefined;
  }

  delete(sessionKey: string): void {
    delete this.records[sessionKey];
  }

  listByStreamId<TSnapshot extends JsonObject>(
    streamId: string,
  ): Array<SnapshotSessionRecord<TSnapshot>> {
    return Object.values(this.records).filter(
      (record) => record.streamId === streamId,
    ) as Array<SnapshotSessionRecord<TSnapshot>>;
  }
}
