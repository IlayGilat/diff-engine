import { Inject, Injectable } from '@nestjs/common';
import { JsonObject, RealtimeDomainClientEvent } from '@org/models';
import { PubSub } from 'graphql-subscriptions';
import { POLLING_PUB_SUB } from './polling-pub-sub.constants';

@Injectable()
export class PollingEventPublisherService {
  constructor(
    @Inject(POLLING_PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async publish(
    streamId: string,
    event: RealtimeDomainClientEvent<JsonObject, string>,
  ): Promise<void> {
    await this.pubSub.publish(this.buildTopic(streamId), {
      pollingEvents: event,
    });
  }

  createAsyncIterator(streamId: string): AsyncIterable<unknown> {
    return this.pubSub.asyncIterableIterator(this.buildTopic(streamId));
  }

  private buildTopic(streamId: string): string {
    return 'polling-events:' + streamId;
  }
}
