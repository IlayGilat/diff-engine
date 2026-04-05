import { TestBed } from '@angular/core/testing';
import { PollingSnapshotEnvelope, PollingSubscriptionTarget } from '@org/models';

type GraphqlSink = {
  next?: (result: Record<string, unknown>) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

const graphqlWsClient = {
  subscribe: vi.fn(),
  dispose: vi.fn(),
};
let graphqlWsOptions: Record<string, any> | null = null;
const operationResponses: Record<string, unknown[]> = {
  startPolling: [],
  stopPolling: [],
  heartbeat: [],
};
const operationCalls: Array<{ query: string; variables: Record<string, unknown> }> = [];

vi.mock('graphql-ws', () => ({
  createClient: vi.fn((options: Record<string, any>) => {
    graphqlWsOptions = options;
    graphqlWsClient.subscribe.mockImplementation(
      (operation: { query: string; variables?: Record<string, unknown> }, sink: GraphqlSink) => {
        operationCalls.push({
          query: operation.query,
          variables: operation.variables ?? {},
        });

        if (operation.query.includes('subscription PollingEvents')) {
          return vi.fn();
        }

        const fieldName = readFieldName(operation.query);
        const responseQueue = operationResponses[fieldName] ?? [];
        const nextPayload = responseQueue.shift();

        queueMicrotask(() => {
          sink.next?.({
            data: {
              [fieldName]: nextPayload,
            },
          });
          sink.complete?.();
        });

        return vi.fn();
      },
    );
    return graphqlWsClient;
  }),
}));

import { GraphqlDomainStreamClientService } from '../clients/graphql-domain-stream.client';

describe('GraphqlDomainStreamClientService', () => {
  const target: PollingSubscriptionTarget<'regions'> = {
    streamId: '',
    domain: 'regions',
    params: {
      email: 'demo@example.com',
    },
  };

  beforeEach(() => {
    graphqlWsOptions = null;
    graphqlWsClient.subscribe.mockClear();
    graphqlWsClient.dispose.mockClear();
    operationCalls.length = 0;
    operationResponses['startPolling'] = [];
    operationResponses['stopPolling'] = [];
    operationResponses['heartbeat'] = [];

    TestBed.configureTestingModule({
      providers: [GraphqlDomainStreamClientService],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should restart polling with a fresh snapshot after a websocket reconnect', async () => {
    const events: string[] = [];
    operationResponses['startPolling'].push(
      JSON.stringify(createSnapshotEnvelope(1)),
      JSON.stringify(createSnapshotEnvelope(2)),
    );

    const service = TestBed.inject(GraphqlDomainStreamClientService);
    const subscription = service.connect(target).subscribe((event) => {
      events.push(event.kind);
    });

    await flushAsyncWork();
    graphqlWsOptions?.['on']?.['closed']?.({});
    graphqlWsOptions?.['on']?.['connected']?.({}, undefined, true);
    await flushAsyncWork();

    const startCalls = operationCalls.filter((call) =>
      call.query.includes('mutation StartPolling'),
    );

    expect(startCalls).toHaveLength(2);
    expect(startCalls[0]?.variables['streamId']).toBe(
      startCalls[1]?.variables['streamId'],
    );
    expect(events).toEqual([
      'connected',
      'snapshot',
      'disconnected',
      'connected',
      'snapshot',
    ]);

    subscription.unsubscribe();
    service.disconnect(target.domain);
    await flushAsyncWork();
  });

  it('should stop the active stream on explicit disconnect without auto-restarting it', async () => {
    operationResponses['startPolling'].push(JSON.stringify(createSnapshotEnvelope(1)));
    operationResponses['stopPolling'].push(true);

    const service = TestBed.inject(GraphqlDomainStreamClientService);
    const subscription = service.connect(target).subscribe();

    await flushAsyncWork();
    service.disconnect(target.domain);
    await flushAsyncWork();
    graphqlWsOptions?.['on']?.['connected']?.({}, undefined, true);
    await flushAsyncWork();

    expect(
      operationCalls.filter((call) => call.query.includes('mutation StartPolling')),
    ).toHaveLength(1);
    expect(
      operationCalls.filter((call) => call.query.includes('mutation StopPolling')),
    ).toHaveLength(1);

    subscription.unsubscribe();
  });
});

function createSnapshotEnvelope(
  version: number,
): PollingSnapshotEnvelope<any, 'regions'> {
  return {
    sourceKey: 'regions-stream',
    target: {
      streamId: 'regions-stream',
      domain: 'regions',
      params: {
        email: 'demo@example.com',
      },
    },
    version,
    receivedAt: '2026-01-01T00:00:0' + version + '.000Z',
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

function readFieldName(query: string): string {
  if (query.includes('startPolling')) {
    return 'startPolling';
  }

  if (query.includes('stopPolling')) {
    return 'stopPolling';
  }

  if (query.includes('heartbeat')) {
    return 'heartbeat';
  }

  throw new Error('Unknown GraphQL operation in test.');
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
