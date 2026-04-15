import { PollingSubscriptionTarget } from './realtime-polling.model';

export interface ActiveRealtimeStream {
  target: PollingSubscriptionTarget<string>;
  hasReceivedPayload: boolean;
  unsubscribe?: () => void;
}
