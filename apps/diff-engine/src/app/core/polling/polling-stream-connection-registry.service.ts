import { Injectable } from '@nestjs/common';
import { PollingOrchestratorService } from './polling-orchestrator.service';

@Injectable()
export class PollingStreamConnectionRegistryService {
  private readonly subscriberCounts = new Map<string, number>();

  constructor(
    private readonly pollingOrchestratorService: PollingOrchestratorService,
  ) {}

  attach(streamId: string): void {
    const currentSubscriberCount = this.subscriberCounts.get(streamId) ?? 0;
    this.subscriberCounts.set(streamId, currentSubscriberCount + 1);

    if (currentSubscriberCount === 0) {
      this.pollingOrchestratorService.handleStreamConnected(streamId);
    }
  }

  detach(streamId: string): void {
    const currentSubscriberCount = this.subscriberCounts.get(streamId);
    if (!currentSubscriberCount) {
      return;
    }

    if (currentSubscriberCount === 1) {
      this.subscriberCounts.delete(streamId);
      this.pollingOrchestratorService.handleStreamDisconnected(streamId);
      return;
    }

    this.subscriberCounts.set(streamId, currentSubscriberCount - 1);
  }
}
