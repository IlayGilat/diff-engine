import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PollingSubscriptionTarget } from '@org/models';
import { GraphQLError } from 'graphql';
import once from 'lodash/once';
import { PollingOrchestratorService } from '../polling/polling-orchestrator.service';
import { PollingStreamConnectionRegistryService } from '../polling/polling-stream-connection-registry.service';
import { PollingEventPublisherService } from './polling-event-publisher.service';

@Resolver()
export class PollingGraphqlResolver {
  constructor(
    private readonly pollingOrchestratorService: PollingOrchestratorService,
    private readonly pollingStreamConnectionRegistryService: PollingStreamConnectionRegistryService,
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

    const result = await this.pollingOrchestratorService.start(streamId, target);
    if (result.isFail()) {
      const error = result.error();
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.code,
          meta: result.metaData(),
        },
      });
    }

    return JSON.stringify(result.value());
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
    this.pollingStreamConnectionRegistryService.attach(streamId);
    const iterator = this.pollingEventPublisherService
      .createAsyncIterator(streamId)
      [Symbol.asyncIterator]();
    const detach = once(() => {
      this.pollingStreamConnectionRegistryService.detach(streamId);
    });

    const wrappedIterator: AsyncIterator<unknown> & AsyncIterable<unknown> = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next: () => iterator.next(),
      return: async (value?: unknown) => {
        detach();
        if (typeof iterator.return === 'function') {
          return iterator.return(value);
        }

        return {
          done: true,
          value,
        };
      },
      throw: async (error?: unknown) => {
        detach();
        if (typeof iterator.throw === 'function') {
          return iterator.throw(error);
        }

        throw error;
      },
    };

    return wrappedIterator;
  }
}
