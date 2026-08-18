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

export const aiPlannerContextService = new AIPlannerContextService();
