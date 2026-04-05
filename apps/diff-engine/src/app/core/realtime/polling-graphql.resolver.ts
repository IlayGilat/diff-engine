import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { JsonObject, PollingSubscriptionTarget } from '@org/models';
import { PollingEngineService } from '../polling/services/polling-engine.service';
import { PollingEventPublisherService } from './polling-event-publisher.service';
import { JsonObjectScalar } from './scalars/json-object.scalar';

@Resolver()
export class PollingGraphqlResolver {
  constructor(
    private readonly pollingEngineService: PollingEngineService,
    private readonly pollingEventPublisherService: PollingEventPublisherService,
  ) {}

  // Returns a small health signal for local checks.
  @Query(() => String)
  diffEngineStatus(): string {
    return 'ok';
  }

  // Starts one stream and returns the first full snapshot.
  @Mutation(() => String)
  async startPolling(
    @Args('streamId') streamId: string,
    @Args('domain') domain: string,
    @Args('params', { type: () => JsonObjectScalar }) params: JsonObject,
    @Context() context?: { extra?: Record<string, unknown> },
  ): Promise<string> {
    const target: PollingSubscriptionTarget<string> = {
      streamId,
      domain,
      params,
    };
    const connectionId = this.readConnectionId(context);

    const envelope = await this.pollingEngineService.startSession(
      target,
      connectionId,
    );
    return JSON.stringify(envelope);
  }

  // Stops one active stream and clears its runtime state.
  @Mutation(() => Boolean)
  stopPolling(
    @Args('streamId') streamId: string,
  ): boolean {
    return this.pollingEngineService.stopSession(streamId);
  }

  // Refreshes the TTL so healthy streams do not expire.
  @Mutation(() => Boolean)
  heartbeat(@Args('streamId') streamId: string): boolean {
    return this.pollingEngineService.refreshSession(streamId);
  }

  @Subscription(() => String, {
    resolve: (payload: { pollingEvents: unknown }) =>
      JSON.stringify(payload.pollingEvents),
  })
  pollingEvents(
    @Args('streamId') streamId: string,
  ): AsyncIterable<unknown> {
    return this.pollingEventPublisherService.createAsyncIterator(streamId);
  }

  // Reads the websocket connection id when a mutation comes through graphql-ws.
  private readConnectionId(
    context?: { extra?: Record<string, unknown> },
  ): string | undefined {
    const connectionId = context?.extra?.['connectionId'];
    return typeof connectionId === 'string' ? connectionId : undefined;
  }
}
