export interface PollingSourceDefinition<TDomain extends string> {
  domain: TDomain;
  endpointPath: string;
  pollIntervalMs: number;
  staticHeaders?: Record<string, string>;
}
