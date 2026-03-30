export interface PollingSourceDefinition<TDomain extends string> {
  domain: TDomain;
  pollIntervalMs: number;
}
