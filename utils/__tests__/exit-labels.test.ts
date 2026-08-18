import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatExitLabel,
  formatExitListLine,
  normalizeExitNumber,
  polishExitWording,
} from '../exit-labels';

describe('normalizeExitNumber', () => {
  it('glues spaced and hyphenated letter suffixes', () => {
    assert.equal(normalizeExitNumber('30 A'), '30A');
    assert.equal(normalizeExitNumber('30a'), '30A');
    assert.equal(normalizeExitNumber('30-A'), '30A');
    assert.equal(normalizeExitNumber('12 B'), '12B');
  });

  it('keeps plain numbers', () => {
    assert.equal(normalizeExitNumber('40'), '40');
    assert.equal(normalizeExitNumber('Exit 40'), '40');
  });

  it('keeps dual letter ramps as 30A-B', () => {
    assert.equal(normalizeExitNumber('30A-B'), '30A-B');
    assert.equal(normalizeExitNumber('30 A-B'), '30A-B');
  });
});

describe('formatExitLabel', () => {
  it('always prefixes Exit', () => {
    assert.equal(formatExitLabel('30'), 'Exit 30');
    assert.equal(formatExitLabel('30 A'), 'Exit 30A');
    assert.equal(formatExitLabel('7B'), 'Exit 7B');
  });
});

describe('formatExitListLine', () => {
  it('does not double Exit when the description is only the number', () => {
    assert.equal(formatExitListLine('20A', 'Exit 20A'), 'Exit 20A');
    assert.equal(formatExitListLine('5', 'Exit 5'), 'Exit 5');
  });

  it('keeps a real place name after the label', () => {
    assert.equal(
      formatExitListLine('57', 'US 1 – Byram, Port Chester NY'),
      'Exit 57 – US 1 – Byram, Port Chester NY'
    );
  });
});

describe('polishExitWording', () => {
  it('rewrites Google phrasing to Exit XX / Exit XXA', () => {
    assert.equal(polishExitWording('Take exit 30 A onto I-84'), 'Take Exit 30A onto I-84');
    assert.equal(polishExitWording('Take the 12a exit'), 'Take Exit 12A');
    assert.equal(polishExitWording('Keep left for exit 40'), 'Keep left for Exit 40');
    assert.equal(polishExitWording('Take exits 8 A-B'), 'Take Exit 8A-B');
  });
});
