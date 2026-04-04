import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PollingRuntimeRegistryService } from './polling-runtime-registry.service';

describe('PollingRuntimeRegistryService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should pause polling during the grace period and reactivate on resume', async () => {
    const service = new PollingRuntimeRegistryService();
    const sessionKey = 'stream-1::regions';

    service.register(sessionKey, setInterval(() => undefined, 1_000));
    expect(service.tryBeginPolling(sessionKey)).toBe(true);

    service.endPolling(sessionKey);
    const destroySpy = vi.fn();
    expect(service.pause(sessionKey, destroySpy, 15_000)).toBe(true);
    expect(service.tryBeginPolling(sessionKey)).toBe(false);

    await vi.advanceTimersByTimeAsync(14_999);
    expect(destroySpy).not.toHaveBeenCalled();

    service.resume(sessionKey, setInterval(() => undefined, 1_000));
    expect(service.isActive(sessionKey)).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(destroySpy).not.toHaveBeenCalled();

    service.clear(sessionKey);
  });
});
