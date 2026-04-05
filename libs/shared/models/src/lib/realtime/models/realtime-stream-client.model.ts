import { PollingSubscriptionTarget } from './realtime-polling.model';

export interface ActiveRealtimeStream {
  streamId: string;
  target: PollingSubscriptionTarget<string>;
  unsubscribe?: () => void;
  heartbeatIntervalId?: ReturnType<typeof setInterval>;
}
