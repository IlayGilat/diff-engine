import {
  JsonObject,
  PollingPatchEnvelope,
  PollingSnapshotEnvelope,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  RealtimeDomainActionGroup,
  RealtimeFeatureKey,
} from '@org/models';
import { createAction, props } from '@ngrx/store';

export function createRealtimeDomainActions<
  TDomain extends string,
  TSnapshot extends JsonObject,
>(
  featureKey: RealtimeFeatureKey,
): RealtimeDomainActionGroup<TDomain, TSnapshot> {
  return {
    connectRequested: createAction(
      '[' + featureKey + '] Connect Requested',
      props<{ email: string }>(),
    ),
    disconnectRequested: createAction(
      '[' + featureKey + '] Disconnect Requested',
    ),
    connected: createAction(
      '[' + featureKey + '] Connected',
      props<{
        sourceKey: string;
        target: PollingSubscriptionTarget<TDomain>;
        receivedAt: string;
      }>(),
    ),
    disconnected: createAction(
      '[' + featureKey + '] Disconnected',
      props<{
        sourceKey: string;
        target: PollingSubscriptionTarget<TDomain>;
        receivedAt: string;
      }>(),
    ),
    snapshotReceived: createAction(
      '[' + featureKey + '] Snapshot Received',
      props<{ envelope: PollingSnapshotEnvelope<TSnapshot, TDomain> }>(),
    ),
    patchReceived: createAction(
      '[' + featureKey + '] Patch Received',
      props<{ envelope: PollingPatchEnvelope<TDomain> }>(),
    ),
    streamErrorReceived: createAction(
      '[' + featureKey + '] Stream Error Received',
      props<{ envelope: PollingStreamErrorEnvelope<TDomain> }>(),
    ),
  };
}
