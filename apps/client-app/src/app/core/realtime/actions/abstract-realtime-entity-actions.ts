import {
  JsonObject,
  RealtimeDomainActionGroup,
  RealtimeDomainDefinition,
  RealtimeFeatureKey,
} from '@org/models';
import { createRealtimeDomainDefinition } from '../factories/realtime-domain-definition.factory';
import { createRealtimeDomainActions } from '../factories/realtime-domain-actions.factory';

export abstract class AbstractRealtimeEntityActions<
  TDomain extends string,
  TSnapshot extends JsonObject,
> implements RealtimeDomainActionGroup<TDomain, TSnapshot>
{
  readonly definition: RealtimeDomainDefinition<TDomain>;
  readonly connectRequested: RealtimeDomainActionGroup<
    TDomain,
    TSnapshot
  >['connectRequested'];
  readonly disconnectRequested: RealtimeDomainActionGroup<
    TDomain,
    TSnapshot
  >['disconnectRequested'];
  readonly connected: RealtimeDomainActionGroup<TDomain, TSnapshot>['connected'];
  readonly disconnected: RealtimeDomainActionGroup<
    TDomain,
    TSnapshot
  >['disconnected'];
  readonly snapshotReceived: RealtimeDomainActionGroup<
    TDomain,
    TSnapshot
  >['snapshotReceived'];
  readonly patchReceived: RealtimeDomainActionGroup<
    TDomain,
    TSnapshot
  >['patchReceived'];
  readonly streamErrorReceived: RealtimeDomainActionGroup<
    TDomain,
    TSnapshot
  >['streamErrorReceived'];

  protected constructor(domain: TDomain, featureKey: RealtimeFeatureKey) {
    this.definition = createRealtimeDomainDefinition(domain, featureKey);

    const actionGroup = createRealtimeDomainActions<TDomain, TSnapshot>(featureKey);
    this.connectRequested = actionGroup.connectRequested;
    this.disconnectRequested = actionGroup.disconnectRequested;
    this.connected = actionGroup.connected;
    this.disconnected = actionGroup.disconnected;
    this.snapshotReceived = actionGroup.snapshotReceived;
    this.patchReceived = actionGroup.patchReceived;
    this.streamErrorReceived = actionGroup.streamErrorReceived;
  }
}
