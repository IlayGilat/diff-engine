import { Injectable } from '@nestjs/common';
import {
  DEMO_MAP_WORLD_BOUNDS,
  DemoMapLayerDomain,
  GeoCircleFeature,
  GeoFeatureStatus,
  GeoPoint,
  GeoPolygonFeature,
  HotspotsLayerSnapshot,
  RegionsLayerSnapshot,
} from '@org/models';

interface EmailLayerState {
  requestCount: number;
  regions: RegionsLayerSnapshot;
  hotspots: HotspotsLayerSnapshot;
}

@Injectable()
export class MockDataService {
  private readonly states = new Map<string, EmailLayerState>();

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
    const seededRandom = this.createSeededRandom(email);
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
        features: Array.from({ length: 5 }, (_, index) =>
          this.createPolygonFeature(index + 1, seededRandom),
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
        features: Array.from({ length: 8 }, (_, index) =>
          this.createCircleFeature(index + 1, seededRandom),
        ),
      },
    };
  }

  private mutateRegions(snapshot: RegionsLayerSnapshot, requestCount: number): void {
    const now = new Date().toISOString();
    snapshot.meta.lastUpdated = now;
    snapshot.meta.requestCount = requestCount;

    snapshot.features = snapshot.features.map((feature) => {
      const nextIntensity = this.clampNumber(
        feature.intensity + this.randomBetween(-12, 18),
        18,
        100,
      );

      return {
        ...feature,
        intensity: nextIntensity,
        status: this.resolveStatus(nextIntensity),
        fill: this.resolvePolygonFill(nextIntensity),
        stroke: this.resolvePolygonStroke(nextIntensity),
        points: feature.points.map((point) => ({
          x: this.clampNumber(point.x + this.randomBetween(-3, 3), 4, 96),
          y: this.clampNumber(point.y + this.randomBetween(-3, 3), 4, 96),
        })),
      };
    });

    if (requestCount % 3 === 0 && snapshot.features.length < 7) {
      snapshot.features.push(
        this.createPolygonFeature(100 + requestCount, this.createSeededRandom(snapshot.meta.ownerEmail + '-regions-' + requestCount)),
      );
    }

    if (requestCount % 5 === 0 && snapshot.features.length > 4) {
      snapshot.features.pop();
    }
  }

  private mutateHotspots(snapshot: HotspotsLayerSnapshot, requestCount: number): void {
    const now = new Date().toISOString();
    snapshot.meta.lastUpdated = now;
    snapshot.meta.requestCount = requestCount;

    snapshot.features = snapshot.features.map((feature) => {
      const nextIntensity = this.clampNumber(
        feature.intensity + this.randomBetween(-14, 20),
        12,
        100,
      );

      return {
        ...feature,
        intensity: nextIntensity,
        radius: this.clampNumber(feature.radius + this.randomBetween(-3, 4), 6, 22),
        status: this.resolveStatus(nextIntensity),
        color: this.resolveCircleColor(nextIntensity),
        center: {
          x: this.clampNumber(feature.center.x + this.randomBetween(-4, 4), 4, 96),
          y: this.clampNumber(feature.center.y + this.randomBetween(-4, 4), 4, 96),
        },
      };
    });

    if (requestCount % 3 === 0 && snapshot.features.length < 12) {
      snapshot.features.push(
        this.createCircleFeature(200 + requestCount, this.createSeededRandom(snapshot.meta.ownerEmail + '-hotspots-' + requestCount)),
      );
    }

    if (requestCount % 5 === 0 && snapshot.features.length > 6) {
      snapshot.features.pop();
    }
  }

  private createPolygonFeature(
    index: number,
    seededRandom: () => number,
  ): GeoPolygonFeature {
    const labels = [
      'North Field',
      'Central Basin',
      'River Belt',
      'Southern Arc',
      'Harbor Reach',
      'Glass Ridge',
      'Outer Shelf',
    ];
    const jitter = (min: number, max: number) =>
      min + Math.floor(seededRandom() * (max - min + 1));
    const baseX = 12 + ((index - 1) % 3) * 28 + Math.floor(seededRandom() * 5);
    const baseY = 12 + Math.floor((index - 1) / 3) * 32 + Math.floor(seededRandom() * 5);
    const width = 14 + Math.floor(seededRandom() * 8);
    const height = 12 + Math.floor(seededRandom() * 8);
    const intensity = 28 + Math.floor(seededRandom() * 58);

    return {
      id: 'region-' + index,
      label: labels[(index - 1) % labels.length],
      status: this.resolveStatus(intensity),
      fill: this.resolvePolygonFill(intensity),
      stroke: this.resolvePolygonStroke(intensity),
      intensity,
      points: [
        this.clampPoint({ x: baseX, y: baseY }),
        this.clampPoint({ x: baseX + width, y: baseY + jitter(-2, 2) }),
        this.clampPoint({
          x: baseX + width - jitter(1, 5),
          y: baseY + height,
        }),
        this.clampPoint({
          x: baseX - jitter(0, 3),
          y: baseY + height - jitter(-1, 3),
        }),
      ],
    };
  }

  private createCircleFeature(
    index: number,
    seededRandom: () => number,
  ): GeoCircleFeature {
    const intensity = 22 + Math.floor(seededRandom() * 62);

    return {
      id: 'hotspot-' + index,
      label: 'Hotspot ' + index,
      status: this.resolveStatus(intensity),
      color: this.resolveCircleColor(intensity),
      intensity,
      radius: 8 + Math.floor(seededRandom() * 10),
      center: {
        x: 8 + Math.floor(seededRandom() * 84),
        y: 8 + Math.floor(seededRandom() * 84),
      },
    };
  }

  private createSeededRandom(seed: string): () => number {
    let state = 0;
    for (let index = 0; index < seed.length; index += 1) {
      state = (state * 31 + seed.charCodeAt(index)) >>> 0;
    }

    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private clampPoint(point: GeoPoint): GeoPoint {
    return {
      x: this.clampNumber(point.x, DEMO_MAP_WORLD_BOUNDS.minX + 2, DEMO_MAP_WORLD_BOUNDS.maxX - 2),
      y: this.clampNumber(point.y, DEMO_MAP_WORLD_BOUNDS.minY + 2, DEMO_MAP_WORLD_BOUNDS.maxY - 2),
    };
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private resolveStatus(intensity: number): GeoFeatureStatus {
    if (intensity >= 76) {
      return 'critical';
    }

    if (intensity >= 48) {
      return 'watch';
    }

    return 'stable';
  }

  private resolvePolygonFill(intensity: number): string {
    if (intensity >= 76) {
      return '#dc2626';
    }

    if (intensity >= 48) {
      return '#f59e0b';
    }

    return '#0f766e';
  }

  private resolvePolygonStroke(intensity: number): string {
    if (intensity >= 76) {
      return '#991b1b';
    }

    if (intensity >= 48) {
      return '#b45309';
    }

    return '#115e59';
  }

  private resolveCircleColor(intensity: number): string {
    if (intensity >= 76) {
      return '#ea580c';
    }

    if (intensity >= 48) {
      return '#f97316';
    }

    return '#fb923c';
  }
}
