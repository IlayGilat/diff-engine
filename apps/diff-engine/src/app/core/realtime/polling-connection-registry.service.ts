import { Dictionary } from '@org/models';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PollingConnectionRegistryService {
  private readonly streamIdsByConnectionId: Dictionary<Set<string>> = {};

  registerStream(connectionId: string, streamId: string): void {
    const activeStreams =
      this.streamIdsByConnectionId[connectionId] ?? new Set<string>();
    activeStreams.add(streamId);
    this.streamIdsByConnectionId[connectionId] = activeStreams;
  }

  releaseConnection(connectionId: string): string[] {
    const activeStreams = this.streamIdsByConnectionId[connectionId];
    if (!activeStreams) {
      return [];
    }

    delete this.streamIdsByConnectionId[connectionId];
    return Array.from(activeStreams);
  }

  removeStream(streamId: string): void {
    Object.keys(this.streamIdsByConnectionId).forEach((connectionId) => {
      const activeStreams = this.streamIdsByConnectionId[connectionId];
      if (!activeStreams) {
        return;
      }

      activeStreams.delete(streamId);
      if (activeStreams.size === 0) {
        delete this.streamIdsByConnectionId[connectionId];
      }
    });
  }
}
