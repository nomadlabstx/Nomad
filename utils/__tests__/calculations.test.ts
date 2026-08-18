import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateDistance, calculatePathDistance } from '../calculations.ts';

describe('calculateDistance', () => {
  it('returns a positive distance for two nearby points', () => {
    const meters = calculateDistance(
      { latitude: 31.5493, longitude: -97.1467 },
      { latitude: 31.5593, longitude: -97.1467 }
    );
    assert.ok(meters > 1000);
    assert.ok(Number.isFinite(meters));
  });

  it('returns 0 for non-finite coordinates', () => {
    assert.equal(
      calculateDistance(
        { latitude: Number.NaN, longitude: -97.1467 },
        { latitude: 31.5493, longitude: -97.1467 }
      ),
      0
    );
    assert.equal(
      calculateDistance(
        { latitude: 31.5493, longitude: Number.POSITIVE_INFINITY },
        { latitude: 31.5593, longitude: -97.1467 }
      ),
      0
    );
  });

  it('returns 0 for the same point', () => {
    const point = { latitude: 40.7128, longitude: -74.006 };
    assert.equal(calculateDistance(point, point), 0);
  });
});

describe('calculatePathDistance', () => {
  it('skips invalid segments instead of producing NaN', () => {
    const meters = calculatePathDistance([
      { latitude: 31.5493, longitude: -97.1467, timestamp: 1 },
      { latitude: Number.NaN, longitude: -97.1467, timestamp: 2 },
      { latitude: 31.5593, longitude: -97.1467, timestamp: 3 },
    ]);
    assert.ok(Number.isFinite(meters));
    assert.equal(meters, 0);
  });

  it('sums consecutive valid points', () => {
    const meters = calculatePathDistance([
      { latitude: 31.5493, longitude: -97.1467, timestamp: 1 },
      { latitude: 31.5593, longitude: -97.1467, timestamp: 2 },
    ]);
    assert.ok(meters > 1000);
    assert.ok(Number.isFinite(meters));
  });
});
