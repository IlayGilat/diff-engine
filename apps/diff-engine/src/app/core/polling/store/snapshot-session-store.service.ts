import { Injectable } from '@nestjs/common';
import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { SnapshotStoreAdapter } from './adapters/snapshot-store.adapter';
import { SnapshotStoreAdapterBuilder } from './builders/snapshot-store-adapter.builder';
import {
  SnapshotSessionRecord,
  createSnapshotSessionRecord,
} from './snapshot-session-record.model';

@Injectable()
export class SnapshotSessionStoreService {
  private readonly snapshotStoreAdapter: SnapshotStoreAdapter;

  constructor(snapshotStoreAdapterBuilder: SnapshotStoreAdapterBuilder) {
    this.snapshotStoreAdapter = snapshotStoreAdapterBuilder.build();
  }

  create<TSnapshot extends JsonObject, TDomain extends string>(
    sessionKey: string,
    streamId: string,
    target: PollingSubscriptionTarget<TDomain>,
    snapshot: TSnapshot,
  ): SnapshotSessionRecord<TSnapshot, TDomain> {
    return this.snapshotStoreAdapter.set(
      createSnapshotSessionRecord(sessionKey, streamId, target, snapshot),
    ) as SnapshotSessionRecord<TSnapshot, TDomain>;
  }

  get<TSnapshot extends JsonObject>(
    sessionKey: string,
  ): SnapshotSessionRecord<TSnapshot> | undefined {
    return this.snapshotStoreAdapter.get(sessionKey);
  }

  listByStreamId<TSnapshot extends JsonObject>(
    streamId: string,
  ): Array<SnapshotSessionRecord<TSnapshot>> {
    return this.snapshotStoreAdapter.listByStreamId(streamId);
  }

  updateSnapshot<TSnapshot extends JsonObject>(
    sessionKey: string,
    snapshot: TSnapshot,
  ): SnapshotSessionRecord<TSnapshot> | undefined {
    const existingRecord = this.snapshotStoreAdapter.get<TSnapshot>(sessionKey);
    if (!existingRecord) {
      return undefined;
    }

    existingRecord.version += 1;
    existingRecord.lastSnapshot = snapshot;
    return this.snapshotStoreAdapter.set(existingRecord);
  }

  delete(sessionKey: string): void {
    this.snapshotStoreAdapter.delete(sessionKey);
  }
}
