import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { AppController } from './app.controller';
import { PollingDomainRegistryService } from './core/polling/polling-domain-registry.service';
import { DiffPatchService } from './core/polling/diff-patch.service';
import { PollingOrchestratorService } from './core/polling/polling-orchestrator.service';
import { PollingRuntimeRegistryService } from './core/polling/runtime/polling-runtime-registry.service';
import { InMemorySnapshotStoreAdapter } from './core/polling/store/adapters/in-memory-snapshot-store.adapter';
import { SnapshotStoreAdapterBuilder } from './core/polling/store/builders/snapshot-store-adapter.builder';
import { SnapshotSessionStoreService } from './core/polling/store/snapshot-session-store.service';
import { PollingEventPublisherService } from './core/realtime/polling-event-publisher.service';
import { PollingGraphqlResolver } from './core/realtime/polling-graphql.resolver';
import { POLLING_PUB_SUB } from './core/realtime/polling-pub-sub.constants';
import { ActivityDomainSourceService } from './domains/activity/activity-domain-source.service';
import { OverviewDomainSourceService } from './domains/overview/overview-domain-source.service';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql',
      autoSchemaFile: true,
      subscriptions: {
        'graphql-ws': true,
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: POLLING_PUB_SUB,
      useValue: new PubSub(),
    },
    ActivityDomainSourceService,
    DiffPatchService,
    OverviewDomainSourceService,
    PollingDomainRegistryService,
    PollingEventPublisherService,
    PollingGraphqlResolver,
    PollingOrchestratorService,
    PollingRuntimeRegistryService,
    InMemorySnapshotStoreAdapter,
    SnapshotStoreAdapterBuilder,
    SnapshotSessionStoreService,
  ],
})
export class AppModule {}
