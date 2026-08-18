import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Trip } from '../../types';
import type { SavedRoute } from '../../types/route-history';
import { recordedTripTitle, resolveRecordedTripTitle, tripReplayTarget } from '../recorded-trip-title';

const yale = { latitude: 41.3107, longitude: -72.9245 };
const home = { latitude: 41.3948, longitude: -73.0737 };

function trip(partial: Partial<Trip>): Trip {
  return {
    id: '1',
    meters: 100,
    startTs: Date.now() - 60_000,
    endTs: Date.now(),
    path: [home, yale],
    ...partial,
  };
}

function route(partial: Partial<SavedRoute> = {}): SavedRoute {
  return {
    id: 'r1',
    name: 'Trip to Yale Billiards',
    origin: home,
    destination: yale,
    route: { legs: [{ endAddress: 'Yale Billiards, New Haven, CT' }] } as SavedRoute['route'],
    createdAt: Date.now(),
    lastUsed: Date.now(),
    useCount: 3,
    distance: 18000,
    duration: 1200,
    ...partial,
  };
}

describe('recordedTripTitle', () => {
  it('uses a stored trip name', () => {
    assert.equal(
      recordedTripTitle(trip({ name: 'Trip to Yale Billiards' }), []),
      'Trip to Yale Billiards'
    );
  });

  it('matches the path end to a saved destination', () => {
    assert.equal(recordedTripTitle(trip({ name: undefined }), [route()]), 'Trip to Yale Billiards');
  });

  it('matches a short trip near the destination via origin', () => {
    const parked = trip({
      name: undefined,
      meters: 2,
      path: [yale, { latitude: yale.latitude + 0.0002, longitude: yale.longitude }],
    });
    assert.equal(recordedTripTitle(parked, [route()]), 'Trip to Yale Billiards');
  });

  it('replays using the saved destination pin', () => {
    const parked = trip({
      name: 'Trip to Yale Billiards',
      path: [{ latitude: yale.latitude + 0.001, longitude: yale.longitude + 0.001 }],
    });
    const target = tripReplayTarget(parked, [route()]);
    assert.deepEqual(target, {
      latitude: yale.latitude,
      longitude: yale.longitude,
      name: 'Trip to Yale Billiards',
    });
  });

  it('matches by route lastUsed time when geo is far', () => {
    const elsewhere = trip({
      name: undefined,
      path: [{ latitude: 40.7, longitude: -74.0 }],
      startTs: Date.now() - 10_000,
      endTs: Date.now(),
    });
    const resolved = resolveRecordedTripTitle(elsewhere, [route({ lastUsed: Date.now() - 5_000 })]);
    assert.equal(resolved.title, 'Trip to Yale Billiards');
    assert.equal(resolved.matchedBy, 'time');
  });

  it('falls back to the date when nothing matches', () => {
    const old = trip({
      name: undefined,
      startTs: Date.UTC(2024, 0, 2, 12),
      endTs: Date.UTC(2024, 0, 2, 13),
      path: [{ latitude: 40.7, longitude: -74.0 }],
    });
    const resolved = resolveRecordedTripTitle(old, [
      route({ lastUsed: Date.UTC(2020, 0, 1), createdAt: Date.UTC(2020, 0, 1) }),
    ]);
    assert.equal(resolved.matchedBy, 'date');
    assert.match(resolved.title, /2024/);
  });
});
