import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { routeMatchingService } from '../../services/route-matching.ts';
import { calculateDistance } from '../../utils/calculations.ts';

function encodeSigned(value: number): string {
  let n = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (n >= 0x20) {
    out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  out += String.fromCharCode(n + 63);
  return out;
}

function encodePolyline(
  points: Array<{ latitude: number; longitude: number }>
): string {
  let plat = 0;
  let plng = 0;
  let result = '';
  for (const point of points) {
    const lat = Math.round(point.latitude * 1e5);
    const lng = Math.round(point.longitude * 1e5);
    result += encodeSigned(lat - plat);
    result += encodeSigned(lng - plng);
    plat = lat;
    plng = lng;
  }
  return result;
}

describe('remainingDistanceAlongPolyline', () => {
  it('counts down along the road while crow-flies to the end pin go up', () => {
    const start = { latitude: 41.0, longitude: -73.0 };
    const north = { latitude: 41.002, longitude: -73.0 };
    const end = { latitude: 41.0, longitude: -72.998 };
    const polyline = [start, north, end];

    const remainingAtStart = routeMatchingService.remainingDistanceAlongPolyline(start, polyline);
    const remainingAtNorth = routeMatchingService.remainingDistanceAlongPolyline(north, polyline);
    const remainingAtEnd = routeMatchingService.remainingDistanceAlongPolyline(end, polyline);

    const crowFromStart = calculateDistance(start, end);
    const crowFromNorth = calculateDistance(north, end);

    assert.ok(remainingAtNorth < remainingAtStart, 'along-route remaining should drop at the bend');
    assert.ok(crowFromNorth > crowFromStart, 'crow-flies to the pin increases on this dogleg');
    assert.ok(remainingAtEnd < 15, 'remaining at the end pin should be ~0');
  });

  it('is ~0 at the last vertex', () => {
    const polyline = [
      { latitude: 41.4, longitude: -73.05 },
      { latitude: 41.401, longitude: -73.05 },
      { latitude: 41.402, longitude: -73.05 },
    ];
    const remaining = routeMatchingService.remainingDistanceAlongPolyline(polyline[2], polyline);
    assert.ok(remaining < 5);
  });
});

describe('resolveActiveStepIndex', () => {
  const south = { latitude: 41.4, longitude: -73.05 };
  const mid = { latitude: 41.405, longitude: -73.05 };
  const ramp = { latitude: 41.41, longitude: -73.05 };
  const highwayNorth = { latitude: 41.42, longitude: -73.05 };
  const parallel = { latitude: 41.405, longitude: -73.0494 };

  function step(
    id: string,
    points: Array<{ latitude: number; longitude: number }>
  ) {
    return {
      id,
      instruction: id,
      distance: 1000,
      duration: 60,
      startLocation: points[0],
      endLocation: points[points.length - 1],
      polyline: encodePolyline(points),
      travelMode: 'DRIVING',
    };
  }

  function routeWithSteps(steps: ReturnType<typeof step>[]) {
    return {
      id: 'r',
      legs: [{
        steps,
        distance: 2000,
        duration: 120,
        startAddress: '',
        endAddress: '',
        startLocation: steps[0].startLocation,
        endLocation: steps[steps.length - 1].endLocation,
      }],
      overviewPolyline: '',
      summary: '',
      warnings: [],
      bounds: {
        northeast: highwayNorth,
        southwest: south,
      },
      totalDistance: 2000,
      totalDuration: 120,
      hasTolls: false,
      hasHighways: false,
    };
  }

  it('does not skip ahead just because a later highway is nearby', () => {
    const route = routeWithSteps([
      step('new-haven-rd', [south, mid]),
      step('route-8', [ramp, highwayNorth]),
    ]);
    const index = routeMatchingService.resolveActiveStepIndex(parallel, route as any, 0, 0);
    assert.equal(index, 0);
  });

  it('does not treat a finished short step as a merge when the ramp is still miles away', () => {
    const route = routeWithSteps([
      step('turn', [south, { latitude: 41.4002, longitude: -73.05 }]),
      step('merge', [ramp, highwayNorth]),
    ]);
    const index = routeMatchingService.resolveActiveStepIndex(south, route as any, 0, 0);
    assert.equal(index, 0);
  });

  it('advances one step after you actually reach the next entrance', () => {
    const route = routeWithSteps([
      step('new-haven-rd', [south, ramp]),
      step('route-8', [ramp, highwayNorth]),
    ]);
    const index = routeMatchingService.resolveActiveStepIndex(ramp, route as any, 0, 0);
    assert.equal(index, 1);
  });

  it('does not jump backward', () => {
    const route = routeWithSteps([
      step('a', [south, mid]),
      step('b', [ramp, highwayNorth]),
    ]);
    const index = routeMatchingService.resolveActiveStepIndex(south, route as any, 1, 0);
    assert.equal(index, 1);
  });
});

describe('distanceToUpcomingManeuver', () => {
  it('uses the gap to the ramp when the current step has already ended', () => {
    const here = { latitude: 41.4, longitude: -73.05 };
    const nearby = { latitude: 41.4002, longitude: -73.05 };
    const ramp = { latitude: 41.41, longitude: -73.05 };
    const highway = { latitude: 41.42, longitude: -73.05 };

    const current = {
      id: 'turn',
      instruction: 'turn',
      distance: 40,
      duration: 5,
      startLocation: here,
      endLocation: nearby,
      polyline: encodePolyline([here, nearby]),
      travelMode: 'DRIVING',
    };
    const next = {
      id: 'merge',
      instruction: 'merge',
      distance: 2000,
      duration: 60,
      startLocation: ramp,
      endLocation: highway,
      polyline: encodePolyline([ramp, highway]),
      travelMode: 'DRIVING',
    };

    const distance = routeMatchingService.distanceToUpcomingManeuver(here, current as any, next as any);
    const toRamp = calculateDistance(here, ramp);
    assert.ok(distance > 800, 'should still show miles to the ramp');
    assert.ok(Math.abs(distance - toRamp) < 80);
  });
});

describe('trackRouteProgress', () => {
  it('resolves steps against the locked leg, not always leg 0', () => {
    const a = { latitude: 41.4, longitude: -73.05 };
    const b = { latitude: 41.41, longitude: -73.05 };
    const c = { latitude: 41.42, longitude: -73.05 };
    const d = { latitude: 41.43, longitude: -73.05 };

    const makeStep = (
      id: string,
      start: { latitude: number; longitude: number },
      end: { latitude: number; longitude: number }
    ) => ({
      id,
      instruction: id,
      distance: 1000,
      duration: 60,
      startLocation: start,
      endLocation: end,
      polyline: encodePolyline([start, end]),
      travelMode: 'DRIVING',
    });

    const makeLeg = (
      start: { latitude: number; longitude: number },
      end: { latitude: number; longitude: number },
      steps: ReturnType<typeof makeStep>[]
    ) => ({
      steps,
      distance: 1000,
      duration: 60,
      startAddress: '',
      endAddress: '',
      startLocation: start,
      endLocation: end,
    });

    const route = {
      id: 'multi',
      legs: [
        makeLeg(a, b, [makeStep('leg0-step0', a, b)]),
        makeLeg(b, d, [makeStep('leg1-step0', b, c), makeStep('leg1-step1', c, d)]),
      ],
      overviewPolyline: encodePolyline([a, b, c, d]),
      summary: '',
      warnings: [],
      bounds: { northeast: d, southwest: a },
      totalDistance: 3000,
      totalDuration: 180,
      hasTolls: false,
      hasHighways: false,
    };

    const progress = routeMatchingService.trackRouteProgress(c, route as any, 1, 1);
    assert.equal(progress.currentLegIndex, 1);
    assert.equal(progress.currentStepIndex, 1);
  });
});
