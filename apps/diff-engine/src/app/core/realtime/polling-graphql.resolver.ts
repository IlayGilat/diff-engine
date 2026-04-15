import { Args, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PollingSubscriptionTarget } from '@org/models';
import { PollingSubscriptionStreamService } from './polling-subscription-stream.service';

@Resolver()
export class PollingGraphqlResolver {
  constructor(
    private readonly pollingSubscriptionStreamService: PollingSubscriptionStreamService,
  ) {}

  @Query(() => String)
  diffEngineStatus(): string {
    return 'ok';
  }

  @Subscription(() => String, {
    resolve: (payload: string) => payload,
  })
  pollingEvents(
    @Args('domain') domain: string,
    @Args('email') email: string,
  ): AsyncIterable<string> {
    const target: PollingSubscriptionTarget<string> = {
      domain,
      email,
    };

    return this.pollingSubscriptionStreamService.stream(target);
  }
}
