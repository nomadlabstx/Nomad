import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Trip } from '../../types';
import { tripToGpx, tripToKml } from '../trip-export.ts';

const trip: Trip = {
  id: '1',
  meters: 100,
  startTs: 1,
  endTs: 2,
  name: 'Coffee & tea <stop>',
  path: [
    { latitude: 41.4, longitude: -73.05, timestamp: 1, altitude: 10 },
    { latitude: 41.41, longitude: -73.05, timestamp: 2 },
  ],
};

describe('tripToGpx', () => {
  it('escapes the track name and includes points', () => {
    const gpx = tripToGpx(trip);
    assert.match(gpx, /<name>Coffee &amp; tea &lt;stop&gt;<\/name>/);
    assert.match(gpx, /lat="41.4" lon="-73.05"/);
    assert.doesNotMatch(gpx, /Coffee & tea/);
  });

  it('throws when the path is empty', () => {
    assert.throws(() => tripToGpx({ ...trip, path: [] }), /no path data/);
  });
});

describe('tripToKml', () => {
  it('escapes the placemark name', () => {
    const kml = tripToKml(trip);
    assert.match(kml, /<name>Coffee &amp; tea &lt;stop&gt;<\/name>/);
    assert.match(kml, /-73.05,41.4,10/);
  });
});
