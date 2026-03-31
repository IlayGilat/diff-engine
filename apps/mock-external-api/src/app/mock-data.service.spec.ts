import { DEMO_MAP_WORLD_BOUNDS } from '@org/models';
import { MockDataService } from './mock-data.service';

describe('MockDataService', () => {
  it('should return region polygons inside the shared map bounds', () => {
    const service = new MockDataService();
    const snapshot = service.getData('demo@example.com', 'regions');

    expect(snapshot.meta.domain).toBe('regions');
    expect(snapshot.features.length).toBeGreaterThanOrEqual(4);

    snapshot.features.forEach((feature) => {
      feature.points.forEach((point) => {
        expect(point.x).toBeGreaterThanOrEqual(DEMO_MAP_WORLD_BOUNDS.minX);
        expect(point.x).toBeLessThanOrEqual(DEMO_MAP_WORLD_BOUNDS.maxX);
        expect(point.y).toBeGreaterThanOrEqual(DEMO_MAP_WORLD_BOUNDS.minY);
        expect(point.y).toBeLessThanOrEqual(DEMO_MAP_WORLD_BOUNDS.maxY);
      });
    });
  });

  it('should keep hotspot ids stable while mutating geometry over time', () => {
    const service = new MockDataService();
    const firstSnapshot = service.getData('demo@example.com', 'hotspots');
    const secondSnapshot = service.getData('demo@example.com', 'hotspots');

    expect(secondSnapshot.meta.requestCount).toBeGreaterThan(
      firstSnapshot.meta.requestCount,
    );
    expect(secondSnapshot.features.length).toBeGreaterThanOrEqual(6);
    expect(secondSnapshot.features[0]?.id).toBe(firstSnapshot.features[0]?.id);

    secondSnapshot.features.forEach((feature) => {
      expect(feature.center.x).toBeGreaterThanOrEqual(DEMO_MAP_WORLD_BOUNDS.minX);
      expect(feature.center.x).toBeLessThanOrEqual(DEMO_MAP_WORLD_BOUNDS.maxX);
      expect(feature.center.y).toBeGreaterThanOrEqual(DEMO_MAP_WORLD_BOUNDS.minY);
      expect(feature.center.y).toBeLessThanOrEqual(DEMO_MAP_WORLD_BOUNDS.maxY);
    });
  });
});
