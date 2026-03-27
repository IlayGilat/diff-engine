import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { AbstractPollingDomainSource } from './polling-domain-source.abstract';

export abstract class AbstractExternalPollingDomainSource<
  TDomain extends string,
  TSnapshot extends JsonObject = JsonObject,
> extends AbstractPollingDomainSource<TDomain, TSnapshot> {
  private readonly baseUrl =
    process.env.MOCK_EXTERNAL_API_URL ?? 'http://localhost:3334';

  async fetchSnapshot(
    target: PollingSubscriptionTarget<TDomain>,
  ): Promise<TSnapshot> {
    const response = await fetch(this.buildUrl(target), {
      headers: this.buildHeaders(target),
    });

    if (!response.ok) {
      throw new Error(
        'External API returned status ' +
          response.status +
          ' for domain "' +
          this.definition.domain +
          '".',
      );
    }

    const payload = (await response.json()) as JsonObject;
    return this.mapSnapshot(payload, target);
  }

  protected buildUrl(target: PollingSubscriptionTarget<TDomain>): string {
    const params = this.buildQueryParams(target);
    return this.baseUrl + this.definition.endpointPath + '?' + params.toString();
  }

  protected buildQueryParams(
    target: PollingSubscriptionTarget<TDomain>,
  ): URLSearchParams {
    return new URLSearchParams({
      email: target.email,
    });
  }

  protected buildHeaders(
    _target: PollingSubscriptionTarget<TDomain>,
  ): Record<string, string> {
    return this.definition.staticHeaders ?? {};
  }

  protected mapSnapshot(
    payload: JsonObject,
    _target: PollingSubscriptionTarget<TDomain>,
  ): TSnapshot {
    return payload as TSnapshot;
  }
}
