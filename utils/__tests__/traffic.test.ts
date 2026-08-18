import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTrafficSlices,
  classifyTraffic,
  colorForLevel,
} from '../traffic';

describe('classifyTraffic', () => {
  it('is clear when live time matches the estimate', () => {
    assert.equal(classifyTraffic(3600, 3600), 'clear');
  });

  it('is moderate for a few extra minutes', () => {
    assert.equal(classifyTraffic(3600, 3600 + 180), 'moderate');
  });

  it('is heavy for a large delay', () => {
    assert.equal(classifyTraffic(3600, 3600 + 900), 'heavy');
  });
});

describe('buildTrafficSlices', () => {
  const points = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 0, longitude: 2 },
    { latitude: 0, longitude: 3 },
  ];

  it('returns one slice when Google sends no intervals', () => {
    const slices = buildTrafficSlices(points, undefined, 'NORMAL');
    assert.equal(slices.length, 1);
    assert.equal(slices[0].coordinates.length, 4);
    assert.equal(slices[0].color, colorForLevel('clear'));
  });

  it('splits by speed interval and keeps a shared vertex', () => {
    const slices = buildTrafficSlices(points, [
      { startPolylinePointIndex: 0, endPolylinePointIndex: 2, speed: 'NORMAL' },
      { startPolylinePointIndex: 2, endPolylinePointIndex: 3, speed: 'TRAFFIC_JAM' },
    ]);
    assert.equal(slices.length, 2);
    assert.equal(slices[0].speed, 'NORMAL');
    assert.equal(slices[1].speed, 'TRAFFIC_JAM');
    assert.deepEqual(slices[0].coordinates.at(-1), slices[1].coordinates[0]);
  });
});
