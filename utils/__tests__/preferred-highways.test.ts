import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Route } from '../../types/navigation.ts';
import {
  extractPreferredHighways,
  rankRoutesForPreferredHighways,
} from '../preferred-highways.ts';

function fakeRoute(id: string, summary: string, instruction: string, distance: number): Route {
  return {
    id,
    summary,
    warnings: [],
    overviewPolyline: '',
    bounds: {
      northeast: { latitude: 0, longitude: 0 },
      southwest: { latitude: 0, longitude: 0 },
    },
    totalDistance: distance,
    totalDuration: distance,
    hasTolls: false,
    hasHighways: true,
    legs: [
      {
        steps: [
          {
            id: `${id}-0`,
            instruction,
            distance,
            duration: distance,
            startLocation: { latitude: 0, longitude: 0 },
            endLocation: { latitude: 1, longitude: 1 },
            polyline: '',
            travelMode: 'DRIVING',
          },
        ],
        distance,
        duration: distance,
        startAddress: '',
        endAddress: '',
        startLocation: { latitude: 0, longitude: 0 },
        endLocation: { latitude: 1, longitude: 1 },
      },
    ],
  };
}

describe('extractPreferredHighways', () => {
  it('reads stay-on phrasing', () => {
    const labels = extractPreferredHighways('Keep me on I-95 from DC to Boston.');
    assert.deepEqual(labels, ['I-95']);
  });

  it('reads a structured Pathfinder line', () => {
    const labels = extractPreferredHighways('Take the scenic way.\nStay on: Interstate 10\nDestinations:\n1. El Paso, TX');
    assert.deepEqual(labels, ['I-10']);
  });

  it('ignores get-off phrasing', () => {
    const labels = extractPreferredHighways('Please get off I-95 and take US-1 instead.');
    assert.ok(!labels.includes('I-95'));
    assert.deepEqual(labels, ['US-1']);
  });
});

describe('rankRoutesForPreferredHighways', () => {
  it('puts the named highway alternative first', () => {
    const fastShortcut = fakeRoute('fast', 'I-495 N', 'Merge onto I-495 N', 80_000);
    const stayOn = fakeRoute('stay', 'I-95 S', 'Continue on I-95 S', 120_000);
    const ranked = rankRoutesForPreferredHighways([fastShortcut, stayOn], ['I-95']);
    assert.equal(ranked[0].id, 'stay');
  });
});
