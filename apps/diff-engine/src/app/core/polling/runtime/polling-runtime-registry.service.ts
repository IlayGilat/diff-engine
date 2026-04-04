import { Dictionary, PollingRuntimeState } from '@org/models';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PollingRuntimeRegistryService {
  private readonly runtimeState: Dictionary<PollingRuntimeState> = {};

  register(sessionKey: string, intervalId: ReturnType<typeof setInterval>): void {
    this.runtimeState[sessionKey] = {
      intervalId,
      destroyTimeoutId: null,
      isPolling: false,
      lifecycle: 'active',
    };
  }

  resume(sessionKey: string, intervalId: ReturnType<typeof setInterval>): void {
    const runtimeState = this.runtimeState[sessionKey];
    if (!runtimeState) {
      this.register(sessionKey, intervalId);
      return;
    }

    if (runtimeState.intervalId) {
      clearInterval(runtimeState.intervalId);
    }

    if (runtimeState.destroyTimeoutId) {
      clearTimeout(runtimeState.destroyTimeoutId);
    }

    runtimeState.intervalId = intervalId;
    runtimeState.destroyTimeoutId = null;
    runtimeState.isPolling = false;
    runtimeState.lifecycle = 'active';
  }

  tryBeginPolling(sessionKey: string): boolean {
    const runtimeState = this.runtimeState[sessionKey];
    if (
      !runtimeState ||
      runtimeState.isPolling ||
      runtimeState.lifecycle !== 'active'
    ) {
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

  pause(
    sessionKey: string,
    destroyAfterGracePeriod: () => void,
    gracePeriodMs: number,
  ): boolean {
    const runtimeState = this.runtimeState[sessionKey];
    if (!runtimeState) {
      return false;
    }

    if (runtimeState.intervalId) {
      clearInterval(runtimeState.intervalId);
    }

    if (runtimeState.destroyTimeoutId) {
      clearTimeout(runtimeState.destroyTimeoutId);
    }

    runtimeState.intervalId = null;
    runtimeState.destroyTimeoutId = setTimeout(() => {
      destroyAfterGracePeriod();
      this.clear(sessionKey);
    }, gracePeriodMs);
    runtimeState.isPolling = false;
    runtimeState.lifecycle = 'paused';
    return true;
  }

  isActive(sessionKey: string): boolean {
    return this.runtimeState[sessionKey]?.lifecycle === 'active';
  }

  clear(sessionKey: string): void {
    const runtimeState = this.runtimeState[sessionKey];
    if (!runtimeState) {
      return;
    }

    if (runtimeState.intervalId) {
      clearInterval(runtimeState.intervalId);
    }

    if (runtimeState.destroyTimeoutId) {
      clearTimeout(runtimeState.destroyTimeoutId);
    }

    delete this.runtimeState[sessionKey];
  }
}
