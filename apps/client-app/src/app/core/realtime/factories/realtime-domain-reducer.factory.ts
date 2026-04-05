import {
  Dictionary,
  DomainPatchLogEntry,
  JsonObject,
  PollingConnectionState,
  PollingPatchEnvelope,
  PollingSessionViewState,
  RealtimeDomainDefinition,
  RealtimeDomainFeatureState,
  RealtimeFeatureKey,
  RealtimeDomainSelectors,
  buildSourceKey,
} from '@org/models';
import {
  ActionReducer,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
} from '@ngrx/store';
import { Operation } from 'fast-json-patch';
import { applyPatch } from 'fast-json-patch';
import { RealtimeDomainActionGroup } from '@org/models';

// Creates the reducer that manages one realtime domain slice.
export function createRealtimeDomainReducer<
  TDomain extends string,
  TSnapshot extends JsonObject,
>(
  definition: RealtimeDomainDefinition<TDomain>,
  actions: RealtimeDomainActionGroup<TDomain, TSnapshot>,
): ActionReducer<RealtimeDomainFeatureState<TSnapshot, TDomain>> {
  return createReducer(
    createInitialFeatureState(definition),
    on(actions.connectRequested, (state, { params }) => ({
      ...state,
      session: setConnectionState(
        createSessionState<TDomain, TSnapshot>(definition.domain, params),
        'connecting',
        state.session.lastReceivedAt,
      ),
    })),
    on(actions.connected, (state, { sourceKey, target, receivedAt }) => ({
      ...state,
      session: {
        ...state.session,
        sourceKey,
        target,
        connectionState: 'connected' as PollingConnectionState,
        lastReceivedAt: receivedAt,
        errorMessage: null,
      },
    })),
    on(actions.disconnectRequested, (state) => ({
      ...state,
      session: setConnectionState(
        state.session,
        'disconnected',
        state.session.lastReceivedAt,
      ),
    })),
    on(actions.disconnected, (state, { sourceKey, target, receivedAt }) => ({
      ...state,
      session: {
        ...state.session,
        sourceKey,
        target,
        connectionState: 'disconnected' as PollingConnectionState,
        lastReceivedAt: receivedAt,
      },
    })),
    on(actions.snapshotReceived, (state, { envelope }) => ({
      ...state,
      session: {
        sourceKey: envelope.sourceKey,
        target: envelope.target,
        snapshot: envelope.snapshot,
        version: envelope.version,
        lastReceivedAt: envelope.receivedAt,
        lastPatchOperationCount: 0,
        connectionState: 'connected' as PollingConnectionState,
        errorMessage: null,
      },
      patchLog: appendPatchLog(state.patchLog, {
        version: envelope.version,
        receivedAt: envelope.receivedAt,
        kind: 'snapshot',
        operationCount: 0,
        message: 'Full snapshot synced.',
        paths: [],
      }),
    })),
    on(actions.patchReceived, (state, { envelope }) => ({
      ...state,
      session: applyPatchEnvelope(state.session, envelope),
      patchLog: appendPatchLog(state.patchLog, {
        version: envelope.version,
        receivedAt: envelope.receivedAt,
        kind: 'patch',
        operationCount: envelope.operations.length,
        message: describeOperations(envelope),
        paths: envelope.operations
          .slice(0, 4)
          .map((operation: Operation) => operation.path),
      }),
    })),
    on(actions.streamErrorReceived, (state, { envelope }) => ({
      ...state,
      session: {
        ...state.session,
        connectionState: 'error' as PollingConnectionState,
        lastReceivedAt: envelope.receivedAt,
        errorMessage: envelope.message,
      },
      patchLog: appendPatchLog(state.patchLog, {
        version: state.session.version,
        receivedAt: envelope.receivedAt,
        kind: 'error',
        operationCount: 0,
        message: envelope.message,
        paths: [],
      }),
    })),
  ) as unknown as ActionReducer<RealtimeDomainFeatureState<TSnapshot, TDomain>>;
}

