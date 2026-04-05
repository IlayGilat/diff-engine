import { JsonObject, PollingSubscriptionTarget } from '@org/models';

export interface ActivePollingSession<
  TSnapshot extends JsonObject = JsonObject,
  TDomain extends string = string,
> {
  streamId: string;
  target: PollingSubscriptionTarget<TDomain>;
  version: number;
  lastSnapshot: TSnapshot | null;
  pollIntervalMs: number;
  timerId: ReturnType<typeof setTimeout> | null;
  abortController: AbortController | null;
  expiresAt: number;
  generation: number;
}
