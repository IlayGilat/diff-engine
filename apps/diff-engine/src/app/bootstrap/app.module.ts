import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { randomUUID } from 'node:crypto';
import { AppController } from './app.controller';
import { PollingDomainRegistryService } from '../core/polling/services/polling-domain-registry.service';
import { DiffPatchService } from '../core/polling/services/diff-patch.service';
import { PollingOrchestratorService } from '../core/polling/services/polling-orchestrator.service';
import { PollingRuntimeRegistryService } from '../core/polling/runtime/polling-runtime-registry.service';
import { InMemorySnapshotStoreAdapter } from '../core/polling/store/adapters/in-memory-snapshot-store.adapter';
import { SnapshotStoreAdapterBuilder } from '../core/polling/store/builders/snapshot-store-adapter.builder';
import { SnapshotSessionStoreService } from '../core/polling/store/services/snapshot-session-store.service';
import { PollingConnectionRegistryService } from '../core/realtime/polling-connection-registry.service';
import { PollingEventPublisherService } from '../core/realtime/polling-event-publisher.service';
import { PollingGraphqlResolver } from '../core/realtime/polling-graphql.resolver';
import { POLLING_PUB_SUB } from '../core/realtime/polling-pub-sub.constants';
import { HotspotsDomainSourceService } from '../features/layers/services/hotspots-domain-source.service';
import { RegionsDomainSourceService } from '../features/layers/services/regions-domain-source.service';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      inject: [PollingConnectionRegistryService, PollingOrchestratorService],
      useFactory: (
        pollingConnectionRegistryService: PollingConnectionRegistryService,
        pollingOrchestratorService: PollingOrchestratorService,
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

              const streamIds =
                pollingConnectionRegistryService.releaseConnection(connectionId);
              pollingOrchestratorService.pauseStreams(streamIds);
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
    HotspotsDomainSourceService,
    PollingConnectionRegistryService,
    PollingDomainRegistryService,
    PollingEventPublisherService,
    PollingGraphqlResolver,
    PollingOrchestratorService,
    PollingRuntimeRegistryService,
    RegionsDomainSourceService,
    InMemorySnapshotStoreAdapter,
    SnapshotStoreAdapterBuilder,
    SnapshotSessionStoreService,
  ],
})
export class AppModule {}
