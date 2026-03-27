import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PollingDomainRegistryService } from './core/polling/polling-domain-registry.service';
import { DiffPatchService } from './core/polling/diff-patch.service';
import { PollingOrchestratorService } from './core/polling/polling-orchestrator.service';
import { PollingRuntimeRegistryService } from './core/polling/runtime/polling-runtime-registry.service';
import { InMemorySnapshotStoreAdapter } from './core/polling/store/adapters/in-memory-snapshot-store.adapter';
import { SnapshotStoreAdapterBuilder } from './core/polling/store/builders/snapshot-store-adapter.builder';
import { SnapshotSessionStoreService } from './core/polling/store/snapshot-session-store.service';
import { RealtimeGateway } from './core/socket/realtime.gateway';
import { ActivityExternalSourceService } from './domains/activity/activity-external-source.service';
import { OverviewExternalSourceService } from './domains/overview/overview-external-source.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    RealtimeGateway,
    ActivityExternalSourceService,
    DiffPatchService,
    OverviewExternalSourceService,
    PollingDomainRegistryService,
    PollingOrchestratorService,
    PollingRuntimeRegistryService,
    InMemorySnapshotStoreAdapter,
    SnapshotStoreAdapterBuilder,
    SnapshotSessionStoreService,
  ],
})
export class AppModule {}
