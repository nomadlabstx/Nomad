import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AddressComponent } from '../place-identity.ts';
import {
  formatCountyLine,
  formatPlaceLine,
  keepLastGoodRoad,
  parsePlaceIdentity,
  pickTown,
  preferRoadLabel,
  shouldRefreshPlaceIdentity,
} from '../place-identity.ts';

function component(longName: string, types: string[], shortName = longName): AddressComponent {
  return { long_name: longName, short_name: shortName, types };
}

const WOODWAY_LOOP_340: AddressComponent[] = [
  component('Loop 340', ['route']),
  component('Waco', ['locality', 'political']),
  component('Woodway', ['sublocality', 'sublocality_level_1', 'political']),
  component('McLennan County', ['administrative_area_level_2', 'political']),
  component('Texas', ['administrative_area_level_1', 'political'], 'TX'),
  component('United States', ['country', 'political'], 'US'),
];

describe('parsePlaceIdentity', () => {
  it('shows Loop 340 in Woodway, TX instead of Waco', () => {
    const identity = parsePlaceIdentity(WOODWAY_LOOP_340);
    assert.equal(identity.road, 'Loop 340');
    assert.equal(identity.town, 'Woodway');
    assert.equal(identity.stateCode, 'TX');
    assert.equal(identity.county, 'McLennan County');
    assert.equal(formatPlaceLine(identity), 'Woodway, TX');
    assert.equal(formatCountyLine(identity), 'McLennan County');
  });

  it('uses locality when the suburb is absent', () => {
    const identity = parsePlaceIdentity([
      component('Interstate 35', ['route']),
      component('Austin', ['locality', 'political']),
      component('Travis County', ['administrative_area_level_2', 'political']),
      component('Texas', ['administrative_area_level_1', 'political'], 'TX'),
    ]);
    assert.equal(identity.town, 'Austin');
    assert.equal(identity.road, 'Interstate 35');
  });

  it('does not replace Austin with a generic Downtown neighborhood', () => {
    assert.equal(
      pickTown([
        component('Downtown', ['neighborhood', 'political']),
        component('Austin', ['locality', 'political']),
      ]),
      'Austin'
    );
  });
});

describe('preferRoadLabel and keepLastGoodRoad', () => {
  it('ignores Arrive at destination as a road name', () => {
    assert.equal(preferRoadLabel('', 'Arrive at destination'), '');
    assert.equal(preferRoadLabel('Loop 340', 'Arrive at destination'), 'Loop 340');
  });

  it('prefers a highway-style fallback over a local street name', () => {
    assert.equal(preferRoadLabel('Franklin Avenue', 'I-35'), 'I-35');
  });

  it('keeps Loop 340 when the next fix is an unnamed ramp', () => {
    assert.equal(keepLastGoodRoad('', 'Loop 340'), 'Loop 340');
    assert.equal(keepLastGoodRoad('I-35 Ramp', 'Loop 340'), 'Loop 340');
  });
});

describe('shouldRefreshPlaceIdentity', () => {
  const origin = { latitude: 31.5, longitude: -97.2 };

  it('refreshes on the first fix', () => {
    assert.equal(
      shouldRefreshPlaceIdentity({
        nextCoords: origin,
        nowMs: 1_000,
        distanceMeters: 0,
      }),
      true
    );
  });

  it('does not geocode every tick', () => {
    assert.equal(
      shouldRefreshPlaceIdentity({
        previousCoords: origin,
        previousAtMs: 1_000,
        nextCoords: origin,
        nowMs: 2_000,
        distanceMeters: 12,
      }),
      false
    );
  });

  it('refreshes after 150m or 20s', () => {
    assert.equal(
      shouldRefreshPlaceIdentity({
        previousCoords: origin,
        previousAtMs: 1_000,
        nextCoords: origin,
        nowMs: 2_000,
        distanceMeters: 150,
      }),
      true
    );
    assert.equal(
      shouldRefreshPlaceIdentity({
        previousCoords: origin,
        previousAtMs: 1_000,
        nextCoords: origin,
        nowMs: 21_000,
        distanceMeters: 20,
      }),
      true
    );
  });
});
