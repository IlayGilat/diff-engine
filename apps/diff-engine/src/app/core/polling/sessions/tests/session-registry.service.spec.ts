import { describe, expect, it } from 'vitest';
import { SessionRegistryService } from '../session-registry.service';

describe('SessionRegistryService', () => {
  it('should bind and release stream ids by connection', () => {
    const service = new SessionRegistryService();

    service.bindStreamToConnection('connection-1', 'stream-1');
    service.bindStreamToConnection('connection-1', 'stream-2');

    expect(service.releaseConnection('connection-1')).toEqual([
      'stream-1',
      'stream-2',
    ]);
    expect(service.releaseConnection('connection-1')).toEqual([]);
  });

  it('should clear connection indexes when a session is deleted', () => {
    const service = new SessionRegistryService();

    service.saveSession({
      streamId: 'stream-1',
      target: {
        streamId: 'stream-1',
        domain: 'regions',
        params: {
          email: 'demo@example.com',
        },
      },
      version: 1,
      lastSnapshot: {},
      pollIntervalMs: 1_000,
      timerId: null,
      abortController: null,
      expiresAt: Date.now() + 1_000,
      generation: 1,
    });
    service.bindStreamToConnection('connection-1', 'stream-1');

    service.deleteSession('stream-1');

    expect(service.releaseConnection('connection-1')).toEqual([]);
  });
});
