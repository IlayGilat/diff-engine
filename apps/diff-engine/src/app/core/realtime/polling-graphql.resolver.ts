import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PollingSubscriptionTarget } from '@org/models';
import { PollingOrchestratorService } from '../polling/polling-orchestrator.service';
import { PollingEventPublisherService } from './polling-event-publisher.service';

@Resolver()
export class PollingGraphqlResolver {
  constructor(
    private readonly pollingOrchestratorService: PollingOrchestratorService,
    private readonly pollingEventPublisherService: PollingEventPublisherService,
  ) {}

  @Query(() => String)
  diffEngineStatus(): string {
    return 'ok';
  }

  @Mutation(() => String)
  async startPolling(
    @Args('streamId') streamId: string,
    @Args('domain') domain: string,
    @Args('email') email: string,
  ): Promise<string> {
    const target: PollingSubscriptionTarget<string> = {
      domain,
      email,
    };

    const envelope = await this.pollingOrchestratorService.start(streamId, target);
    return JSON.stringify(envelope);
  }

  @Mutation(() => Boolean)
  stopPolling(
    @Args('streamId') streamId: string,
    @Args('domain') domain: string,
  ): boolean {
    return this.pollingOrchestratorService.stopDomain(streamId, {
      domain,
    });
  }

  @Subscription(() => String, {
    resolve: (payload: { pollingEvents: unknown }) =>
      JSON.stringify(payload.pollingEvents),
  })
  pollingEvents(@Args('streamId') streamId: string): AsyncIterable<unknown> {
    return this.pollingEventPublisherService.createAsyncIterator(streamId);
  }
}
