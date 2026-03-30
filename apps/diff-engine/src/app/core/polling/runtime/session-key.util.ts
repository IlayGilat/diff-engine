export function buildStreamDomainSessionKey(
  streamId: string,
  domain: string,
): string {
  return streamId + '::' + domain;
}
