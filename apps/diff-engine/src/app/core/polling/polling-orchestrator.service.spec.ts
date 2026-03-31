import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DiffPatchService } from './diff-patch.service';
import { PollingDomainRegistryService } from './polling-domain-registry.service';
import { PollingOrchestratorService } from './polling-orchestrator.service';
import { pollingOk } from './polling-operation-result.model';
import { PollingRuntimeRegistryService } from './runtime/polling-runtime-registry.service';
import { InMemorySnapshotStoreAdapter } from './store/adapters/in-memory-snapshot-store.adapter';
import { SnapshotStoreAdapterBuilder } from './store/builders/snapshot-store-adapter.builder';
import { SnapshotSessionStoreService } from './store/snapshot-session-store.service';

function createSnapshot(ownerEmail: string): JsonObject {
  return {
    meta: {
      ownerEmail,
      domain: 'regions',
    },
    features: [],
  };
}

describe('PollingOrchestratorService', () => {
  const target: PollingSubscriptionTarget<'regions'> = {
    domain: 'regions',
    email: 'demo@example.com',
  };

  let domainSource: {
    getPollIntervalMs: ReturnType<typeof vi.fn>;
    fetch: ReturnType<typeof vi.fn>;
  };
  let pollingDomainRegistryService: Pick<PollingDomainRegistryService, 'resolve'>;
  let snapshotSessionStoreService: SnapshotSessionStoreService;
  let pollingRuntimeRegistryService: PollingRuntimeRegistryService;
  let pollingEventPublisherService: {
    publish: ReturnType<typeof vi.fn>;
  };
  let service: PollingOrchestratorService;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.POLLING_DISCONNECT_GRACE_MS = '15000';

    domainSource = {
      getPollIntervalMs: vi.fn().mockReturnValue(1000),
      fetch: vi.fn().mockResolvedValue(createSnapshot(target.email)),
    };

    pollingDomainRegistryService = {
      resolve: vi.fn().mockReturnValue(pollingOk(domainSource)),
    };
    snapshotSessionStoreService = new SnapshotSessionStoreService(
      new SnapshotStoreAdapterBuilder(new InMemorySnapshotStoreAdapter()),
    );
    pollingRuntimeRegistryService = new PollingRuntimeRegistryService();
    pollingEventPublisherService = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    service = new PollingOrchestratorService(
      pollingDomainRegistryService as PollingDomainRegistryService,
      snapshotSessionStoreService,
      pollingRuntimeRegistryService,
      new DiffPatchService(),
      pollingEventPublisherService as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.POLLING_DISCONNECT_GRACE_MS;
  });

  it('creates a new polling session and stores its runtime state', async () => {
    const result = await service.start('stream-1', target);

    expect(result.isOk()).toBe(true);
    expect(snapshotSessionStoreService.listByStreamId('stream-1')).toHaveLength(1);
    expect(
      pollingRuntimeRegistryService.hasInterval('stream-1::regions'),
    ).toBe(true);
  });

  it('pauses on disconnect and terminates after the grace window', async () => {
    await service.start('stream-1', target);

    service.handleStreamDisconnected('stream-1');

    expect(
      pollingRuntimeRegistryService.hasInterval('stream-1::regions'),
    ).toBe(false);
    expect(snapshotSessionStoreService.get('stream-1::regions')).toBeDefined();

    vi.advanceTimersByTime(14999);
    expect(snapshotSessionStoreService.get('stream-1::regions')).toBeDefined();

    vi.advanceTimersByTime(1);
    expect(snapshotSessionStoreService.get('stream-1::regions')).toBeUndefined();
  });

  it('resumes an existing session within the grace window without resetting its version', async () => {
    const started = await service.start('stream-1', target);
    expect(started.isOk()).toBe(true);

    service.handleStreamDisconnected('stream-1');
    vi.advanceTimersByTime(5000);

    const resumed = await service.start('stream-1', target);

    expect(resumed.isOk()).toBe(true);
    expect(resumed.value().version).toBe(1);
    expect(snapshotSessionStoreService.get('stream-1::regions')?.version).toBe(1);
    expect(
      pollingRuntimeRegistryService.hasInterval('stream-1::regions'),
    ).toBe(true);
  });

  it('stops immediately on manual disconnect even if termination was already scheduled', async () => {
    await service.start('stream-1', target);
    service.handleStreamDisconnected('stream-1');

    const stopped = service.stopDomain('stream-1', {
      domain: 'regions',
    });

    expect(stopped).toBe(true);
    expect(snapshotSessionStoreService.get('stream-1::regions')).toBeUndefined();
    expect(
      pollingRuntimeRegistryService.hasInterval('stream-1::regions'),
    ).toBe(false);
  });
});
