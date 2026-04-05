import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { randomUUID } from 'node:crypto';
import { AppController } from './app.controller';
import { DiffPatchService } from '../core/polling/engine/diff-patch.service';
import { PollingEngineService } from '../core/polling/engine/polling-engine.service';
import { SessionRegistryService } from '../core/polling/sessions/session-registry.service';
import { PollingEventPublisherService } from '../core/realtime/events/polling-event-publisher.service';
import { PollingGraphqlResolver } from '../core/realtime/graphql/polling-graphql.resolver';
import { POLLING_PUB_SUB } from '../core/realtime/events/polling-pub-sub.constants';
import { JsonObjectScalar } from '../core/realtime/scalars/json-object.scalar';
import { HotspotsPoller } from '../features/layers/pollers/hotspots.poller';
import { RegionsPoller } from '../features/layers/pollers/regions.poller';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      inject: [PollingEngineService],
      useFactory: (
        pollingEngineService: PollingEngineService,
      ) => ({
        driver: ApolloDriver,
        path: '/graphql',
        autoSchemaFile: true,
        subscriptions: {
          'graphql-ws': {
            onConnect: (context: any) => {
              const extra = (context.extra ?? {}) as Record<string, unknown>;
              extra.connectionId = randomUUID();
              context.extra = extra;
            },
            onDisconnect: async (context: any) => {
              const connectionId =
                typeof context.extra?.['connectionId'] === 'string'
                  ? (context.extra['connectionId'] as string)
                  : null;
              if (!connectionId) {
                return;
              }

              pollingEngineService.stopConnection(connectionId);
            },
          },
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: POLLING_PUB_SUB,
      useValue: new PubSub(),
    },
    DiffPatchService,
    HotspotsPoller,
    JsonObjectScalar,
    PollingEngineService,
    PollingEventPublisherService,
    PollingGraphqlResolver,
    RegionsPoller,
    SessionRegistryService,
  ],
})
export class AppModule {}
