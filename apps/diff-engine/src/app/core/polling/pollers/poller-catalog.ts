import { PollingDomainPoller } from './polling-domain-poller.model';

export type PollerCatalog = Map<string, PollingDomainPoller>;

// Builds one lookup map so the engine can resolve domains quickly.
export function createPollerCatalog(
  pollers: PollingDomainPoller[],
): PollerCatalog {
  return new Map(
    pollers.map((poller) => [poller.domain, poller] satisfies [string, PollingDomainPoller]),
  );
}

// Resolves a domain poller and throws a clear error when the domain is unknown.
export function resolvePoller(
  catalog: PollerCatalog,
  domain: string,
): PollingDomainPoller {
  const poller = catalog.get(domain);
  if (!poller) {
    throw new Error('Unsupported polling domain "' + domain + '".');
  }

  return poller;
}
