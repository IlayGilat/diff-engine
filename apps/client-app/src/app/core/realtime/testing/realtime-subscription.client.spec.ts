import { TestBed } from '@angular/core/testing';
import {
  buildSourceKey,
  RegionsLayerSnapshot,
} from '@org/models';
import { Apollo } from 'apollo-angular';
import { GraphQLError } from 'graphql';
import { Observable, Subject } from 'rxjs';
import { RealtimeSubscriptionClientService } from '../clients/realtime-subscription.client';

function createRegionsSnapshot(): RegionsLayerSnapshot {
  return {
    meta: {
      ownerEmail: 'demo@example.com',
      domain: 'regions',
      generatedAt: '2026-01-01T00:00:00.000Z',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      requestCount: 1,
    },
    features: [
      {
        id: 'region-1',
        label: 'North Field',
        status: 'stable',
        fill: '#0f766e',
        stroke: '#115e59',
        intensity: 40,
        points: [
          { x: 10, y: 10 },
          { x: 22, y: 11 },
          { x: 21, y: 22 },
          { x: 9, y: 21 },
        ],
      },
    ],
  };
}

describe('RealtimeSubscriptionClientService', () => {
  let service: RealtimeSubscriptionClientService;
  let apolloMock: {
    subscribe: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    apolloMock = {
      subscribe: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RealtimeSubscriptionClientService,
        {
          provide: Apollo,
          useValue: apolloMock,
        },
      ],
    });

    service = TestBed.inject(RealtimeSubscriptionClientService);
  });

  it('emits connected before the first payload and forwards snapshot and patch events', () => {
    const target = {
      domain: 'regions' as const,
      email: 'Demo@Example.com',
    };
    const payloads = new Subject<{ data?: { pollingEvents?: string } }>();
    const events: Array<{ kind: string }> = [];

    apolloMock.subscribe.mockReturnValue(payloads.asObservable());

    service.connect(target).subscribe((event) => {
      events.push(event);
    });

    payloads.next({
      data: {
        pollingEvents: JSON.stringify({
          kind: 'snapshot',
          envelope: {
            sourceKey: buildSourceKey({
              domain: 'regions',
              email: 'demo@example.com',
            }),
            target: {
              domain: 'regions',
              email: 'demo@example.com',
            },
            version: 1,
            receivedAt: '2026-01-01T00:00:01.000Z',
            snapshot: createRegionsSnapshot(),
          },
        }),
      },
    });
    payloads.next({
      data: {
        pollingEvents: JSON.stringify({
          kind: 'patch',
          envelope: {
            sourceKey: buildSourceKey({
              domain: 'regions',
              email: 'demo@example.com',
            }),
            target: {
              domain: 'regions',
              email: 'demo@example.com',
            },
            version: 2,
            receivedAt: '2026-01-01T00:00:02.000Z',
            operations: [
              {
                op: 'replace',
                path: '/features/0/intensity',
                value: 55,
              },
            ],
          },
        }),
      },
    });

    expect(events.map((event) => event.kind)).toEqual([
      'connected',
      'snapshot',
      'patch',
    ]);
  });

  it('maps GraphQL result errors into realtime error events', () => {
    const events: Array<{ kind: string; envelope?: { message: string } }> = [];

    apolloMock.subscribe.mockReturnValue(
      new Observable((subscriber) => {
        subscriber.next({
          error: new GraphQLError('Subscription rejected.'),
        });
      }),
    );

    service
      .connect({
        domain: 'regions',
        email: 'demo@example.com',
      })
      .subscribe((event) => {
        events.push(event as { kind: string; envelope?: { message: string } });
      });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'error',
      envelope: {
        message: 'Subscription rejected.',
      },
    });
  });

  it('emits disconnected when the upstream subscription completes after data arrives', () => {
    const payloads = new Subject<{ data?: { pollingEvents?: string } }>();
    const events: Array<{ kind: string }> = [];

    apolloMock.subscribe.mockReturnValue(payloads.asObservable());

    service
      .connect({
        domain: 'regions',
        email: 'demo@example.com',
      })
      .subscribe((event) => {
        events.push(event);
      });

    payloads.next({
      data: {
        pollingEvents: JSON.stringify({
          kind: 'snapshot',
          envelope: {
            sourceKey: buildSourceKey({
              domain: 'regions',
              email: 'demo@example.com',
            }),
            target: {
              domain: 'regions',
              email: 'demo@example.com',
            },
            version: 1,
            receivedAt: '2026-01-01T00:00:01.000Z',
            snapshot: createRegionsSnapshot(),
          },
        }),
      },
    });
    payloads.complete();

    expect(events[events.length - 1]?.kind).toBe('disconnected');
  });

  it('unsubscribes the underlying Apollo subscription on teardown', () => {
    let unsubscribeCount = 0;

    apolloMock.subscribe.mockReturnValue(
      new Observable(() => () => {
        unsubscribeCount += 1;
      }),
    );

    const subscription = service
      .connect({
        domain: 'regions',
        email: 'demo@example.com',
      })
      .subscribe();

    subscription.unsubscribe();

    expect(unsubscribeCount).toBe(1);
  });
});
