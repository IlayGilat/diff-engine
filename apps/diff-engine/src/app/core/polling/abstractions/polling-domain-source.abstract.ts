import { JsonObject, PollingSourceDefinition, PollingSubscriptionTarget } from '@org/models';

export abstract class AbstractPollingDomainSource<
  TDomain extends string = string,
  TSnapshot extends JsonObject = JsonObject,
> {
  readonly definition: PollingSourceDefinition<TDomain>;

  protected constructor(definition: PollingSourceDefinition<TDomain>) {
    this.definition = definition;
  }

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
