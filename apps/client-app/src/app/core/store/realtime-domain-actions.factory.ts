import {
  JsonObject,
  PollingPatchEnvelope,
  PollingSnapshotEnvelope,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
} from '@org/models';
import { ActionCreator, createAction, props } from '@ngrx/store';

export interface RealtimeDomainActionGroup<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  connectRequested: ActionCreator<
    string,
    (props: { email: string }) => { email: string } & { type: string }
  >;
  disconnectRequested: ActionCreator<string, () => { type: string }>;
  reconnecting: ActionCreator<
    string,
    (props: {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }) => {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    } & { type: string }
  >;
  connected: ActionCreator<
    string,
    (props: {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }) => {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    } & { type: string }
  >;
  disconnected: ActionCreator<
    string,
    (props: {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }) => {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    } & { type: string }
  >;
  snapshotReceived: ActionCreator<
    string,
    (props: {
      envelope: PollingSnapshotEnvelope<TSnapshot, TDomain>;
    }) => {
      envelope: PollingSnapshotEnvelope<TSnapshot, TDomain>;
    } & { type: string }
  >;
  patchReceived: ActionCreator<
    string,
    (props: { envelope: PollingPatchEnvelope<TDomain> }) => {
      envelope: PollingPatchEnvelope<TDomain>;
    } & { type: string }
  >;
  streamErrorReceived: ActionCreator<
    string,
    (props: { envelope: PollingStreamErrorEnvelope<TDomain> }) => {
      envelope: PollingStreamErrorEnvelope<TDomain>;
    } & { type: string }
  >;
}

export function createRealtimeDomainActions<
  TDomain extends string,
  TSnapshot extends JsonObject,
>(featureKey: string): RealtimeDomainActionGroup<TDomain, TSnapshot> {
  return {
    connectRequested: createAction(
      '[' + featureKey + '] Connect Requested',
      props<{ email: string }>(),
    ),
    disconnectRequested: createAction(
      '[' + featureKey + '] Disconnect Requested',
    ),
    reconnecting: createAction(
      '[' + featureKey + '] Reconnecting',
      props<{
        sourceKey: string;
        target: PollingSubscriptionTarget<TDomain>;
        receivedAt: string;
      }>(),
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
