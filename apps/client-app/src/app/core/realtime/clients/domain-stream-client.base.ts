import {
  JsonObject,
  PollingSubscriptionTarget,
  RealtimeDomainClientEvent,
} from '@org/models';
import { Observable } from 'rxjs';

export abstract class AbstractDomainStreamClient {
  abstract connect<TDomain extends string, TSnapshot extends JsonObject>(
    target: PollingSubscriptionTarget<TDomain>,
  ): Observable<RealtimeDomainClientEvent<TSnapshot, TDomain>>;

  abstract disconnect(domainKey: string): void;
}
