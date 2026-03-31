import type { ActionCreator, MemoizedSelector } from '@ngrx/store';
import { JsonObject } from '../../common/models/json-value.model';
import {
  PollingConnectionState,
  PollingPatchEnvelope,
  PollingSessionViewState,
  PollingSnapshotEnvelope,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
} from './realtime-polling.model';

export enum RealtimeFeatureKey {
  RegionsLayer = 'regionsLayer',
  HotspotsLayer = 'hotspotsLayer',
}

export interface DomainPatchLogEntry {
  version: number;
  receivedAt: string;
  kind: 'snapshot' | 'patch' | 'error';
  operationCount: number;
  message: string | null;
  paths: string[];
}

export interface RealtimeDomainDefinition<TDomain extends string = string> {
  domain: TDomain;
  featureKey: RealtimeFeatureKey;
  initialConnectionState?: PollingConnectionState;
}

export interface RealtimeDomainFeatureState<
  TSnapshot extends JsonObject = JsonObject,
  TDomain extends string = string,
> {
  session: PollingSessionViewState<TSnapshot, TDomain>;
  patchLog: DomainPatchLogEntry[];
}

export interface RealtimeDomainActionGroup<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  connectRequested: ActionCreator<
    string,
    (props: { email: string }) => { email: string } & { type: string }
  >;
  disconnectRequested: ActionCreator<string, () => { type: string }>;
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

export interface RealtimeDomainSelectors<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  selectFeatureState: MemoizedSelector<
    object,
    RealtimeDomainFeatureState<TSnapshot, TDomain>
  >;
  selectSession: MemoizedSelector<
    object,
    PollingSessionViewState<TSnapshot, TDomain>
  >;
  selectSnapshot: MemoizedSelector<object, TSnapshot | null>;
  selectPatchLog: MemoizedSelector<object, DomainPatchLogEntry[]>;
}
