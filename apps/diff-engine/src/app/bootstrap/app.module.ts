import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { PollingDomainRegistryService } from '../core/polling/services/polling-domain-registry.service';
import { DiffPatchService } from '../core/polling/services/diff-patch.service';
import { PollingGraphqlResolver } from '../core/realtime/polling-graphql.resolver';
import { PollingSubscriptionStreamService } from '../core/realtime/polling-subscription-stream.service';
import { HotspotsDomainSourceService } from '../features/layers/services/hotspots-domain-source.service';
import { RegionsDomainSourceService } from '../features/layers/services/regions-domain-source.service';

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
    DiffPatchService,
    HotspotsDomainSourceService,
    PollingDomainRegistryService,
    PollingGraphqlResolver,
    PollingSubscriptionStreamService,
    RegionsDomainSourceService,
  ],
})
export class AppModule {}
