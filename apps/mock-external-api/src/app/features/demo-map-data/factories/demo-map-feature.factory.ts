import { Injectable } from '@nestjs/common';
import {
  DEMO_MAP_GENERATION_BOUNDS,
  GeoCircleFeature,
  GeoFeatureStatus,
  GeoPoint,
  GeoPolygonFeature,
  RandomSource,
} from '@org/models';
import { DemoMapRandomFactory } from './demo-map-random.factory';

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
  private readonly regionSuffixes = [
    'Vector',
    'Matrix',
    'Spur',
    'Bloom',
    'Drift',
    'Surge',
    'Fault',
    'Pulse',
  ];
  private readonly hotspotPrefixes = [
    'Flash',
    'Echo',
    'Nova',
    'Flare',
    'Pulse',
    'Spark',
    'Surge',
    'Drift',
  ];

  constructor(private readonly demoMapRandomFactory: DemoMapRandomFactory) {}

  createPolygonFeature(
    index: number,
    randomSource: RandomSource,
  ): GeoPolygonFeature {
    const intensity = this.demoMapRandomFactory.intBetween(randomSource, 28, 86);
    const points = this.createPolygonPoints(randomSource);

    return {
      id: 'region-' + index,
      label: this.createRegionLabel(index, randomSource),
      status: this.resolveStatus(intensity),
      fill: this.resolvePolygonFill(intensity, randomSource),
      stroke: this.resolvePolygonStroke(intensity, randomSource),
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
      label: this.createHotspotLabel(index, randomSource),
      status: this.resolveStatus(intensity),
      color: this.resolveCircleColor(intensity, randomSource),
      intensity,
      radius: this.demoMapRandomFactory.intBetween(randomSource, 3500, 22000),
      center: this.createPoint(randomSource, 0.08),
    };
  }

  mutatePolygonFeature(
    feature: GeoPolygonFeature,
    randomSource: RandomSource,
  ): GeoPolygonFeature {
    const intensity = this.clampNumber(
      feature.intensity +
        this.demoMapRandomFactory.intBetween(randomSource, -28, 34),
      18,
      100,
    );
    const shouldRebuildShape = this.demoMapRandomFactory.chance(randomSource, 0.35);
    const basePoints = shouldRebuildShape
      ? this.createPolygonPoints(randomSource)
      : feature.points.map((point) =>
          this.clampPoint({
            x:
              point.x +
              this.demoMapRandomFactory.floatBetween(randomSource, -0.012, 0.012),
            y:
              point.y +
              this.demoMapRandomFactory.floatBetween(randomSource, -0.01, 0.01),
          }),
        );

    return {
      ...feature,
      intensity,
      label: this.demoMapRandomFactory.chance(randomSource, 0.18)
        ? this.createRegionLabel(
            this.demoMapRandomFactory.intBetween(randomSource, 1, 999),
            randomSource,
          )
        : feature.label,
      status: this.resolveStatus(intensity),
      fill: this.resolvePolygonFill(intensity, randomSource),
      stroke: this.resolvePolygonStroke(intensity, randomSource),
      points: basePoints,
    };
  }

  mutateCircleFeature(
    feature: GeoCircleFeature,
    randomSource: RandomSource,
  ): GeoCircleFeature {
    const intensity = this.clampNumber(
      feature.intensity +
        this.demoMapRandomFactory.intBetween(randomSource, -30, 36),
      12,
      100,
    );
    const shouldRelocate = this.demoMapRandomFactory.chance(randomSource, 0.28);

    return {
      ...feature,
      label: this.demoMapRandomFactory.chance(randomSource, 0.22)
        ? this.createHotspotLabel(
            this.demoMapRandomFactory.intBetween(randomSource, 1, 999),
            randomSource,
          )
        : feature.label,
      intensity,
      radius: this.clampNumber(
        feature.radius +
          this.demoMapRandomFactory.intBetween(randomSource, -3500, 5000),
        3500,
        32000,
      ),
      status: this.resolveStatus(intensity),
      color: this.resolveCircleColor(intensity, randomSource),
      center: shouldRelocate
        ? this.createPoint(randomSource, 0.06)
        : this.clampPoint({
            x:
              feature.center.x +
              this.demoMapRandomFactory.floatBetween(randomSource, -0.11, 0.11),
            y:
              feature.center.y +
              this.demoMapRandomFactory.floatBetween(randomSource, -0.1, 0.1),
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

  private createPolygonPoints(randomSource: RandomSource): GeoPoint[] {
    const center = this.createPoint(randomSource, 0.24);
    const vertexCount = this.demoMapRandomFactory.intBetween(randomSource, 4, 9);
    const radiusX = this.demoMapRandomFactory.floatBetween(randomSource, 0.005, 0.024);
    const radiusY = this.demoMapRandomFactory.floatBetween(randomSource, 0.004, 0.02);

    return Array.from({ length: vertexCount }, (_, pointIndex) => {
      const angleOffset = this.demoMapRandomFactory.floatBetween(
        randomSource,
        -0.28,
        0.28,
      );
      const radiusScale = this.demoMapRandomFactory.floatBetween(
        randomSource,
        0.72,
        1.06,
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
  }

  private createRegionLabel(index: number, randomSource: RandomSource): string {
    const baseLabel =
      this.regionLabels[(index - 1) % this.regionLabels.length] ?? 'Region';
    const suffix = this.demoMapRandomFactory.pickOne(
      randomSource,
      this.regionSuffixes,
    );

    return baseLabel + ' ' + suffix;
  }

  private createHotspotLabel(index: number, randomSource: RandomSource): string {
    const prefix = this.demoMapRandomFactory.pickOne(
      randomSource,
      this.hotspotPrefixes,
    );

    return prefix + ' Hotspot ' + index;
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

  private resolvePolygonFill(
    intensity: number,
    randomSource: RandomSource,
  ): string {
    return this.createColor(
      intensity >= 76
        ? [210, 18, 18]
        : intensity >= 48
          ? [245, 140, 11]
          : [15, 118, 110],
      randomSource,
      26,
    );
  }

  private resolvePolygonStroke(
    intensity: number,
    randomSource: RandomSource,
  ): string {
    return this.createColor(
      intensity >= 76
        ? [153, 27, 27]
        : intensity >= 48
          ? [180, 83, 9]
          : [17, 94, 89],
      randomSource,
      18,
    );
  }

  private resolveCircleColor(
    intensity: number,
    randomSource: RandomSource,
  ): string {
    return this.createColor(
      intensity >= 76
        ? [234, 88, 12]
        : intensity >= 48
          ? [249, 115, 22]
          : [251, 146, 60],
      randomSource,
      34,
    );
  }

  private createColor(
    baseColor: [number, number, number],
    randomSource: RandomSource,
    variance: number,
  ): string {
    const channels = baseColor.map((channel) =>
      this.clampNumber(
        Math.round(
          channel +
            this.demoMapRandomFactory.intBetween(
              randomSource,
              -variance,
              variance,
            ),
        ),
        0,
        255,
      ),
    );

    return (
      '#' +
      channels
        .map((channel) => Number(channel).toString(16).padStart(2, '0'))
        .join('')
    );
  }
}
