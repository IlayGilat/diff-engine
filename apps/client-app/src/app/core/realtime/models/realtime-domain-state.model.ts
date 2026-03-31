import { JsonObject, PollingSessionViewState } from '@org/models';

export interface DomainPatchLogEntry {
  version: number;
  receivedAt: string;
  kind: 'snapshot' | 'patch' | 'error';
  operationCount: number;
  message: string | null;
  paths: string[];
}

export interface RealtimeDomainDefinition<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  domain: TDomain;
  featureKey: string;
  displayName: string;
  description: string;
  accentColor: string;
}

export interface RealtimeDomainFeatureState<
  TSnapshot extends JsonObject = JsonObject,
  TDomain extends string = string,
> {
  session: PollingSessionViewState<TSnapshot, TDomain>;
  patchLog: DomainPatchLogEntry[];
}
