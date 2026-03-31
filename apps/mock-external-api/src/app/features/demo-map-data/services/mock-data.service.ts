import { Injectable } from '@nestjs/common';
import {
  Dictionary,
  DemoMapLayerDomain,
  EmailLayerState,
  HotspotsLayerSnapshot,
  RegionsLayerSnapshot,
} from '@org/models';
import { DemoMapFeatureFactory } from '../factories/demo-map-feature.factory';
import { DemoMapRandomFactory } from '../factories/demo-map-random.factory';

const INITIAL_REGION_COUNT = 18;
const INITIAL_HOTSPOT_COUNT = 30;
const MIN_REGION_COUNT = 8;
const MAX_REGION_COUNT = 30;
const MIN_HOTSPOT_COUNT = 12;
const MAX_HOTSPOT_COUNT = 44;

@Injectable()
export class MockDataService {
  private readonly states: Dictionary<EmailLayerState> = {};

  constructor(
    private readonly demoMapFeatureFactory: DemoMapFeatureFactory,
    private readonly demoMapRandomFactory: DemoMapRandomFactory,
  ) {}

  getData(
    email: string,
    domain: DemoMapLayerDomain,
  ): RegionsLayerSnapshot | HotspotsLayerSnapshot {
    const state = this.getOrCreateState(email);
    state.requestCount += 1;

    this.mutateRegions(state.regions, state.requestCount);
    this.mutateHotspots(state.hotspots, state.requestCount);

    return domain === 'regions'
      ? structuredClone(state.regions)
      : structuredClone(state.hotspots);
  }

  private getOrCreateState(email: string): EmailLayerState {
    const existingState = this.states[email];
    if (existingState) {
      return existingState;
    }

    const createdState = this.createState(email);
    this.states[email] = createdState;
    return createdState;
  }

  private createState(email: string): EmailLayerState {
    const seededRandom = this.demoMapRandomFactory.createSeededRandom(email);
    const now = new Date().toISOString();

    return {
      requestCount: 0,
      regions: {
        meta: {
          ownerEmail: email,
          domain: 'regions',
          generatedAt: now,
          lastUpdated: now,
          requestCount: 0,
        },
        features: Array.from({ length: INITIAL_REGION_COUNT }, (_, index) =>
          this.demoMapFeatureFactory.createPolygonFeature(index + 1, seededRandom),
        ),
      },
      hotspots: {
        meta: {
          ownerEmail: email,
          domain: 'hotspots',
          generatedAt: now,
          lastUpdated: now,
          requestCount: 0,
        },
        features: Array.from({ length: INITIAL_HOTSPOT_COUNT }, (_, index) =>
          this.demoMapFeatureFactory.createCircleFeature(index + 1, seededRandom),
        ),
      },
    };
  }

  private mutateRegions(snapshot: RegionsLayerSnapshot, requestCount: number): void {
    const now = new Date().toISOString();
    snapshot.meta.lastUpdated = now;
    snapshot.meta.requestCount = requestCount;
    const randomSource = this.demoMapRandomFactory.createRuntimeRandom();

    snapshot.features = snapshot.features.map((feature, index) =>
      this.demoMapRandomFactory.chance(randomSource, 0.22)
        ? this.createRandomRegionFeature(snapshot, requestCount + index, randomSource)
        : this.demoMapFeatureFactory.mutatePolygonFeature(feature, randomSource),
    );

    if (requestCount % 2 === 0) {
      snapshot.features = this.replaceRandomRegions(
        snapshot,
        requestCount,
        randomSource,
      );
    }

    if (requestCount % 3 === 0) {
      this.addRandomRegions(snapshot, requestCount, randomSource);
    }

    if (requestCount % 4 === 0) {
      this.removeRandomRegions(snapshot, randomSource);
    }

    if (requestCount % 5 === 0) {
      snapshot.features = this.demoMapRandomFactory.shuffle(
        randomSource,
        snapshot.features,
      );
    }
  }

  private mutateHotspots(snapshot: HotspotsLayerSnapshot, requestCount: number): void {
    const now = new Date().toISOString();
    snapshot.meta.lastUpdated = now;
    snapshot.meta.requestCount = requestCount;
    const randomSource = this.demoMapRandomFactory.createRuntimeRandom();

    snapshot.features = snapshot.features.map((feature, index) =>
      this.demoMapRandomFactory.chance(randomSource, 0.28)
        ? this.createRandomHotspotFeature(
            snapshot,
            requestCount + index,
            randomSource,
          )
        : this.demoMapFeatureFactory.mutateCircleFeature(feature, randomSource),
    );

    if (requestCount % 2 === 0) {
      snapshot.features = this.replaceRandomHotspots(
        snapshot,
        requestCount,
        randomSource,
      );
    }

    if (requestCount % 3 === 0) {
      this.addRandomHotspots(snapshot, requestCount, randomSource);
    }

    if (requestCount % 4 === 0) {
      this.removeRandomHotspots(snapshot, randomSource);
    }

    if (requestCount % 5 === 0) {
      snapshot.features = this.demoMapRandomFactory.shuffle(
        randomSource,
        snapshot.features,
      );
    }
  }

