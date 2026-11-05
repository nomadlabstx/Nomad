import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cameraCacheKey,
  pickDriveAttentionSlot,
  detourMeters,
  isHeadingAhead,
} from '../drive-hud.ts';

describe('pickDriveAttentionSlot', () => {
  it('gives cameras priority over recs and achievement toasts', () => {
    assert.equal(
      pickDriveAttentionSlot({ hasCamera: true, hasRec: true, hasAchievement: true }),
      'camera'
    );
    assert.equal(
      pickDriveAttentionSlot({ hasCamera: false, hasRec: true, hasAchievement: true }),
      'rec'
    );
    assert.equal(
      pickDriveAttentionSlot({ hasCamera: false, hasRec: false, hasAchievement: true }),
      'achievement'
    );
    assert.equal(
      pickDriveAttentionSlot({ hasCamera: false, hasRec: false, hasAchievement: false }),
      null
    );
  });
});

describe('detourMeters', () => {
  it('maps the three presets to highway-scale distances', () => {
    assert.equal(detourMeters('this-exit'), 1609);
    assert.equal(detourMeters('few-minutes'), 8047);
    assert.equal(detourMeters('worth-the-dip'), 24140);
    assert.equal(detourMeters(undefined), 8047);
  });
});

describe('cameraCacheKey', () => {
  it('rounds nearby coordinates onto the same OSM cache cell', () => {
    assert.equal(cameraCacheKey(31.5493, -97.1467), cameraCacheKey(31.551, -97.148));
    assert.notEqual(cameraCacheKey(31.5493, -97.1467), cameraCacheKey(32.7767, -96.797));
  });
});

describe('isHeadingAhead', () => {
  it('keeps points in front of the driver and drops points behind', () => {
    const origin = { latitude: 31.55, longitude: -97.15 };
    const north = { latitude: 31.56, longitude: -97.15 };
    const south = { latitude: 31.54, longitude: -97.15 };
    assert.equal(isHeadingAhead(origin, north, 0), true);
    assert.equal(isHeadingAhead(origin, south, 0), false);
  });
});
