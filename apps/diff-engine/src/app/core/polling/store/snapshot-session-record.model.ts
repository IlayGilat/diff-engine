import { JsonObject, PollingSubscriptionTarget, buildSourceKey } from '@org/models';

export interface SnapshotSessionRecord<
  TSnapshot extends JsonObject = JsonObject,
  TDomain extends string = string,
> {
  sessionKey: string;
  streamId: string;
  sourceKey: string;
  target: PollingSubscriptionTarget<TDomain>;
  version: number;
  lastSnapshot: TSnapshot;
}

export function createSnapshotSessionRecord<
  TSnapshot extends JsonObject,
  TDomain extends string,
>(
  sessionKey: string,
  streamId: string,
  target: PollingSubscriptionTarget<TDomain>,
  snapshot: TSnapshot,
): SnapshotSessionRecord<TSnapshot, TDomain> {
  return {
    sessionKey,
    streamId,
    sourceKey: buildSourceKey(target),
    target,
    version: 1,
    lastSnapshot: snapshot,
  };
}
