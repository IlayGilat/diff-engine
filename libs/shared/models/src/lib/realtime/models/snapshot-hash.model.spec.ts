import { createSnapshotHash } from './snapshot-hash.model';

describe('createSnapshotHash', () => {
  it('should stay stable when object keys are reordered', () => {
    const firstSnapshot = {
      meta: {
        ownerEmail: 'demo@example.com',
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
      features: [
        {
          id: 'feature-1',
          status: 'stable',
        },
      ],
    };
    const reorderedSnapshot = {
      features: [
        {
          status: 'stable',
          id: 'feature-1',
        },
      ],
      meta: {
        generatedAt: '2026-01-01T00:00:00.000Z',
        ownerEmail: 'demo@example.com',
      },
    };

    expect(createSnapshotHash(firstSnapshot)).toBe(
      createSnapshotHash(reorderedSnapshot),
    );
  });

  it('should change when snapshot content changes', () => {
    const firstSnapshot = {
      meta: {
        requestCount: 1,
      },
      features: [
        {
          id: 'feature-1',
          intensity: 40,
        },
      ],
    };
    const updatedSnapshot = {
      meta: {
        requestCount: 2,
      },
      features: [
        {
          id: 'feature-1',
          intensity: 82,
        },
      ],
    };

    expect(createSnapshotHash(firstSnapshot)).not.toBe(
      createSnapshotHash(updatedSnapshot),
    );
  });
});
