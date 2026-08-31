import type { PlannedTrip } from '../types/planned-trips';
import type { RouteOptions, Coordinates } from './navigation';

export interface AIPlannerStop {
  name: string;
  location: Coordinates;
  duration?: string;
  notes?: string;
}

export interface PendingAITripPlan {
  stops: AIPlannerStop[];
  finalDestination: AIPlannerStop;
  routeOptions: RouteOptions;
  summary: string;
}

class AIPlannerContextService {
  private pendingPlan: PendingAITripPlan | null = null;

  setPendingPlan(plan: PendingAITripPlan): void {
    this.pendingPlan = plan;
  }

  consumePendingPlan(): PendingAITripPlan | null {
    const plan = this.pendingPlan;
    this.pendingPlan = null;
    return plan;
  }
}

export function pendingPlanFromPlannedTrip(trip: PlannedTrip): PendingAITripPlan {
  const options = trip.routeOptions as
    | (PlannedTrip['routeOptions'] & { optimizeWaypoints?: boolean })
    | undefined;

  return {
    stops: trip.stops.map((stop) => ({
      name: stop.name,
      location: stop.location,
    })),
    finalDestination: {
      name: trip.destination.name,
      location: trip.destination.location,
    },
    routeOptions: {
      avoidTolls: options?.avoidTolls,
      avoidHighways: options?.avoidHighways,
      optimizeWaypoints: Boolean(options?.optimizeWaypoints ?? options?.optimizeRoute),
    },
    summary: trip.aiSummary,
  };
}

export const aiPlannerContextService = new AIPlannerContextService();
