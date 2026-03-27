import { Operation } from 'fast-json-patch';
import { JsonObject } from './json-value.model';

export const DIFF_ENGINE_SOCKET_EVENTS = {
  startPolling: 'start-polling',
  stopPolling: 'stop-polling',
  fullState: 'FULL_STATE',
  patch: 'PATCH',
  startError: 'START_ERROR',
  pollingError: 'POLLING_ERROR',
} as const;

export type PollingConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type PollingErrorPhase = 'connect' | 'poll';

export interface PollingSubscriptionTarget<TDomain extends string = string> {
  domain: TDomain;
  email: string;
}

export interface PollingStopTarget<TDomain extends string = string> {
  domain: TDomain;
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

export function normalizePollingTarget<TDomain extends string>(
  target: PollingSubscriptionTarget<TDomain>,
): PollingSubscriptionTarget<TDomain> {
  return {
    domain: target.domain.trim() as TDomain,
    email: target.email.trim().toLowerCase(),
  };
}

export function buildSourceKey<TDomain extends string>(
  target: PollingSubscriptionTarget<TDomain>,
): string {
  const normalizedTarget = normalizePollingTarget(target);
  return normalizedTarget.domain + ':' + normalizedTarget.email;
}
