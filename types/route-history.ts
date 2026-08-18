/**
 * Route History Types
 */

import type { Coordinates, Route } from './navigation';

export interface SavedRoute {
  id: string;
  name: string;
  origin: Coordinates;
  destination: Coordinates;
  waypoints?: Coordinates[];
  route: Route;
  createdAt: number;
  lastUsed?: number;
  useCount: number;
  distance: number; // meters
  duration: number; // seconds
}

