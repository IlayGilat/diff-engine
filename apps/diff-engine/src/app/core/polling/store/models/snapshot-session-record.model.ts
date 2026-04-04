import {
  JsonObject,
  PollingSubscriptionTarget,
  SnapshotSessionRecord,
  buildSourceKey,
} from '@org/models';

export function createSnapshotSessionRecord<
  TSnapshot extends JsonObject,
  TDomain extends string,
>(
  sessionKey: string,
  streamId: string,
  target: PollingSubscriptionTarget<TDomain>,
  snapshot: TSnapshot,
  snapshotHash: string,
): SnapshotSessionRecord<TSnapshot, TDomain> {
  return {
    sessionKey,
    streamId,
    sourceKey: buildSourceKey(target),
    target,
    version: 1,
    snapshotHash,
    lastSnapshot: snapshot,
  };
}
