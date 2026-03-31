import { Injectable } from '@nestjs/common';
import {
  DemoMapLayerDomain,
  HotspotsLayerSnapshot,
  RegionsLayerSnapshot,
} from '@org/models';
import { DemoMapFeatureFactory } from '../factories/demo-map-feature.factory';
import { DemoMapRandomFactory } from '../factories/demo-map-random.factory';

interface EmailLayerState {
  requestCount: number;
  regions: RegionsLayerSnapshot;
  hotspots: HotspotsLayerSnapshot;
}

const INITIAL_REGION_COUNT = 18;
const INITIAL_HOTSPOT_COUNT = 30;
const MIN_REGION_COUNT = 14;
const MAX_REGION_COUNT = 24;
const MIN_HOTSPOT_COUNT = 24;
const MAX_HOTSPOT_COUNT = 36;

@Injectable()
export class MockDataService {
  private readonly states = new Map<string, EmailLayerState>();

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
    const existingState = this.states.get(email);
    if (existingState) {
      return existingState;
    }

    const createdState = this.createState(email);
    this.states.set(email, createdState);
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

    snapshot.features = snapshot.features.map((feature) =>
      this.demoMapFeatureFactory.mutatePolygonFeature(feature, randomSource),
    );

    if (requestCount % 3 === 0 && snapshot.features.length < MAX_REGION_COUNT) {
      snapshot.features.push(
        this.demoMapFeatureFactory.createPolygonFeature(
          100 + requestCount,
          this.demoMapRandomFactory.createSeededRandom(
            snapshot.meta.ownerEmail + '-regions-' + requestCount,
          ),
        ),
      );
    }

    if (requestCount % 5 === 0 && snapshot.features.length > MIN_REGION_COUNT) {
      snapshot.features.pop();
    }
  }

  private mutateHotspots(snapshot: HotspotsLayerSnapshot, requestCount: number): void {
    const now = new Date().toISOString();
    snapshot.meta.lastUpdated = now;
    snapshot.meta.requestCount = requestCount;
    const randomSource = this.demoMapRandomFactory.createRuntimeRandom();

    snapshot.features = snapshot.features.map((feature) =>
      this.demoMapFeatureFactory.mutateCircleFeature(feature, randomSource),
    );

    if (requestCount % 3 === 0 && snapshot.features.length < MAX_HOTSPOT_COUNT) {
      snapshot.features.push(
        this.demoMapFeatureFactory.createCircleFeature(
          200 + requestCount,
          this.demoMapRandomFactory.createSeededRandom(
            snapshot.meta.ownerEmail + '-hotspots-' + requestCount,
          ),
        ),
      );
    }

    if (requestCount % 5 === 0 && snapshot.features.length > MIN_HOTSPOT_COUNT) {
      snapshot.features.pop();
    }
  }
}
