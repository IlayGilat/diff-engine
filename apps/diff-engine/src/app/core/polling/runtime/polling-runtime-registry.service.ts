import { Dictionary, PollingRuntimeState } from '@org/models';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PollingRuntimeRegistryService {
  private readonly runtimeState: Dictionary<PollingRuntimeState> = {};

  register(sessionKey: string, intervalId: ReturnType<typeof setInterval>): void {
    this.runtimeState[sessionKey] = {
      intervalId,
      isPolling: false,
    };
  }

  tryBeginPolling(sessionKey: string): boolean {
    const runtimeState = this.runtimeState[sessionKey];
    if (!runtimeState || runtimeState.isPolling) {
      return false;
    }

    runtimeState.isPolling = true;
    return true;
  }

  endPolling(sessionKey: string): void {
    const runtimeState = this.runtimeState[sessionKey];
    if (runtimeState) {
      runtimeState.isPolling = false;
    }
  }

  clear(sessionKey: string): void {
    const runtimeState = this.runtimeState[sessionKey];
    if (!runtimeState) {
      return;
    }

    clearInterval(runtimeState.intervalId);
    delete this.runtimeState[sessionKey];
  }
}
