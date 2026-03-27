import {
  JsonObject,
  PollingConnectionState,
  PollingPatchEnvelope,
  PollingSessionViewState,
  PollingSnapshotEnvelope,
  PollingStreamErrorEnvelope,
  PollingSubscriptionTarget,
  buildSourceKey,
} from '@org/models';
import {
  ActionCreator,
  ActionReducer,
  createAction,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
  props,
} from '@ngrx/store';
import { applyPatch } from 'fast-json-patch';
import {
  DomainPatchLogEntry,
  RealtimeDomainDefinition,
  RealtimeDomainFeatureState,
} from './realtime-domain-state.model';

export interface RealtimeDomainActionGroup<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  connectRequested: ActionCreator<string, (props: { email: string }) => { email: string } & { type: string }>;
  disconnectRequested: ActionCreator<string, () => { type: string }>;
  connected: ActionCreator<
    string,
    (props: {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }) => {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    } & { type: string }
  >;
  disconnected: ActionCreator<
    string,
    (props: {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }) => {
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    } & { type: string }
  >;
  snapshotReceived: ActionCreator<
    string,
    (props: {
      envelope: PollingSnapshotEnvelope<TSnapshot, TDomain>;
    }) => {
      envelope: PollingSnapshotEnvelope<TSnapshot, TDomain>;
    } & { type: string }
  >;
  patchReceived: ActionCreator<
    string,
    (props: { envelope: PollingPatchEnvelope<TDomain> }) => {
      envelope: PollingPatchEnvelope<TDomain>;
    } & { type: string }
  >;
  streamErrorReceived: ActionCreator<
    string,
    (props: { envelope: PollingStreamErrorEnvelope<TDomain> }) => {
      envelope: PollingStreamErrorEnvelope<TDomain>;
    } & { type: string }
  >;
}

export interface RealtimeDomainSelectors<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  selectFeatureState: ReturnType<
    typeof createFeatureSelector<RealtimeDomainFeatureState<TSnapshot, TDomain>>
  >;
  selectSession: any;
  selectSnapshot: any;
  selectPatchLog: any;
}

export interface RealtimeDomainStoreBundle<
  TDomain extends string,
  TSnapshot extends JsonObject,
> {
  definition: RealtimeDomainDefinition<TDomain, TSnapshot>;
  actions: RealtimeDomainActionGroup<TDomain, TSnapshot>;
  reducer: ActionReducer<RealtimeDomainFeatureState<TSnapshot, TDomain>>;
  selectors: RealtimeDomainSelectors<TDomain, TSnapshot>;
}

export function createRealtimeDomainStore<
  TDomain extends string,
  TSnapshot extends JsonObject,
>(
  definition: RealtimeDomainDefinition<TDomain, TSnapshot>,
): RealtimeDomainStoreBundle<TDomain, TSnapshot> {
  const connectRequested = createAction(
    '[' + definition.featureKey + '] Connect Requested',
    props<{ email: string }>(),
  );

  const disconnectRequested = createAction(
    '[' + definition.featureKey + '] Disconnect Requested',
  );

  const connected = createAction(
    '[' + definition.featureKey + '] Connected',
    props<{
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }>(),
  );

  const disconnected = createAction(
    '[' + definition.featureKey + '] Disconnected',
    props<{
      sourceKey: string;
      target: PollingSubscriptionTarget<TDomain>;
      receivedAt: string;
    }>(),
  );

  const snapshotReceived = createAction(
    '[' + definition.featureKey + '] Snapshot Received',
    props<{ envelope: PollingSnapshotEnvelope<TSnapshot, TDomain> }>(),
  );

  const patchReceived = createAction(
    '[' + definition.featureKey + '] Patch Received',
    props<{ envelope: PollingPatchEnvelope<TDomain> }>(),
  );

  const streamErrorReceived = createAction(
    '[' + definition.featureKey + '] Stream Error Received',
    props<{ envelope: PollingStreamErrorEnvelope<TDomain> }>(),
  );

  const initialState = createInitialFeatureState(definition);

  const reducer = createReducer(
    initialState,
    on(connectRequested, (state, { email }) => ({
      ...state,
      session: setConnectionState(
        createSessionState(definition.domain, email),
        'connecting',
        state.session.lastReceivedAt,
      ),
    })),
    on(connected, (state, { sourceKey, target, receivedAt }) => ({
      ...state,
      session: {
        ...state.session,
        sourceKey,
        target,
        connectionState: 'connected',
        lastReceivedAt: receivedAt,
        errorMessage: null,
      },
    })),
    on(disconnectRequested, (state) => ({
      ...state,
      session: setConnectionState(
        state.session,
        'disconnected',
        state.session.lastReceivedAt,
      ),
    })),
    on(disconnected, (state, { sourceKey, target, receivedAt }) => ({
      ...state,
      session: {
        ...state.session,
        sourceKey,
        target,
        connectionState: 'disconnected',
        lastReceivedAt: receivedAt,
      },
    })),
    on(snapshotReceived, (state, { envelope }) => ({
      ...state,
      session: {
        sourceKey: envelope.sourceKey,
        target: envelope.target,
        snapshot: envelope.snapshot,
        version: envelope.version,
        lastReceivedAt: envelope.receivedAt,
        lastPatchOperationCount: 0,
        connectionState: 'connected',
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
    on(patchReceived, (state, { envelope }) => ({
      ...state,
      session: applyPatchEnvelope(state.session, envelope),
      patchLog: appendPatchLog(state.patchLog, {
        version: envelope.version,
        receivedAt: envelope.receivedAt,
        kind: 'patch',
        operationCount: envelope.operations.length,
        message: describeOperations(envelope),
        paths: envelope.operations.slice(0, 4).map((operation) => operation.path),
      }),
    })),
    on(streamErrorReceived, (state, { envelope }) => ({
      ...state,
      session: {
        ...state.session,
        connectionState: 'error',
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
  );

  const selectFeatureState =
    createFeatureSelector<RealtimeDomainFeatureState<TSnapshot, TDomain>>(
      definition.featureKey,
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
    definition,
    actions: {
      connectRequested,
      disconnectRequested,
      connected,
      disconnected,
      snapshotReceived,
      patchReceived,
      streamErrorReceived,
    },
    reducer,
    selectors: {
      selectFeatureState,
      selectSession,
      selectSnapshot,
      selectPatchLog,
    },
  };
}

function createInitialFeatureState<TDomain extends string, TSnapshot extends JsonObject>(
  definition: RealtimeDomainDefinition<TDomain, TSnapshot>,
): RealtimeDomainFeatureState<TSnapshot, TDomain> {
  return {
    session: createSessionState(definition.domain, ''),
    patchLog: [],
  };
}

function createSessionState<TDomain extends string, TSnapshot extends JsonObject>(
  domain: TDomain,
  email: string,
): PollingSessionViewState<TSnapshot, TDomain> {
  const target = {
    domain,
    email,
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

function appendPatchLog(
  currentPatchLog: DomainPatchLogEntry[],
  patchLogEntry: DomainPatchLogEntry,
): DomainPatchLogEntry[] {
  return [patchLogEntry].concat(currentPatchLog).slice(0, 8);
}

function describeOperations<TDomain extends string>(
  envelope: PollingPatchEnvelope<TDomain>,
): string {
  const operationCounts = envelope.operations.reduce(
    (counts, operation) => {
      counts[operation.op] = (counts[operation.op] ?? 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );

  const parts = Object.keys(operationCounts).map((operationName) => {
    return operationName + ': ' + operationCounts[operationName];
  });

  return parts.join(' | ');
}
