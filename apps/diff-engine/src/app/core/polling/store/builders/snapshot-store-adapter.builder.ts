import { Injectable } from '@nestjs/common';
import { InMemorySnapshotStoreAdapter } from '../adapters/in-memory-snapshot-store.adapter';
import { SnapshotStoreAdapter } from '../adapters/snapshot-store.adapter';

@Injectable()
export class SnapshotStoreAdapterBuilder {
  constructor(
    private readonly inMemorySnapshotStoreAdapter: InMemorySnapshotStoreAdapter,
  ) {}

  build(): SnapshotStoreAdapter {
    return this.inMemorySnapshotStoreAdapter;
  }
}
