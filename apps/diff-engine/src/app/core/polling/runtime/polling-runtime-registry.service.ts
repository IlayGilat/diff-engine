import { Injectable } from '@nestjs/common';
import debounce from 'lodash/debounce';
import once from 'lodash/once';
import { DebouncedFunc } from 'lodash';

interface PollingRuntimeState {
  intervalId: NodeJS.Timeout | null;
  isPolling: boolean;
  terminationTask?: DebouncedFunc<() => void>;
  terminationScheduledAt: string | null;
}

@Injectable()
export class PollingRuntimeRegistryService {
  private readonly runtimeState = new Map<string, PollingRuntimeState>();

  register(sessionKey: string, intervalId: NodeJS.Timeout): void {
    const runtimeState = this.getOrCreate(sessionKey);
    if (runtimeState.intervalId) {
      clearInterval(runtimeState.intervalId);
    }

    runtimeState.intervalId = intervalId;
    runtimeState.isPolling = false;
    this.cancelTermination(sessionKey);
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

  pause(sessionKey: string): boolean {
    const runtimeState = this.runtimeState.get(sessionKey);
    if (!runtimeState?.intervalId) {
      return false;
    }

    clearInterval(runtimeState.intervalId);
    runtimeState.intervalId = null;
    runtimeState.isPolling = false;
    return true;
  }

  hasInterval(sessionKey: string): boolean {
    return Boolean(this.runtimeState.get(sessionKey)?.intervalId);
  }

  scheduleTermination(
    sessionKey: string,
    terminationCallback: () => void,
    waitMs: number,
  ): void {
    const runtimeState = this.getOrCreate(sessionKey);
    this.cancelTermination(sessionKey);

    const runTermination = once(() => {
      runtimeState.terminationScheduledAt = null;
      runtimeState.terminationTask = undefined;
      terminationCallback();
    });

    runtimeState.terminationTask = debounce(runTermination, waitMs);
    runtimeState.terminationScheduledAt = new Date().toISOString();
    runtimeState.terminationTask();
  }

  cancelTermination(sessionKey: string): boolean {
    const runtimeState = this.runtimeState.get(sessionKey);
    if (!runtimeState?.terminationTask) {
      return false;
    }

    runtimeState.terminationTask.cancel();
    runtimeState.terminationTask = undefined;
    runtimeState.terminationScheduledAt = null;
    return true;
  }

  getTerminationScheduledAt(sessionKey: string): string | null {
    return this.runtimeState.get(sessionKey)?.terminationScheduledAt ?? null;
  }

  clear(sessionKey: string): void {
    const runtimeState = this.runtimeState.get(sessionKey);
    if (!runtimeState) {
      return;
    }

    if (runtimeState.intervalId) {
      clearInterval(runtimeState.intervalId);
    }

    runtimeState.terminationTask?.cancel();
    this.runtimeState.delete(sessionKey);
  }

  private getOrCreate(sessionKey: string): PollingRuntimeState {
    const existingState = this.runtimeState.get(sessionKey);
    if (existingState) {
      return existingState;
    }

    const newState: PollingRuntimeState = {
      intervalId: null,
      isPolling: false,
      terminationScheduledAt: null,
    };

    this.runtimeState.set(sessionKey, newState);
    return newState;
  }
}
