import {
  Dictionary,
  JsonObject,
  PollingSourceDefinition,
  PollingSubscriptionTarget,
} from '@org/models';

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

  protected async fetchJson(
    target: PollingSubscriptionTarget<TDomain>,
    headers: Dictionary<string> = this.definition.headers ?? {},
  ): Promise<TSnapshot> {
    const params = new URLSearchParams({
      email: target.email,
    });
    const response = await fetch(
      this.definition.baseUrl + this.definition.path + '?' + params.toString(),
      {
        headers,
      },
    );

    if (!response.ok) {
      throw new Error(
        'External API returned status ' +
          response.status +
          ' for domain "' +
          this.definition.domain +
          '".',
      );
    }

    return (await response.json()) as TSnapshot;
  }
}
