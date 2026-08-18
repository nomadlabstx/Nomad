/**
 * Planned Trips Types
 * For saving AI-generated trip plans for later use
 */

import type { Coordinates } from './navigation';
import type { Booking } from './booking';

export interface PlannedTripStop {
  name: string;
  location: Coordinates;
  description?: string;
  estimatedDuration?: string; // e.g., "2 hours", "30 minutes"
  activities?: string[];
  recommendations?: string[];
}

export interface PlannedTrip {
  id: string;
  title: string;
  createdAt: number;
  scheduledDate?: number; // Optional - when user plans to take the trip
  origin: {
    name: string;
    location: Coordinates;
  };
  destination: {
    name: string;
    location: Coordinates;
  };
  stops: PlannedTripStop[];
  aiSummary: string; // Full AI-generated plan text
  estimatedDuration: string; // Total trip duration
  estimatedDistance: number; // Total miles
  routeOptions?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    optimizeRoute?: boolean;
  };
  tags?: string[]; // e.g., ["weekend", "family", "food tour"]
  status: 'planned' | 'in-progress' | 'completed';
  bookings?: Booking[]; // Associated bookings
}

export interface PlannedTripsData {
  trips: PlannedTrip[];
  lastUpdated: number;
}

