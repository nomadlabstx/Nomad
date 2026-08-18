import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAccentFill, getOnAccentColor, relativeLuminance } from '../theme-helpers';

describe('contrast helpers', () => {
  it('treats white as a light color', () => {
    assert.ok(relativeLuminance('#fff') > 0.9);
    assert.ok(relativeLuminance('#ffffff') > 0.9);
  });

  it('puts dark text on white fills', () => {
    assert.equal(getOnAccentColor('#ffffff'), '#11181C');
    assert.equal(getAccentFill('#fff'), '#0a7ea4');
  });

  it('puts white text on teal fills', () => {
    assert.equal(getOnAccentColor('#0a7ea4'), '#FFFFFF');
    assert.equal(getAccentFill('#0a7ea4'), '#0a7ea4');
  });
});
