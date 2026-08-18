import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bearingDegrees,
  buildPathMetrics,
  sampleAlongPath,
} from '../gps-simulator.ts';

describe('bearingDegrees', () => {
  it('returns ~90 for due east', () => {
    const bearing = bearingDegrees(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 }
    );
    assert.ok(Math.abs(bearing - 90) < 1);
  });

  it('returns ~0 for due north', () => {
    const bearing = bearingDegrees(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 }
    );
    assert.ok(Math.abs(bearing - 0) < 1 || Math.abs(bearing - 360) < 1);
  });
});

describe('sampleAlongPath', () => {
  const path = [
    { latitude: 31.5493, longitude: -97.1467 },
    { latitude: 31.5593, longitude: -97.1467 },
    { latitude: 31.5593, longitude: -97.1367 },
  ];
  const metrics = buildPathMetrics(path);

  it('starts at the first point', () => {
    const sample = sampleAlongPath(metrics, 0);
    assert.equal(sample.coordinate.latitude, path[0].latitude);
    assert.equal(sample.coordinate.longitude, path[0].longitude);
    assert.equal(sample.done, false);
  });

  it('ends at the last point', () => {
    const sample = sampleAlongPath(metrics, metrics.total);
    assert.equal(sample.coordinate.latitude, path[2].latitude);
    assert.equal(sample.coordinate.longitude, path[2].longitude);
    assert.equal(sample.done, true);
  });

  it('interpolates between vertices', () => {
    const firstLeg = metrics.cumulative[1];
    const sample = sampleAlongPath(metrics, firstLeg / 2);
    assert.ok(Math.abs(sample.coordinate.latitude - 31.5543) < 0.0002);
    assert.ok(Math.abs(sample.coordinate.longitude - path[0].longitude) < 0.0002);
    assert.equal(sample.done, false);
  });

  it('reports total path length above zero', () => {
    assert.ok(metrics.total > 1000);
  });
});