// Creates the shared selectors for one realtime domain slice.
export function createRealtimeDomainSelectors<
  TDomain extends string,
  TSnapshot extends JsonObject,
>(
  featureKey: RealtimeFeatureKey,
): RealtimeDomainSelectors<TDomain, TSnapshot> {
  const selectFeatureState =
    createFeatureSelector<RealtimeDomainFeatureState<TSnapshot, TDomain>>(
      featureKey,
    );
  const selectSession = createSelector(
    selectFeatureState,
    (state) => state.session,
  );
  const selectSnapshot = createSelector(
    selectSession,
    (session) => session.snapshot,
  );
  const selectPatchLog = createSelector(
    selectFeatureState,
    (state) => state.patchLog,
  );

  return {
    selectFeatureState,
    selectSession,
    selectSnapshot,
    selectPatchLog,
  };
}

// Creates the empty feature state before any stream starts.
function createInitialFeatureState<TDomain extends string, TSnapshot extends JsonObject>(
  definition: RealtimeDomainDefinition<TDomain>,
): RealtimeDomainFeatureState<TSnapshot, TDomain> {
  return {
    session: createSessionState(definition.domain, {}),
    patchLog: [],
  };
}

// Creates the session shell that reducers fill as events arrive.
function createSessionState<TDomain extends string, TSnapshot extends JsonObject>(
  domain: TDomain,
  params: JsonObject,
): PollingSessionViewState<TSnapshot, TDomain> {
  const target = {
    streamId: '',
    domain,
    params,
  };

  return {
    sourceKey: buildSourceKey(target),
    target,
    snapshot: null,
    version: 0,
    lastReceivedAt: null,
    lastPatchOperationCount: 0,
    connectionState: 'disconnected',
    errorMessage: null,
  };
}

// Updates only the connection metadata on the session.
function setConnectionState<TDomain extends string, TSnapshot extends JsonObject>(
  session: PollingSessionViewState<TSnapshot, TDomain>,
  connectionState: PollingConnectionState,
  receivedAt: string | null,
): PollingSessionViewState<TSnapshot, TDomain> {
  return {
    ...session,
    connectionState,
    lastReceivedAt: receivedAt ?? session.lastReceivedAt,
    errorMessage: connectionState === 'error' ? session.errorMessage : null,
  };
}

// Applies one JSON patch envelope to the current snapshot.
function applyPatchEnvelope<TDomain extends string, TSnapshot extends JsonObject>(
  session: PollingSessionViewState<TSnapshot, TDomain>,
  envelope: PollingPatchEnvelope<TDomain>,
): PollingSessionViewState<TSnapshot, TDomain> {
  if (!session.snapshot) {
    return session;
  }

  const patchResult = applyPatch(
    session.snapshot,
    envelope.operations,
    false,
    false,
  );

  return {
    ...session,
    snapshot: patchResult.newDocument as TSnapshot,
    version: envelope.version,
    lastReceivedAt: envelope.receivedAt,
    lastPatchOperationCount: envelope.operations.length,
    connectionState: 'connected',
    errorMessage: null,
  };
}

// Keeps only the latest patch log entries for the UI.
function appendPatchLog(
  currentPatchLog: DomainPatchLogEntry[],
  patchLogEntry: DomainPatchLogEntry,
): DomainPatchLogEntry[] {
  return [patchLogEntry].concat(currentPatchLog).slice(0, 8);
}

// Builds a short human-readable summary for patch log rows.
function describeOperations<TDomain extends string>(
  envelope: PollingPatchEnvelope<TDomain>,
): string {
  const operationCounts = envelope.operations.reduce(
    (counts, operation) => {
      counts[operation.op] = (counts[operation.op] ?? 0) + 1;
      return counts;
    },
    {} as Dictionary<number>,
  );

  return Object.keys(operationCounts)
    .map((operationName) => operationName + ': ' + operationCounts[operationName])
    .join(' | ');
}
