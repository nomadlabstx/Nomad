import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Route } from '../../types/navigation';
import { describeRouteChoices, formatViaTitle } from '../route-choices';

function route(partial: Partial<Route> & { id: string }): Route {
  return {
    legs: [],
    overviewPolyline: '',
    summary: '',
    warnings: [],
    bounds: {
      northeast: { latitude: 0, longitude: 0 },
      southwest: { latitude: 0, longitude: 0 },
    },
    totalDistance: 10000,
    totalDuration: 600,
    hasTolls: false,
    hasHighways: true,
    ...partial,
  };
}

describe('formatViaTitle', () => {
  it('strips a trailing compass letter', () => {
    assert.equal(formatViaTitle('I-95 S'), 'Via I-95');
    assert.equal(formatViaTitle('CT-67 N'), 'Via CT-67');
  });

  it('falls back when Google sends no summary', () => {
    assert.equal(formatViaTitle(''), 'Alternative');
  });

  it('turns "and" into "to" for multi-road summaries', () => {
    assert.equal(formatViaTitle('CT-15 N and I-84'), 'Via CT-15 to I-84');
  });
});

describe('describeRouteChoices', () => {
  it('labels the fastest route and explains a slower no-toll option', () => {
    const choices = describeRouteChoices([
      route({
        id: 'a',
        summary: 'I-95 S',
        totalDuration: 2400,
        totalDistance: 50000,
        hasTolls: true,
        hasHighways: true,
      }),
      route({
        id: 'b',
        summary: 'US-1 S',
        totalDuration: 2760,
        totalDistance: 42000,
        hasTolls: false,
        hasHighways: false,
      }),
    ]);

    assert.equal(choices[0].title, 'Via I-95');
    assert.match(choices[0].reason, /Fastest/);
    assert.match(choices[0].reason, /Has tolls/);
    assert.equal(choices[1].title, 'Via US-1');
    assert.match(choices[1].reason, /slower/);
    assert.match(choices[1].reason, /No tolls/);
    assert.match(choices[1].reason, /Shortest/);
  });

  it('explains an alternate that dodges traffic on the fastest road', () => {
    const choices = describeRouteChoices([
      route({
        id: 'a',
        summary: 'I-84 E',
        totalDuration: 5000,
        totalDurationInTraffic: 6000,
        trafficLevel: 'heavy',
        totalDistance: 161000,
        hasTolls: false,
        hasHighways: true,
      }),
      route({
        id: 'b',
        summary: 'CT-15 N and I-84',
        totalDuration: 6200,
        totalDurationInTraffic: 6300,
        trafficLevel: 'clear',
        totalDistance: 160500,
        hasTolls: false,
        hasHighways: true,
      }),
    ]);

    assert.equal(choices[1].title, 'Via CT-15 to I-84');
    assert.match(choices[1].reason, /Due to heavy traffic on I-84/);
  });
});
