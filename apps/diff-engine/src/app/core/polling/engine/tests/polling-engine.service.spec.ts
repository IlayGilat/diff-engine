import { JsonObject } from '@org/models';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiffPatchService } from '../diff-patch.service';
import { PollingEngineService } from '../polling-engine.service';
import { SessionRegistryService } from '../../sessions/session-registry.service';

describe('PollingEngineService', () => {
  const streamId = 'regions-stream';
  const target = {
    streamId,
    domain: 'regions',
    params: {
      email: 'demo@example.com',
    },
  } as const;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.POLLING_SESSION_TTL_MS = '100';
    process.env.POLLING_CLEANUP_INTERVAL_MS = '25';
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.POLLING_SESSION_TTL_MS;
    delete process.env.POLLING_CLEANUP_INTERVAL_MS;
  });

  it('should start a session and publish a patch only when the snapshot changes', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce(createSnapshot(1))
      .mockResolvedValueOnce(createSnapshot(2));
    const service = createService(fetchSnapshot, publish);

    await service.engine.startSession(target, 'connection-1');
    await vi.advanceTimersByTimeAsync(2_000);

    expect(service.sessionRegistry.getSession(streamId)?.version).toBe(2);
    expect(publish).toHaveBeenCalledWith(
      streamId,
      expect.objectContaining({
        kind: 'patch',
      }),
    );
  });

  it('should stop a session and clear its runtime state', async () => {
    const fetchSnapshot = vi.fn().mockResolvedValue(createSnapshot(1));
    const service = createService(fetchSnapshot);

    await service.engine.startSession(target, 'connection-1');

    expect(service.engine.stopSession(streamId)).toBe(true);
    expect(service.sessionRegistry.getSession(streamId)).toBeUndefined();
  });

  it('should expire zombie sessions when the ttl is not refreshed', async () => {
    const fetchSnapshot = vi.fn().mockResolvedValue(createSnapshot(1));
    const service = createService(fetchSnapshot);

    service.engine.onModuleInit();
    await service.engine.startSession(target, 'connection-1');
    await vi.advanceTimersByTimeAsync(150);

    expect(service.sessionRegistry.getSession(streamId)).toBeUndefined();
    service.engine.onModuleDestroy();
  });

  it('should stop every stream that belongs to a disconnected websocket', async () => {
    const fetchSnapshot = vi.fn().mockResolvedValue(createSnapshot(1));
    const service = createService(fetchSnapshot);

    await service.engine.startSession(target, 'connection-1');
    service.engine.stopConnection('connection-1');

    expect(service.sessionRegistry.getSession(streamId)).toBeUndefined();
  });

  it('should ignore stale startup work after the stream was stopped', async () => {
    let resolveSnapshot: ((snapshot: JsonObject) => void) | undefined;
    const fetchSnapshot = vi.fn(
      () =>
        new Promise<JsonObject>((resolve) => {
          resolveSnapshot = resolve;
        }),
    );
    const service = createService(fetchSnapshot);

    const startPromise = service.engine.startSession(target, 'connection-1');
    service.engine.stopSession(streamId);
    resolveSnapshot?.(createSnapshot(1));

    await expect(startPromise).rejects.toThrow(
      'Polling session was replaced before startup completed.',
    );
    expect(service.sessionRegistry.getSession(streamId)).toBeUndefined();
  });
});

function createService(
  fetchSnapshot: ReturnType<typeof vi.fn>,
  publish = vi.fn().mockResolvedValue(undefined),
) {
  const sessionRegistry = new SessionRegistryService();
  const regionsPoller = {
    domain: 'regions',
    pollIntervalMs: 1_000,
    fetch: fetchSnapshot,
  };
  const hotspotsPoller = {
    domain: 'hotspots',
    pollIntervalMs: 1_000,
    fetch: vi.fn().mockResolvedValue(createSnapshot(1)),
  };
  const eventPublisher = {
    publish,
  };

  return {
    sessionRegistry,
    engine: new PollingEngineService(
      new DiffPatchService(),
      eventPublisher as never,
      sessionRegistry,
      regionsPoller as never,
      hotspotsPoller as never,
    ),
  };
}

function createSnapshot(requestCount: number): JsonObject {
  return {
    meta: {
      ownerEmail: 'demo@example.com',
      domain: 'regions',
      generatedAt: '2026-01-01T00:00:00.000Z',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      requestCount,
    },
    features: [
      {
        id: 'region-1',
        intensity: requestCount * 10,
      },
    ],
  };
}
