import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sortByDistance, circleToViewport, mergePlaceResults, isAddressQuery, type DestinationSuggestion } from '../places-search';

const origin = { latitude: 31.5493, longitude: -97.1467 };

function place(
  id: string,
  lat: number,
  lng: number
): DestinationSuggestion {
  return {
    place_id: id,
    description: id,
    structured_formatting: { main_text: id, secondary_text: '' },
    coordinates: { latitude: lat, longitude: lng },
  };
}

describe('sortByDistance', () => {
  it('puts the closest place first', () => {
    const far = place('far', 32.7767, -96.7970); // Dallas
    const near = place('near', 31.5510, -97.1460); // ~0.1 mi
    const mid = place('mid', 31.6, -97.2);

    const sorted = sortByDistance([far, mid, near], origin);
    assert.equal(sorted[0].place_id, 'near');
    assert.equal(sorted[1].place_id, 'mid');
    assert.equal(sorted[2].place_id, 'far');
    assert.ok((sorted[0].distanceMeters ?? Infinity) < (sorted[1].distanceMeters ?? 0));
  });

  it('sends places without coordinates to the end', () => {
    const unknown: DestinationSuggestion = {
      place_id: 'unknown',
      description: 'unknown',
      structured_formatting: { main_text: 'unknown', secondary_text: '' },
    };
    const near = place('near', 31.5510, -97.1460);
    const sorted = sortByDistance([unknown, near], origin);
    assert.equal(sorted[0].place_id, 'near');
    assert.equal(sorted[1].place_id, 'unknown');
  });
});

describe('circleToViewport', () => {
  it('builds a southwest/northeast rectangle around the center', () => {
    const viewport = circleToViewport(origin, 50000);
    assert.ok(viewport.low.latitude < origin.latitude);
    assert.ok(viewport.high.latitude > origin.latitude);
    assert.ok(viewport.low.longitude < origin.longitude);
    assert.ok(viewport.high.longitude > origin.longitude);
  });
});

describe('mergePlaceResults', () => {
  it('keeps nearby and farther places, closest first after sort', () => {
    const near = place('near', 31.5510, -97.1460);
    const far = place('far', 32.7767, -96.7970);
    const merged = mergePlaceResults([near], [far, near]);
    assert.equal(merged.length, 2);
    const sorted = sortByDistance(merged, origin);
    assert.equal(sorted[0].place_id, 'near');
    assert.equal(sorted[1].place_id, 'far');
  });

  it('merges autocomplete results that text search missed', () => {
    const near = place('near', 31.5510, -97.1460);
    const farAddress = place('far-address', 32.7767, -96.7970);
    const merged = mergePlaceResults([near], [near], [farAddress]);
    assert.equal(merged.length, 2);
    assert.ok(merged.some((p) => p.place_id === 'far-address'));
  });
});

describe('isAddressQuery', () => {
  it('detects house-number streets and suffixes', () => {
    assert.equal(isAddressQuery('123 Main St'), true);
    assert.equal(isAddressQuery('4 Oak Ave'), true);
    assert.equal(isAddressQuery('Main Street'), true);
    assert.equal(isAddressQuery('pizza'), false);
    assert.equal(isAddressQuery('abc'), false);
  });
});
