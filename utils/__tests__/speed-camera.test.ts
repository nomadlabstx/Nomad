import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseMaxspeedMph, parseOverpassCameras } from '../osm-cameras.ts';

describe('parseOverpassCameras', () => {
  it('keeps OSM speed cameras and ignores unrelated nodes', () => {
    const cameras = parseOverpassCameras({
      elements: [
        {
          type: 'node',
          id: 11,
          lat: 30.2672,
          lon: -97.7431,
          tags: { highway: 'speed_camera', maxspeed: '65 mph', name: 'I-35' },
        },
        {
          type: 'node',
          id: 12,
          lat: 30.27,
          lon: -97.74,
          tags: { highway: 'traffic_signals' },
        },
      ],
    });
    assert.equal(cameras.length, 1);
    assert.equal(cameras[0].id, 'osm-11');
    assert.equal(cameras[0].speedLimit, 65);
  });

  it('returns nothing when Overpass is empty so we never invent cameras', () => {
    assert.deepEqual(parseOverpassCameras({ elements: [] }), []);
  });
});

describe('parseMaxspeedMph', () => {
  it('parses mph and km/h tags', () => {
    assert.equal(parseMaxspeedMph('70 mph'), 70);
    assert.equal(parseMaxspeedMph('100 km/h'), 62);
    assert.equal(parseMaxspeedMph(undefined), 0);
  });
});
