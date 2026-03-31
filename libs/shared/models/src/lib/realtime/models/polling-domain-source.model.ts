import type { Dictionary } from 'lodash';

export interface PollingSourceDefinition<TDomain extends string> {
  domain: TDomain;
  pollIntervalMs: number;
  baseUrl: string;
  path: string;
  headers?: Dictionary<string>;
}
