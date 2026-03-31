import { Injectable } from '@nestjs/common';
import {
  DEMO_MAP_GENERATION_BOUNDS,
  GeoCircleFeature,
  GeoFeatureStatus,
  GeoPoint,
  GeoPolygonFeature,
} from '@org/models';
import { DemoMapRandomFactory, RandomSource } from './demo-map-random.factory';

@Injectable()
export class DemoMapFeatureFactory {
  private readonly regionLabels = [
    'Galilee Cluster',
    'Coastal Arc',
    'Valley Belt',
    'Jerusalem Ring',
    'Negev Ridge',
    'Jordan Reach',
    'South Gateway',
    'Carmel Window',
  ];

  constructor(private readonly demoMapRandomFactory: DemoMapRandomFactory) {}

  createPolygonFeature(
    index: number,
    randomSource: RandomSource,
  ): GeoPolygonFeature {
    const intensity = this.demoMapRandomFactory.intBetween(randomSource, 28, 86);
    const center = this.createPoint(randomSource, 0.22);
    const vertexCount = this.demoMapRandomFactory.intBetween(randomSource, 5, 7);
    const radiusX = this.demoMapRandomFactory.floatBetween(randomSource, 0.08, 0.2);
    const radiusY = this.demoMapRandomFactory.floatBetween(randomSource, 0.06, 0.18);

    const points = Array.from({ length: vertexCount }, (_, pointIndex) => {
      const angleOffset = this.demoMapRandomFactory.floatBetween(
        randomSource,
        -0.18,
        0.18,
      );
      const radiusScale = this.demoMapRandomFactory.floatBetween(
        randomSource,
        0.76,
        1.24,
      );
      const angle =
        -Math.PI / 2 +
        (pointIndex / vertexCount) * Math.PI * 2 +
        angleOffset;

      return this.clampPoint({
        x: center.x + Math.cos(angle) * radiusX * radiusScale,
        y: center.y + Math.sin(angle) * radiusY * radiusScale,
      });
    });

    return {
      id: 'region-' + index,
      label: this.regionLabels[(index - 1) % this.regionLabels.length],
      status: this.resolveStatus(intensity),
      fill: this.resolvePolygonFill(intensity),
      stroke: this.resolvePolygonStroke(intensity),
      intensity,
      points,
    };
  }

  createCircleFeature(
    index: number,
    randomSource: RandomSource,
  ): GeoCircleFeature {
    const intensity = this.demoMapRandomFactory.intBetween(randomSource, 22, 84);

    return {
      id: 'hotspot-' + index,
      label: 'Hotspot ' + index,
      status: this.resolveStatus(intensity),
      color: this.resolveCircleColor(intensity),
      intensity,
      radius: this.demoMapRandomFactory.intBetween(randomSource, 5000, 16000),
      center: this.createPoint(randomSource, 0.12),
    };
  }

  mutatePolygonFeature(
    feature: GeoPolygonFeature,
    randomSource: RandomSource,
  ): GeoPolygonFeature {
    const intensity = this.clampNumber(
      feature.intensity +
        this.demoMapRandomFactory.intBetween(randomSource, -12, 18),
      18,
      100,
    );

    return {
      ...feature,
      intensity,
      status: this.resolveStatus(intensity),
      fill: this.resolvePolygonFill(intensity),
      stroke: this.resolvePolygonStroke(intensity),
      points: feature.points.map((point) =>
        this.clampPoint({
          x:
            point.x +
            this.demoMapRandomFactory.floatBetween(randomSource, -0.035, 0.035),
          y:
            point.y +
            this.demoMapRandomFactory.floatBetween(randomSource, -0.03, 0.03),
        }),
      ),
    };
  }

  mutateCircleFeature(
    feature: GeoCircleFeature,
    randomSource: RandomSource,
  ): GeoCircleFeature {
    const intensity = this.clampNumber(
      feature.intensity +
        this.demoMapRandomFactory.intBetween(randomSource, -14, 20),
      12,
      100,
    );

    return {
      ...feature,
      intensity,
      radius: this.clampNumber(
        feature.radius +
          this.demoMapRandomFactory.intBetween(randomSource, -1200, 1600),
        3500,
        22000,
      ),
      status: this.resolveStatus(intensity),
      color: this.resolveCircleColor(intensity),
      center: this.clampPoint({
        x:
          feature.center.x +
          this.demoMapRandomFactory.floatBetween(randomSource, -0.04, 0.04),
        y:
          feature.center.y +
          this.demoMapRandomFactory.floatBetween(randomSource, -0.035, 0.035),
      }),
    };
  }

  private createPoint(randomSource: RandomSource, margin: number): GeoPoint {
    return {
      x: this.demoMapRandomFactory.floatBetween(
        randomSource,
        DEMO_MAP_GENERATION_BOUNDS.minX + margin,
        DEMO_MAP_GENERATION_BOUNDS.maxX - margin,
      ),
      y: this.demoMapRandomFactory.floatBetween(
        randomSource,
        DEMO_MAP_GENERATION_BOUNDS.minY + margin,
        DEMO_MAP_GENERATION_BOUNDS.maxY - margin,
      ),
    };
  }

  private clampPoint(point: GeoPoint): GeoPoint {
    return {
      x: this.clampNumber(
        point.x,
        DEMO_MAP_GENERATION_BOUNDS.minX,
        DEMO_MAP_GENERATION_BOUNDS.maxX,
      ),
      y: this.clampNumber(
        point.y,
        DEMO_MAP_GENERATION_BOUNDS.minY,
        DEMO_MAP_GENERATION_BOUNDS.maxY,
      ),
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
