import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanDestinationLabel,
  displayRouteName,
  formatTripName,
  isStreetAddressName,
} from '../trip-names';

describe('formatTripName', () => {
  it('uses the place name, not the rest of the address', () => {
    assert.equal(
      formatTripName("McDonald's, 900 W Main St, Branford, CT 06405"),
      "Trip to McDonald's"
    );
  });

  it('does not wrap an existing Trip to prefix', () => {
    assert.equal(formatTripName('Trip to Home'), 'Trip to Home');
  });

  it('falls back when the label is coordinates', () => {
    assert.equal(formatTripName('41.4172, -73.0512'), 'Trip');
  });
});

describe('displayRouteName', () => {
  it('replaces coordinate titles with the destination', () => {
    assert.equal(
      displayRouteName('Route from 41.4172, -73.05 to 41.42, -73.04', "McDonald's, Seymour"),
      "Trip to McDonald's"
    );
  });

  it('keeps an already-friendly name', () => {
    assert.equal(displayRouteName('Trip to Work', 'ignored'), 'Trip to Work');
  });

  it('prefers a place name over a stored street address', () => {
    assert.equal(
      displayRouteName('Trip to 900 W Main St', "McDonald's"),
      "Trip to McDonald's"
    );
  });
});

describe('cleanDestinationLabel', () => {
  it('returns empty for coordinate strings', () => {
    assert.equal(cleanDestinationLabel('41.4172, -73.0512'), '');
  });
});

describe('isStreetAddressName', () => {
  it('detects a house-number address', () => {
    assert.equal(isStreetAddressName('Trip to 900 W Main St'), true);
    assert.equal(isStreetAddressName("McDonald's"), false);
  });
});
