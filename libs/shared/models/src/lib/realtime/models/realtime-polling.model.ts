import { Operation } from 'fast-json-patch';
import { JsonObject } from '../../common/models/json-value.model';

export type PollingConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type PollingErrorPhase = 'connect' | 'poll';

export interface PollingSubscriptionTarget<TDomain extends string = string> {
  streamId: string;
  domain: TDomain;
  params: JsonObject;
}

export interface PollingSnapshotEnvelope<
  TSnapshot extends JsonObject = JsonObject,
  TDomain extends string = string,
> {
  sourceKey: string;
  target: PollingSubscriptionTarget<TDomain>;
  version: number;
  receivedAt: string;
  snapshot: TSnapshot;
}

export interface PollingPatchEnvelope<TDomain extends string = string> {
  sourceKey: string;
  target: PollingSubscriptionTarget<TDomain>;
  version: number;
  receivedAt: string;
  operations: Operation[];
}

export interface PollingStreamErrorEnvelope<TDomain extends string = string> {
  sourceKey: string;
  target: PollingSubscriptionTarget<TDomain>;
  phase: PollingErrorPhase;
  receivedAt: string;
  message: string;
}

export interface PollingSessionViewState<
  TSnapshot extends JsonObject = JsonObject,
  TDomain extends string = string,
> {
  sourceKey: string;
  target: PollingSubscriptionTarget<TDomain>;
  snapshot: TSnapshot | null;
  version: number;
  lastReceivedAt: string | null;
  lastPatchOperationCount: number;
  connectionState: PollingConnectionState;
  errorMessage: string | null;
}

export type RealtimeDomainClientEvent<
  TSnapshot extends JsonObject = JsonObject,
  TDomain extends string = string,
> =
  | {
      kind: 'connected';
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }
  | {
      kind: 'disconnected';
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }
  | {
      kind: 'snapshot';
      envelope: PollingSnapshotEnvelope<TSnapshot, TDomain>;
    }
  | {
      kind: 'patch';
      envelope: PollingPatchEnvelope<TDomain>;
    }
  | {
      kind: 'error';
      envelope: PollingStreamErrorEnvelope<TDomain>;
    };

// Trims the shared target shape before it is used by the client or server.
export function normalizePollingTarget<TDomain extends string>(
  target: PollingSubscriptionTarget<TDomain>,
): PollingSubscriptionTarget<TDomain> {
  return {
    streamId: target.streamId.trim(),
    domain: target.domain.trim() as TDomain,
    params: target.params,
  };
}

// Builds the stable source key that identifies one active stream.
export function buildSourceKey<TDomain extends string>(
  target: PollingSubscriptionTarget<TDomain>,
): string {
  return normalizePollingTarget(target).streamId;
}
