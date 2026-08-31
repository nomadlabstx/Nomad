import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pendingPlanFromPlannedTrip } from '../../services/ai-planner-context.ts';
import type { PlannedTrip } from '../../types/planned-trips.ts';

describe('pendingPlanFromPlannedTrip', () => {
  it('keeps intermediate stops so GPS can rebuild the multi-stop route', () => {
    const trip = {
      id: 'p1',
      title: 'Weekend',
      createdAt: 1,
      origin: { name: 'Home', location: { latitude: 41.4, longitude: -73.05 } },
      destination: { name: 'Yale', location: { latitude: 41.31, longitude: -72.92 } },
      stops: [
        { name: "Friend's house", location: { latitude: 41.38, longitude: -73.07 } },
      ],
      aiSummary: 'Drive over',
      estimatedDuration: '40m',
      estimatedDistance: 20,
      routeOptions: { avoidTolls: true, optimizeRoute: true },
      status: 'planned',
    } as PlannedTrip;

    const plan = pendingPlanFromPlannedTrip(trip);
    assert.equal(plan.finalDestination.name, 'Yale');
    assert.equal(plan.stops.length, 1);
    assert.equal(plan.stops[0].name, "Friend's house");
    assert.equal(plan.routeOptions.avoidTolls, true);
    assert.equal(plan.routeOptions.optimizeWaypoints, true);
  });
});
