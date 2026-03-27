export function buildSocketDomainSessionKey(
  socketId: string,
  domain: string,
): string {
  return socketId + '::' + domain;
}
