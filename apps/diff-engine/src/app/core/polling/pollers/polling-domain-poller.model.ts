import { JsonObject } from '@org/models';

export interface PollingDomainPoller<
  TDomain extends string = string,
  TSnapshot extends JsonObject = JsonObject,
> {
  domain: TDomain;
  pollIntervalMs: number;
  fetch(params: JsonObject, signal?: AbortSignal): Promise<TSnapshot>;
}
