/**
 * Navigation Types
 * Shared types for navigation services
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteOptions {
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
  waypoints?: Coordinates[];
  optimizeWaypoints?: boolean;
}

export interface RouteStep {
  id: string;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  startLocation: Coordinates;
  endLocation: Coordinates;
  polyline: string;
  maneuver?: string; // turn-left, turn-right, etc.
  travelMode: string;
  lanes?: LaneInfo[]; // Lane guidance information
  landmark?: any; // Prominent landmark near turn point
}

export interface LaneInfo {
  lanes: Lane[];
  lanesActive: boolean[];
}

export interface Lane {
  indications: string[]; // e.g., ["left", "through"]
  valid: boolean; // Should user be in this lane
}

export interface RouteLeg {
  steps: RouteStep[];
  distance: number; // meters
  duration: number; // seconds
  startAddress: string;
  endAddress: string;
  startLocation: Coordinates;
  endLocation: Coordinates;
}

export interface Route {
  id: string;
  legs: RouteLeg[];
  overviewPolyline: string;
  summary: string;
  warnings: string[];
  bounds: {
    northeast: Coordinates;
    southwest: Coordinates;
  };
  totalDistance: number; // meters
  totalDuration: number; // seconds
  totalDurationInTraffic?: number; // seconds with current traffic
  hasTolls: boolean;
  hasHighways: boolean;
  hasTrafficDelays?: boolean;
  trafficDelay?: number; // seconds
  trafficLevel?: 'clear' | 'moderate' | 'heavy';
  trafficIntervals?: Array<{
    startPolylinePointIndex: number;
    endPolylinePointIndex: number;
    speed: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';
  }>;
}

export interface NavigationState {
  isNavigating: boolean;
  currentRoute: Route;
  currentStepIndex: number;
  currentLegIndex: number;
  distanceToNextTurn: number; // meters
  timeToDestination: number; // seconds
  distanceRemaining: number; // meters
  nextInstruction: string;
  currentManeuver?: string;
  lanes?: LaneInfo[];
}

// Import PlaceResult from google-places
export type { PlaceResult } from '../services/google-places';
