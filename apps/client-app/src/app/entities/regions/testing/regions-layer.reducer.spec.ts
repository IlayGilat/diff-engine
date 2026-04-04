import {
  buildSourceKey,
  createSnapshotHash,
  RegionsLayerSnapshot,
} from '@org/models';
import { Action } from '@ngrx/store';
import { regionsLayerActions } from '../state/regions-layer.actions';
import { regionsLayerReducer } from '../state/regions-layer.reducer';

function createSnapshot(): RegionsLayerSnapshot {
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

describe('regionsLayerReducer', () => {
  it('should handle connect, snapshot, patch, reset, and error events', () => {
    const connectedAt = '2026-01-01T00:00:01.000Z';
    const target = {
      domain: 'regions' as const,
      email: 'demo@example.com',
    };
    const initialSnapshot = createSnapshot();
    const updatedSnapshot = {
      ...initialSnapshot,
      features: initialSnapshot.features.map((feature, index) =>
        index === 0
          ? {
              ...feature,
              intensity: 82,
            }
          : feature,
      ),
    };

    let state = regionsLayerReducer(undefined, { type: '@@init' } as Action);
    state = regionsLayerReducer(
      state,
      regionsLayerActions.connectRequested({ email: target.email }),
    );
    expect(state.session.connectionState).toBe('connecting');

    state = regionsLayerReducer(
      state,
      regionsLayerActions.connected({
        sourceKey: buildSourceKey(target),
        target,
        receivedAt: connectedAt,
      }),
    );
    expect(state.session.connectionState).toBe('connected');

    state = regionsLayerReducer(
      state,
      regionsLayerActions.snapshotReceived({
        envelope: {
          sourceKey: buildSourceKey(target),
          target,
          version: 1,
          snapshotHash: createSnapshotHash(initialSnapshot),
          receivedAt: connectedAt,
          snapshot: initialSnapshot,
        },
      }),
    );
    expect(state.session.snapshot?.features.length).toBe(1);
    expect(state.session.snapshotHash).toBe(createSnapshotHash(initialSnapshot));

    state = regionsLayerReducer(
      state,
      regionsLayerActions.patchReceived({
        envelope: {
          sourceKey: buildSourceKey(target),
          target,
          version: 2,
          snapshotHash: createSnapshotHash(updatedSnapshot),
          receivedAt: '2026-01-01T00:00:02.000Z',
          operations: [
            {
              op: 'replace',
              path: '/features/0/intensity',
              value: 82,
            },
          ],
        },
      }),
    );
    expect(state.session.snapshot?.features[0]?.intensity).toBe(82);
    expect(state.patchLog[0]?.kind).toBe('patch');
    expect(state.session.snapshotHash).toBe(createSnapshotHash(updatedSnapshot));

    state = regionsLayerReducer(
      state,
      regionsLayerActions.sessionReset({
        sourceKey: buildSourceKey(target),
        target,
        receivedAt: '2026-01-01T00:00:02.500Z',
      }),
    );
    expect(state.session.snapshot).toBeNull();
    expect(state.session.snapshotHash).toBeNull();
    expect(state.patchLog).toEqual([]);

    state = regionsLayerReducer(
      state,
      regionsLayerActions.streamErrorReceived({
        envelope: {
          sourceKey: buildSourceKey(target),
          target,
          phase: 'poll',
          receivedAt: '2026-01-01T00:00:03.000Z',
          message: 'Region poll failed.',
        },
      }),
    );
    expect(state.session.connectionState).toBe('error');
    expect(state.session.errorMessage).toBe('Region poll failed.');
  });
});
