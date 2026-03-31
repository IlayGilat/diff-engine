import { DEMO_MAP_GENERATION_BOUNDS, DEMO_MAP_WORLD_BOUNDS } from '@org/models';
import { DemoMapFeatureFactory } from '../factories/demo-map-feature.factory';
import { DemoMapRandomFactory } from '../factories/demo-map-random.factory';
import { MockDataService } from '../services/mock-data.service';

describe('MockDataService', () => {
  function createService(): MockDataService {
    const randomFactory = new DemoMapRandomFactory();
    return new MockDataService(
      new DemoMapFeatureFactory(randomFactory),
      randomFactory,
    );
  }

  it('should return region polygons inside the shared map bounds', () => {
    const service = createService();
    const snapshot = service.getData('demo@example.com', 'regions');

    expect(snapshot.meta.domain).toBe('regions');
    expect(snapshot.features.length).toBe(18);

    snapshot.features.forEach((feature) => {
      expect(feature.points.length).toBeGreaterThanOrEqual(5);
      expect(feature.points.length).toBeLessThanOrEqual(7);
      feature.points.forEach((point) => {
        expect(point.x).toBeGreaterThanOrEqual(DEMO_MAP_WORLD_BOUNDS.minX);
        expect(point.x).toBeLessThanOrEqual(DEMO_MAP_WORLD_BOUNDS.maxX);
        expect(point.y).toBeGreaterThanOrEqual(DEMO_MAP_WORLD_BOUNDS.minY);
        expect(point.y).toBeLessThanOrEqual(DEMO_MAP_WORLD_BOUNDS.maxY);
        expect(point.x).toBeGreaterThanOrEqual(DEMO_MAP_GENERATION_BOUNDS.minX);
        expect(point.x).toBeLessThanOrEqual(DEMO_MAP_GENERATION_BOUNDS.maxX);
        expect(point.y).toBeGreaterThanOrEqual(DEMO_MAP_GENERATION_BOUNDS.minY);
        expect(point.y).toBeLessThanOrEqual(DEMO_MAP_GENERATION_BOUNDS.maxY);
      });
    });
  });

  it('should keep hotspot ids stable while mutating geometry over time', () => {
    const service = createService();
    const firstSnapshot = service.getData('demo@example.com', 'hotspots');
    const secondSnapshot = service.getData('demo@example.com', 'hotspots');

    expect(secondSnapshot.meta.requestCount).toBeGreaterThan(
      firstSnapshot.meta.requestCount,
    );
    expect(secondSnapshot.features.length).toBeGreaterThanOrEqual(24);
    expect(secondSnapshot.features[0]?.id).toBe(firstSnapshot.features[0]?.id);

    secondSnapshot.features.forEach((feature) => {
      expect(feature.center.x).toBeGreaterThanOrEqual(DEMO_MAP_WORLD_BOUNDS.minX);
      expect(feature.center.x).toBeLessThanOrEqual(DEMO_MAP_WORLD_BOUNDS.maxX);
      expect(feature.center.y).toBeGreaterThanOrEqual(DEMO_MAP_WORLD_BOUNDS.minY);
      expect(feature.center.y).toBeLessThanOrEqual(DEMO_MAP_WORLD_BOUNDS.maxY);
      expect(feature.radius).toBeGreaterThanOrEqual(3500);
      expect(feature.radius).toBeLessThanOrEqual(22000);
    });
  });
});
