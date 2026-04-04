import { TestBed } from '@angular/core/testing';
import {
  PollingResumeEnvelope,
  PollingSnapshotEnvelope,
  PollingSubscriptionTarget,
} from '@org/models';

const graphqlWsClient = {
  subscribe: vi.fn(),
  dispose: vi.fn(),
};
let graphqlWsOptions: Record<string, any> | null = null;

vi.mock('graphql-ws', () => ({
  createClient: vi.fn((options: Record<string, any>) => {
    graphqlWsOptions = options;
    graphqlWsClient.subscribe.mockReturnValue(vi.fn());
    return graphqlWsClient;
  }),
}));

import { GraphqlDomainStreamClientService } from '../clients/graphql-domain-stream.client';

describe('GraphqlDomainStreamClientService', () => {
  const target: PollingSubscriptionTarget<'regions'> = {
    domain: 'regions',
    email: 'demo@example.com',
  };

  beforeEach(() => {
    graphqlWsOptions = null;
    graphqlWsClient.subscribe.mockReset();
    graphqlWsClient.subscribe.mockReturnValue(vi.fn());
    graphqlWsClient.dispose.mockReset();
    vi.stubGlobal('fetch', vi.fn());
    TestBed.configureTestingModule({
      providers: [GraphqlDomainStreamClientService],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('should resume from the last known hash without resetting the store', async () => {
    const events: string[] = [];
    mockGraphqlResponse('startPolling', createSnapshotEnvelope('hash-1'));
    mockGraphqlResponse(
      'resumePolling',
      createResumeEnvelope({
        kind: 'resumed',
        resetStore: false,
        sourceKey: 'regions:demo@example.com',
        target,
        version: 1,
        snapshotHash: 'hash-1',
        receivedAt: '2026-01-01T00:00:05.000Z',
      }),
    );

    const service = TestBed.inject(GraphqlDomainStreamClientService);
    const subscription = service.connect(target).subscribe((event) => {
      events.push(event.kind);
    });

    await flushAsyncWork();
    graphqlWsOptions?.['on']?.['closed']?.({});
    graphqlWsOptions?.['on']?.['connected']?.({}, undefined, true);
    await flushAsyncWork();

    const resumeRequest = getFetchRequestBody(1);
    expect(resumeRequest['query']).toContain('resumePolling');
    expect(resumeRequest['variables']?.['lastKnownHash']).toBe('hash-1');
    expect(events).toEqual(['connected', 'snapshot', 'disconnected', 'resumed']);

    subscription.unsubscribe();
    service.disconnect(target.domain);
  });

  it('should reset and resend the full snapshot when the resume hash mismatches', async () => {
    const events: string[] = [];
    mockGraphqlResponse('startPolling', createSnapshotEnvelope('hash-1'));
    mockGraphqlResponse(
      'resumePolling',
      createResumeEnvelope({
        kind: 'resynced',
        resetStore: true,
        envelope: createSnapshotEnvelope('hash-2', 1, '2026-01-01T00:00:05.000Z'),
      }),
    );

    const service = TestBed.inject(GraphqlDomainStreamClientService);
    const subscription = service.connect(target).subscribe((event) => {
      events.push(event.kind);
    });

    await flushAsyncWork();
    graphqlWsOptions?.['on']?.['closed']?.({});
    graphqlWsOptions?.['on']?.['connected']?.({}, undefined, true);
    await flushAsyncWork();

    expect(events).toEqual(['connected', 'snapshot', 'disconnected', 'reset', 'snapshot']);

    subscription.unsubscribe();
    service.disconnect(target.domain);
  });

  it('should hard stop on explicit disconnect without attempting auto-resume', async () => {
    mockGraphqlResponse('startPolling', createSnapshotEnvelope('hash-1'));
    mockGraphqlResponse('stopPolling', true);

    const service = TestBed.inject(GraphqlDomainStreamClientService);
    const subscription = service.connect(target).subscribe();

    await flushAsyncWork();
    service.disconnect(target.domain);
    await flushAsyncWork();
    graphqlWsOptions?.['on']?.['connected']?.({}, undefined, true);
    await flushAsyncWork();

    expect(getFetchRequestBody(0)['query']).toContain('startPolling');
    expect(getFetchRequestBody(1)['query']).toContain('stopPolling');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);

    subscription.unsubscribe();
  });
});

function createSnapshotEnvelope(
  snapshotHash: string,
  version = 1,
  receivedAt = '2026-01-01T00:00:01.000Z',
): PollingSnapshotEnvelope<any, 'regions'> {
  return {
    sourceKey: 'regions:demo@example.com',
    target: {
      domain: 'regions',
      email: 'demo@example.com',
    },
    version,
    snapshotHash,
    receivedAt,
    snapshot: {
      meta: {
        ownerEmail: 'demo@example.com',
        domain: 'regions',
        generatedAt: '2026-01-01T00:00:00.000Z',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        requestCount: version,
      },
      features: [
        {
          id: 'region-1',
          intensity: version * 10,
        },
      ],
    },
  };
}

function createResumeEnvelope(
  envelope: PollingResumeEnvelope<any, 'regions'>,
): PollingResumeEnvelope<any, 'regions'> {
  return envelope;
}

function mockGraphqlResponse(fieldName: string, payload: unknown): void {
  const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: {
        [fieldName]: JSON.stringify(payload),
      },
    }),
  });
}

function getFetchRequestBody(index: number): Record<string, any> {
  const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
  return JSON.parse(fetchMock.mock.calls[index]?.[1]?.body as string) as Record<
    string,
    any
  >;
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
