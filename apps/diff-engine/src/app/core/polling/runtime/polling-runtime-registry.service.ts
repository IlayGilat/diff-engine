import { Injectable } from '@nestjs/common';

interface PollingRuntimeState {
  intervalId: NodeJS.Timeout;
  isPolling: boolean;
}

@Injectable()
export class PollingRuntimeRegistryService {
  private readonly runtimeState = new Map<string, PollingRuntimeState>();

  register(sessionKey: string, intervalId: NodeJS.Timeout): void {
    this.runtimeState.set(sessionKey, {
      intervalId,
      isPolling: false,
    });
  }

  tryBeginPolling(sessionKey: string): boolean {
    const runtimeState = this.runtimeState.get(sessionKey);
    if (!runtimeState || runtimeState.isPolling) {
      return false;
    }

    runtimeState.isPolling = true;
    return true;
  }

  endPolling(sessionKey: string): void {
    const runtimeState = this.runtimeState.get(sessionKey);
    if (runtimeState) {
      runtimeState.isPolling = false;
    }
  }

  clear(sessionKey: string): void {
    const runtimeState = this.runtimeState.get(sessionKey);
    if (!runtimeState) {
      return;
    }

    clearInterval(runtimeState.intervalId);
    this.runtimeState.delete(sessionKey);
  }
}
