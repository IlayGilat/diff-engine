import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PollingSubscriptionTarget } from '@org/models';
import { PollingOrchestratorService } from '../polling/services/polling-orchestrator.service';
import { PollingConnectionRegistryService } from './polling-connection-registry.service';
import { PollingEventPublisherService } from './polling-event-publisher.service';

@Resolver()
export class PollingGraphqlResolver {
  constructor(
    private readonly pollingOrchestratorService: PollingOrchestratorService,
    private readonly pollingConnectionRegistryService: PollingConnectionRegistryService,
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

  @Mutation(() => String)
  async resumePolling(
    @Args('streamId') streamId: string,
    @Args('domain') domain: string,
    @Args('email') email: string,
    @Args('lastKnownHash', { nullable: true }) lastKnownHash?: string,
  ): Promise<string> {
    const target: PollingSubscriptionTarget<string> = {
      domain,
      email,
    };

    const envelope = await this.pollingOrchestratorService.resume(
      streamId,
      target,
      lastKnownHash,
    );
    return JSON.stringify(envelope);
  }

  @Mutation(() => Boolean)
  stopPolling(
    @Args('streamId') streamId: string,
    @Args('domain') domain: string,
  ): boolean {
    this.pollingConnectionRegistryService.removeStream(streamId);
    return this.pollingOrchestratorService.stopDomain(streamId, {
      domain,
    });
  }

  @Subscription(() => String, {
    resolve: (payload: { pollingEvents: unknown }) =>
      JSON.stringify(payload.pollingEvents),
  })
  pollingEvents(
    @Args('streamId') streamId: string,
    @Context() context?: { extra?: Record<string, unknown> },
  ): AsyncIterable<unknown> {
    const connectionId = context?.extra?.['connectionId'];
    if (typeof connectionId === 'string') {
      this.pollingConnectionRegistryService.registerStream(connectionId, streamId);
    }

    return this.pollingEventPublisherService.createAsyncIterator(streamId);
  }
}
