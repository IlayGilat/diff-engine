import type { Dictionary } from 'lodash';
import { JsonObject } from '../../common/models/json-value.model';
import {
  PollingSubscriptionTarget,
  RealtimeDomainClientEvent,
} from './realtime-polling.model';

export interface ActiveRealtimeStream {
  streamId: string;
  target: PollingSubscriptionTarget<string>;
  unsubscribe?: () => void;
  hasStarted: boolean;
  snapshotHash?: string | null;
}

export interface GraphqlOperationError {
  message: string;
}

export interface GraphqlOperationResponse<TData> {
  data?: TData;
  errors?: GraphqlOperationError[];
}

export interface GraphqlStreamClientState {
  activeTargets: Dictionary<ActiveRealtimeStream>;
  lastEvent?: RealtimeDomainClientEvent<JsonObject, string>;
}
