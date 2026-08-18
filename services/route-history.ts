/**
 * Route History Service
 * Manages saved routes for quick navigation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coordinates, Route } from '../types/navigation';
import type { SavedRoute } from '../types/route-history';
import { formatTripName, isWeakRouteName } from '../utils/trip-names';

const ROUTE_HISTORY_KEY = '@nomad_route_history';

class RouteHistoryService {
  private routes: SavedRoute[] = [];
  private initialized = false;

  /**
   * Initialize route history from storage
   */
  async initialize(force = false): Promise<void> {
    if (this.initialized && !force) return;

    try {
      const stored = await AsyncStorage.getItem(ROUTE_HISTORY_KEY);
      if (stored) {
        this.routes = JSON.parse(stored);
      } else if (force) {
        this.routes = [];
      }
      this.initialized = true;
    } catch (error) {
      console.error('[RouteHistory] Failed to initialize:', error);
      this.routes = [];
      this.initialized = true;
    }
  }

  /**
   * Save routes to storage
   */
  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(this.routes));
    } catch (error) {
      console.error('[RouteHistory] Failed to save:', error);
    }
  }

  /**
   * Generate a route name from a destination label or the route's end address.
   */
  private generateRouteName(route: Route, destinationName?: string): string {
    const fromLegs = route.legs[route.legs.length - 1]?.endAddress;
    return formatTripName(destinationName || fromLegs);
  }

  /**
   * Save a route to history
   */
  async saveRoute(
    origin: Coordinates,
    destination: Coordinates,
    route: Route,
    waypoints?: Coordinates[],
    name?: string
  ): Promise<SavedRoute> {
    await this.initialize();

    const friendlyName = this.generateRouteName(route, name);

    // Check if similar route already exists (same origin/destination within 100m)
    const existingRoute = this.routes.find(r => {
      const originDist = this.calculateDistance(r.origin, origin);
      const destDist = this.calculateDistance(r.destination, destination);
      return originDist < 100 && destDist < 100;
    });

    if (existingRoute) {
      existingRoute.route = route;
      existingRoute.lastUsed = Date.now();
      existingRoute.useCount = (existingRoute.useCount || 0) + 1;
      existingRoute.distance = route.totalDistance;
      existingRoute.duration = route.totalDuration;
      if (waypoints) existingRoute.waypoints = waypoints;
      if (friendlyName && isWeakRouteName(existingRoute.name) && !isWeakRouteName(friendlyName)) {
        existingRoute.name = friendlyName;
      }
      await this.save();
      return existingRoute;
    }

    const savedRoute: SavedRoute = {
      id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: friendlyName,
      origin,
      destination,
      waypoints,
      route,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      useCount: 1,
      distance: route.totalDistance,
      duration: route.totalDuration,
    };

    this.routes.unshift(savedRoute); // Add to beginning
    
    // Keep only last 50 routes
    if (this.routes.length > 50) {
      this.routes = this.routes.slice(0, 50);
    }

    await this.save();
    return savedRoute;
  }

  /**
   * Get all saved routes
   */
  async getAllRoutes(): Promise<SavedRoute[]> {
    await this.initialize(true);
    return [...this.routes];
  }

  /**
   * Get most used routes
   */
  async getMostUsedRoutes(limit: number = 10): Promise<SavedRoute[]> {
    await this.initialize();
    return [...this.routes]
      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
      .slice(0, limit);
  }

  /**
   * Get recently used routes
   */
  async getRecentRoutes(limit: number = 10): Promise<SavedRoute[]> {
    await this.initialize();
    return [...this.routes]
      .sort((a, b) => (b.lastUsed || b.createdAt) - (a.lastUsed || a.createdAt))
      .slice(0, limit);
  }

  /**
   * Delete a route
   */
  async deleteRoute(id: string): Promise<boolean> {
    await this.initialize();

    const index = this.routes.findIndex(r => r.id === id);
    if (index === -1) return false;

    this.routes.splice(index, 1);
    await this.save();

    return true;
  }

  /**
   * Update route name
   */
  async updateRouteName(id: string, name: string): Promise<boolean> {
    await this.initialize();

    const route = this.routes.find(r => r.id === id);
    if (!route) return false;

    route.name = name;
    await this.save();

    return true;
  }

  /**
   * Record route usage
   */
  async recordUsage(id: string): Promise<void> {
    await this.initialize();

    const route = this.routes.find(r => r.id === id);
    if (route) {
      route.lastUsed = Date.now();
      route.useCount = (route.useCount || 0) + 1;
      await this.save();
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const routeHistoryService = new RouteHistoryService();

