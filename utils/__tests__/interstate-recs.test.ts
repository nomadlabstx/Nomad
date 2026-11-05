import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyPlaceKind,
  filterInterstateRecs,
  isLikelyChain,
  meetsQualityFloor,
  pickInterstateRec,
  recsAreEnabled,
  type InterstateRecPlace,
  type RecTravelPrefs,
} from '../interstate-recs.ts';

const origin = { latitude: 31.55, longitude: -97.15 };

const prefs: RecTravelPrefs = {
  recommendEat: true,
  recommendDrink: true,
  recommendDo: true,
  detourPreset: 'few-minutes',
  preferredStops: [],
  avoidChains: false,
  cuisines: [],
  activityInterests: [],
  priceRange: 'any',
};

function place(overrides: Partial<InterstateRecPlace> = {}): InterstateRecPlace {
  return {
    placeId: 'p1',
    name: 'Local Smokehouse',
    kind: 'eat',
    coordinates: { latitude: 31.555, longitude: -97.15 },
    rating: 4.6,
    userRatingsTotal: 210,
    openNow: true,
    types: ['restaurant'],
    distanceMeters: 1200,
    ...overrides,
  };
}

describe('recsAreEnabled', () => {
  it('treats master Off or empty Eat+Drink+Do as Off', () => {
    assert.equal(recsAreEnabled(false, prefs), false);
    assert.equal(recsAreEnabled(true, prefs), true);
    assert.equal(
      recsAreEnabled(true, { recommendEat: false, recommendDrink: false, recommendDo: false }),
      false
    );
  });
});

describe('classifyPlaceKind', () => {
  it('maps Places types onto Eat / Drink / Do', () => {
    assert.equal(classifyPlaceKind(['cafe']), 'drink');
    assert.equal(classifyPlaceKind(['restaurant']), 'eat');
    assert.equal(classifyPlaceKind(['museum', 'point_of_interest']), 'do');
    assert.equal(classifyPlaceKind(['gas_station']), null);
  });
});

describe('meetsQualityFloor', () => {
  it('requires a high rating and enough reviews unless it is a preferred stop', () => {
    assert.equal(meetsQualityFloor(place(), []), true);
    assert.equal(meetsQualityFloor(place({ rating: 3.2, userRatingsTotal: 400 }), []), false);
    assert.equal(
      meetsQualityFloor(place({ name: "Buc-ee's", rating: 3.9, userRatingsTotal: 8 }), ["Buc-ee's"]),
      true
    );
  });
});

describe('filterInterstateRecs', () => {
  it('skips closed places, gas-station junk, and dismissed ids', () => {
    const kept = filterInterstateRecs(
      [
        place({ placeId: 'closed', openNow: false }),
        place({ placeId: 'dismissed', name: 'BBQ Palace' }),
        place({ placeId: 'thin', name: 'Gas Mart', rating: 3.1, userRatingsTotal: 4 }),
        place({ placeId: 'good', name: 'Hill Country BBQ' }),
      ],
      {
        prefs,
        origin,
        heading: 0,
        dismissedIds: new Set(['dismissed']),
      }
    );
    assert.deepEqual(kept.map((item) => item.placeId), ['good']);
  });

  it('skips a rec that would leave a stay-on-highway route', () => {
    const kept = filterInterstateRecs(
      [place({ placeId: 'far', distanceMeters: 9000, distanceFromRouteMeters: 5000 })],
      {
        prefs: { ...prefs, detourPreset: 'worth-the-dip' },
        origin,
        heading: 0,
        preferredHighways: ['I-35'],
        dismissedIds: new Set(),
      }
    );
    assert.equal(kept.length, 0);
  });

  it('drops chains when avoidChains is on unless they are a preferred stop', () => {
    assert.equal(isLikelyChain("McDonald's"), true);
    const dropped = filterInterstateRecs(
      [place({ placeId: 'mcd', name: "McDonald's", rating: 4.3, userRatingsTotal: 900 })],
      {
        prefs: { ...prefs, avoidChains: true },
        origin,
        heading: 0,
        dismissedIds: new Set(),
      }
    );
    assert.equal(dropped.length, 0);
  });
});

describe('pickInterstateRec', () => {
  it('returns the best ahead place and nothing when the list is empty', () => {
    const picked = pickInterstateRec(
      [
        place({ placeId: 'ok', rating: 4.3, userRatingsTotal: 50, distanceMeters: 3000 }),
        place({ placeId: 'best', name: 'Overlook Cafe', kind: 'drink', types: ['cafe'], rating: 4.8, userRatingsTotal: 120, distanceMeters: 900 }),
      ],
      { prefs, origin, heading: 0, dismissedIds: new Set() }
    );
    assert.equal(picked?.placeId, 'best');
    assert.equal(pickInterstateRec([], { prefs, origin, dismissedIds: new Set() }), null);
  });
});
