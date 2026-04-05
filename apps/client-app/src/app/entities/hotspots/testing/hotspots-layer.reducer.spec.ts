import { Action } from '@ngrx/store';
import { HotspotsLayerSnapshot, buildSourceKey } from '@org/models';
import { hotspotsLayerActions } from '../state/hotspots-layer.actions';
import { hotspotsLayerReducer } from '../state/hotspots-layer.reducer';

function createSnapshot(): HotspotsLayerSnapshot {
  return {
    meta: {
      ownerEmail: 'demo@example.com',
      domain: 'hotspots',
      generatedAt: '2026-01-01T00:00:00.000Z',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      requestCount: 1,
    },
    features: [
      {
        id: 'hotspot-1',
        label: 'Hotspot 1',
        status: 'watch',
        color: '#f97316',
        intensity: 62,
        radius: 12,
        center: {
          x: 34,
          y: 41,
        },
      },
    ],
  };
}

describe('hotspotsLayerReducer', () => {
  it('should handle connect, snapshot, patch, and disconnect events', () => {
    const target = {
      streamId: 'hotspots-stream',
      domain: 'hotspots' as const,
      params: {
        email: 'demo@example.com',
      },
    };
    const initialSnapshot = createSnapshot();

    let state = hotspotsLayerReducer(undefined, { type: '@@init' } as Action);
    state = hotspotsLayerReducer(
      state,
      hotspotsLayerActions.connectRequested({ params: target.params }),
    );
    expect(state.session.connectionState).toBe('connecting');

    state = hotspotsLayerReducer(
      state,
      hotspotsLayerActions.snapshotReceived({
        envelope: {
          sourceKey: buildSourceKey(target),
          target,
          version: 1,
          receivedAt: '2026-01-01T00:00:01.000Z',
          snapshot: initialSnapshot,
        },
      }),
    );
    expect(state.session.snapshot?.features[0]?.radius).toBe(12);

    state = hotspotsLayerReducer(
      state,
      hotspotsLayerActions.patchReceived({
        envelope: {
          sourceKey: buildSourceKey(target),
          target,
          version: 2,
          receivedAt: '2026-01-01T00:00:02.000Z',
          operations: [
            {
              op: 'replace',
              path: '/features/0/radius',
              value: 18,
            },
          ],
        },
      }),
    );
    expect(state.session.snapshot?.features[0]?.radius).toBe(18);

    state = hotspotsLayerReducer(
      state,
      hotspotsLayerActions.disconnectRequested(),
    );
    expect(state.session.connectionState).toBe('disconnected');
  });
});
