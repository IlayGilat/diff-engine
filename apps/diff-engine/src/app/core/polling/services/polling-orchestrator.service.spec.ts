import {
  JsonObject,
  PollingResumeEnvelope,
  PollingSubscriptionTarget,
  createSnapshotHash,
} from '@org/models';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemorySnapshotStoreAdapter } from '../store/adapters/in-memory-snapshot-store.adapter';
import { SnapshotStoreAdapterBuilder } from '../store/builders/snapshot-store-adapter.builder';
import { SnapshotSessionStoreService } from '../store/services/snapshot-session-store.service';
import { PollingRuntimeRegistryService } from '../runtime/polling-runtime-registry.service';
import { buildStreamDomainSessionKey } from '../runtime/session-key.util';
import { DiffPatchService } from './diff-patch.service';
import { PollingOrchestratorService } from './polling-orchestrator.service';

describe('PollingOrchestratorService', () => {
  const streamId = 'regions-stream-1';
  const target: PollingSubscriptionTarget<'regions'> = {
    domain: 'regions',
    email: 'demo@example.com',
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should pause immediately, stop polling during grace, and destroy after 15 seconds', async () => {
    const fetchSnapshot = vi.fn().mockResolvedValue(createSnapshot(1));
    const services = createServices(fetchSnapshot);

    await services.orchestrator.start(streamId, target);
    services.orchestrator.pauseStreams([streamId]);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(services.snapshotStore.get(buildSessionKey(streamId, target))).toBeDefined();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(services.snapshotStore.get(buildSessionKey(streamId, target))).toBeUndefined();
  });

  it('should resume the existing session when the last known hash still matches', async () => {
    const initialSnapshot = createSnapshot(1);
    const services = createServices(
      vi.fn().mockResolvedValue(initialSnapshot),
    );

    const started = await services.orchestrator.start(streamId, target);
    services.orchestrator.pauseStreams([streamId]);

    const resumed = await services.orchestrator.resume(
      streamId,
      target,
      started.snapshotHash,
    );

    expect(resumed.kind).toBe('resumed');
    expectResumeEnvelope(resumed, started.snapshotHash, started.version);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(services.snapshotStore.get(buildSessionKey(streamId, target))).toBeDefined();
  });

  it('should recreate the session after the grace period expires', async () => {
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce(createSnapshot(1))
      .mockResolvedValueOnce(createSnapshot(2));
    const services = createServices(fetchSnapshot);

    const started = await services.orchestrator.start(streamId, target);
    services.orchestrator.pauseStreams([streamId]);
    await vi.advanceTimersByTimeAsync(15_000);

    const resumed = await services.orchestrator.resume(
      streamId,
      target,
      started.snapshotHash,
    );

    expect(resumed.kind).toBe('resynced');
    if (resumed.kind !== 'resynced') {
      throw new Error('Expected resynced response.');
    }

    expect(resumed.resetStore).toBe(true);
    expect(resumed.envelope.version).toBe(1);
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should force a full resync when the last known hash does not match', async () => {
    const nextSnapshot = createSnapshot(2);
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce(createSnapshot(1))
      .mockResolvedValueOnce(nextSnapshot);
    const services = createServices(fetchSnapshot);

    await services.orchestrator.start(streamId, target);
    services.orchestrator.pauseStreams([streamId]);

    const resumed = await services.orchestrator.resume(
      streamId,
      target,
      'stale-hash',
    );

    expect(resumed.kind).toBe('resynced');
    if (resumed.kind !== 'resynced') {
      throw new Error('Expected resynced response.');
    }

    expect(resumed.envelope.snapshotHash).toBe(createSnapshotHash(nextSnapshot));
    expect(resumed.envelope.snapshot).toEqual(nextSnapshot);
  });
});

function createServices(fetchSnapshot: ReturnType<typeof vi.fn>) {
  const snapshotStore = new SnapshotSessionStoreService(
    new SnapshotStoreAdapterBuilder(new InMemorySnapshotStoreAdapter()),
  );
  const runtimeRegistry = new PollingRuntimeRegistryService();
  const domainSource = {
    fetch: fetchSnapshot,
    getPollIntervalMs: () => 1_000,
  };
  const domainRegistry = {
    resolve: vi.fn().mockReturnValue(domainSource),
  };
  const eventPublisher = {
    publish: vi.fn().mockResolvedValue(undefined),
  };

  return {
    snapshotStore,
    runtimeRegistry,
    orchestrator: new PollingOrchestratorService(
      domainRegistry as never,
      snapshotStore,
      runtimeRegistry,
      new DiffPatchService(),
      eventPublisher as never,
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

function buildSessionKey(
  streamId: string,
  target: PollingSubscriptionTarget<string>,
): string {
  return buildStreamDomainSessionKey(streamId, target.domain);
}

function expectResumeEnvelope(
  envelope: PollingResumeEnvelope<JsonObject, string>,
  snapshotHash: string,
  version: number,
): asserts envelope is {
  kind: 'resumed';
  resetStore: false;
  sourceKey: string;
  target: PollingSubscriptionTarget<string>;
  version: number;
  snapshotHash: string;
  receivedAt: string;
} {
  if (envelope.kind !== 'resumed') {
    throw new Error('Expected resumed envelope.');
  }

  expect(envelope.resetStore).toBe(false);
  expect(envelope.snapshotHash).toBe(snapshotHash);
  expect(envelope.version).toBe(version);
}