  private replaceRandomRegions(
    snapshot: RegionsLayerSnapshot,
    requestCount: number,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ): RegionsLayerSnapshot['features'] {
    const replaceCount = Math.min(
      snapshot.features.length,
      this.demoMapRandomFactory.intBetween(randomSource, 1, 3),
    );
    const indexes = this.pickIndexes(
      snapshot.features.length,
      replaceCount,
      randomSource,
    );

    return snapshot.features.map((feature, index) =>
      indexes.includes(index)
        ? this.createRandomRegionFeature(snapshot, requestCount + index + 100, randomSource)
        : feature,
    );
  }

  private replaceRandomHotspots(
    snapshot: HotspotsLayerSnapshot,
    requestCount: number,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ): HotspotsLayerSnapshot['features'] {
    const replaceCount = Math.min(
      snapshot.features.length,
      this.demoMapRandomFactory.intBetween(randomSource, 1, 4),
    );
    const indexes = this.pickIndexes(
      snapshot.features.length,
      replaceCount,
      randomSource,
    );

    return snapshot.features.map((feature, index) =>
      indexes.includes(index)
        ? this.createRandomHotspotFeature(
            snapshot,
            requestCount + index + 200,
            randomSource,
          )
        : feature,
    );
  }

  private addRandomRegions(
    snapshot: RegionsLayerSnapshot,
    requestCount: number,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ): void {
    const availableSlots = MAX_REGION_COUNT - snapshot.features.length;
    if (availableSlots <= 0) {
      return;
    }

    const addCount = Math.min(
      availableSlots,
      this.demoMapRandomFactory.intBetween(randomSource, 1, 3),
    );

    for (let index = 0; index < addCount; index += 1) {
      snapshot.features.push(
        this.createRandomRegionFeature(snapshot, requestCount + index + 300, randomSource),
      );
    }
  }

  private addRandomHotspots(
    snapshot: HotspotsLayerSnapshot,
    requestCount: number,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ): void {
    const availableSlots = MAX_HOTSPOT_COUNT - snapshot.features.length;
    if (availableSlots <= 0) {
      return;
    }

    const addCount = Math.min(
      availableSlots,
      this.demoMapRandomFactory.intBetween(randomSource, 1, 5),
    );

    for (let index = 0; index < addCount; index += 1) {
      snapshot.features.push(
        this.createRandomHotspotFeature(
          snapshot,
          requestCount + index + 400,
          randomSource,
        ),
      );
    }
  }

  private removeRandomRegions(
    snapshot: RegionsLayerSnapshot,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ): void {
    const removableCount = snapshot.features.length - MIN_REGION_COUNT;
    if (removableCount <= 0) {
      return;
    }

    const removeCount = Math.min(
      removableCount,
      this.demoMapRandomFactory.intBetween(randomSource, 1, 3),
    );
    const indexes = this.pickIndexes(
      snapshot.features.length,
      removeCount,
      randomSource,
    );

    snapshot.features = snapshot.features.filter(
      (_feature, index) => !indexes.includes(index),
    );
  }

  private removeRandomHotspots(
    snapshot: HotspotsLayerSnapshot,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ): void {
    const removableCount = snapshot.features.length - MIN_HOTSPOT_COUNT;
    if (removableCount <= 0) {
      return;
    }

    const removeCount = Math.min(
      removableCount,
      this.demoMapRandomFactory.intBetween(randomSource, 1, 4),
    );
    const indexes = this.pickIndexes(
      snapshot.features.length,
      removeCount,
      randomSource,
    );

    snapshot.features = snapshot.features.filter(
      (_feature, index) => !indexes.includes(index),
    );
  }

  private createRandomRegionFeature(
    snapshot: RegionsLayerSnapshot,
    seedOffset: number,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ) {
    const featureId = this.demoMapRandomFactory.intBetween(randomSource, 1000, 999999);

    return this.demoMapFeatureFactory.createPolygonFeature(
      featureId + seedOffset + snapshot.meta.requestCount,
      this.demoMapRandomFactory.createSeededRandom(
        snapshot.meta.ownerEmail +
          '-regions-' +
          snapshot.meta.requestCount +
          '-' +
          featureId,
      ),
    );
  }

  private createRandomHotspotFeature(
    snapshot: HotspotsLayerSnapshot,
    seedOffset: number,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ) {
    const featureId = this.demoMapRandomFactory.intBetween(randomSource, 1000, 999999);

    return this.demoMapFeatureFactory.createCircleFeature(
      featureId + seedOffset + snapshot.meta.requestCount,
      this.demoMapRandomFactory.createSeededRandom(
        snapshot.meta.ownerEmail +
          '-hotspots-' +
          snapshot.meta.requestCount +
          '-' +
          featureId,
      ),
    );
  }

  private pickIndexes(
    length: number,
    count: number,
    randomSource: ReturnType<DemoMapRandomFactory['createRuntimeRandom']>,
  ): number[] {
    const availableIndexes = Array.from({ length }, (_value, index) => index);

    return this.demoMapRandomFactory
      .shuffle(randomSource, availableIndexes)
      .slice(0, count);
  }
}
