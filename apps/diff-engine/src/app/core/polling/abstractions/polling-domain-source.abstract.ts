import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { PollingSourceDefinition } from '../models/polling-source-definition.model';

export abstract class AbstractPollingDomainSource<
  TDomain extends string = string,
  TSnapshot extends JsonObject = JsonObject,
> {
  abstract readonly definition: PollingSourceDefinition<TDomain>;

  supports(
    target: PollingSubscriptionTarget<string>,
  ): target is PollingSubscriptionTarget<TDomain> {
    return target.domain === this.definition.domain;
  }

  getPollIntervalMs(): number {
    return this.definition.pollIntervalMs;
  }

  abstract fetch(
    target: PollingSubscriptionTarget<TDomain>,
  ): Promise<TSnapshot>;
}
