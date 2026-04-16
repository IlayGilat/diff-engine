import { TestBed } from '@angular/core/testing';
import {
  buildSourceKey,
  RealtimeDomainClientEvent,
  RealtimeFeatureKey,
  RegionsLayerSnapshot,
} from '@org/models';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { regionsLayerActions } from '../../../entities/regions/state/regions-layer.actions';
import { RealtimeSubscriptionClientService } from '../clients/realtime-subscription.client';
import { AbstractRealtimeEntityEffects } from '../effects/abstract-realtime-entity.effects';

class TestRegionsEffects extends AbstractRealtimeEntityEffects<
  'regions',
  RegionsLayerSnapshot
> {
  constructor() {
    super('regions', RealtimeFeatureKey.RegionsLayer);
  }
}

describe('AbstractRealtimeEntityEffects', () => {
  let actions$: Subject<Action>;
  let effects: TestRegionsEffects;
  let realtimeClientMock: {
    connect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject<Action>();
    realtimeClientMock = {
      connect: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TestRegionsEffects,
        {
          provide: Actions,
          useValue: new Actions(actions$),
        },
        {
          provide: RealtimeSubscriptionClientService,
          useValue: realtimeClientMock,
        },
      ],
    });

    effects = TestBed.inject(TestRegionsEffects);
  });

  it('maps subscription events into ngrx actions', () => {
    const target = {
      domain: 'regions' as const,
      email: 'demo@example.com',
    };
    const stream = new Subject<
      RealtimeDomainClientEvent<RegionsLayerSnapshot, 'regions'>
    >();
    const emittedActions: Action[] = [];

    realtimeClientMock.connect.mockReturnValue(stream as Observable<unknown>);

    effects.connect$.subscribe((action) => {
      emittedActions.push(action);
    });

    actions$.next(regionsLayerActions.connectRequested({ email: target.email }));
    stream.next(
      {
        kind: 'connected',
        sourceKey: buildSourceKey(target),
        target,
        receivedAt: '2026-01-01T00:00:01.000Z',
      },
    );

    expect(emittedActions).toEqual([
      regionsLayerActions.connected({
        sourceKey: buildSourceKey(target),
        target,
        receivedAt: '2026-01-01T00:00:01.000Z',
      }) as Action,
    ]);
  });

  it('switches to the latest connection and unsubscribes the previous stream', () => {
    let unsubscribeCount = 0;

    realtimeClientMock.connect.mockImplementation(
      () =>
        new Observable(() => () => {
          unsubscribeCount += 1;
        }),
    );

    const subscription = effects.connect$.subscribe();

    actions$.next(regionsLayerActions.connectRequested({ email: 'first@example.com' }));
    actions$.next(regionsLayerActions.connectRequested({ email: 'second@example.com' }));

    expect(realtimeClientMock.connect).toHaveBeenCalledTimes(2);
    expect(unsubscribeCount).toBe(1);

    subscription.unsubscribe();
  });

  it('tears down the active subscription when disconnect is requested', () => {
    let unsubscribeCount = 0;

    realtimeClientMock.connect.mockImplementation(
      () =>
        new Observable(() => () => {
          unsubscribeCount += 1;
        }),
    );

    const subscription = effects.connect$.subscribe();

    actions$.next(regionsLayerActions.connectRequested({ email: 'demo@example.com' }));
    actions$.next(regionsLayerActions.disconnectRequested());

    expect(unsubscribeCount).toBe(1);

    subscription.unsubscribe();
  });
});
