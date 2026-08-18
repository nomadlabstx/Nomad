/**
 * Offline Cache Service
 * Caches routes, geocoding results, and other data for offline use
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coordinates, Route } from '../types/navigation';

const CACHE_PREFIX = '@nomad_offline_cache_';
const ROUTE_CACHE_KEY = `${CACHE_PREFIX}routes`;
const GEOCODE_CACHE_KEY = `${CACHE_PREFIX}geocoding`;
const CACHE_EXPIRY_DAYS = 30; // Cache expires after 30 days

interface CachedRoute {
  origin: Coordinates;
  destination: Coordinates;
  route: Route;
  cachedAt: number;
  expiresAt: number;
}

interface CachedGeocode {
  coordinates: Coordinates;
  result: {
    city: string;
    state: string;
    stateCode: string;
    country: string;
    formattedAddress: string;
  };
  cachedAt: number;
  expiresAt: number;
}

class OfflineCacheService {
  private routeCache: Map<string, CachedRoute> = new Map();
  private geocodeCache: Map<string, CachedGeocode> = new Map();
  private initialized = false;

  /**
   * Initialize cache from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load route cache
      const routeData = await AsyncStorage.getItem(ROUTE_CACHE_KEY);
      if (routeData) {
        const routes: CachedRoute[] = JSON.parse(routeData);
        routes.forEach(route => {
          const key = this.getRouteCacheKey(route.origin, route.destination);
          this.routeCache.set(key, route);
        });
      }

      // Load geocode cache
      const geocodeData = await AsyncStorage.getItem(GEOCODE_CACHE_KEY);
      if (geocodeData) {
        const geocodes: CachedGeocode[] = JSON.parse(geocodeData);
        geocodes.forEach(geocode => {
          const key = this.getGeocodeCacheKey(geocode.coordinates);
          this.geocodeCache.set(key, geocode);
        });
      }

      // Clean expired entries
      this.cleanExpiredEntries();

      this.initialized = true;
    } catch (error) {
      console.warn('[OfflineCache] Failed to initialize:', error);
      this.initialized = true;
    }
  }

  /**
   * Get cache key for route
   */
  private getRouteCacheKey(origin: Coordinates, destination: Coordinates): string {
    return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}_${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
  }

  /**
   * Get cache key for geocode
   */
  private getGeocodeCacheKey(coordinates: Coordinates): string {
    return `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`;
  }

  /**
   * Cache a route
   */
  async cacheRoute(origin: Coordinates, destination: Coordinates, route: Route): Promise<void> {
    try {
      if (!this.initialized) await this.initialize();
      const key = this.getRouteCacheKey(origin, destination);
      const cachedRoute: CachedRoute = {
        origin,
        destination,
        route,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      };

      this.routeCache.set(key, cachedRoute);
      await this.saveRouteCache();
    } catch (error) {
      console.warn('[OfflineCache] Failed to cache route:', error);
    }
  }

  /**
   * Get cached route
   */
  async getCachedRoute(origin: Coordinates, destination: Coordinates): Promise<Route | null> {
    if (!this.initialized) await this.initialize();

    const key = this.getRouteCacheKey(origin, destination);
    const cached = this.routeCache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.routeCache.delete(key);
      await this.saveRouteCache();
      return null;
    }

    return cached.route;
  }

  /**
   * Cache geocode result
   */
  async cacheGeocode(
    coordinates: Coordinates,
    result: CachedGeocode['result']
  ): Promise<void> {
    try {
      if (!this.initialized) await this.initialize();
      const key = this.getGeocodeCacheKey(coordinates);
      const cached: CachedGeocode = {
        coordinates,
        result,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      };

      this.geocodeCache.set(key, cached);
      await this.saveGeocodeCache();
    } catch (error) {
      console.warn('[OfflineCache] Failed to cache geocode:', error);
    }
  }

  /**
   * Get cached geocode
   */
  async getCachedGeocode(coordinates: Coordinates): Promise<CachedGeocode['result'] | null> {
    if (!this.initialized) await this.initialize();

    const key = this.getGeocodeCacheKey(coordinates);
    const cached = this.geocodeCache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.geocodeCache.delete(key);
      await this.saveGeocodeCache();
      return null;
    }

    return cached.result;
  }

  /**
   * Save route cache to storage
   */
  private async saveRouteCache(): Promise<void> {
    try {
      const routes = Array.from(this.routeCache.values());
      await AsyncStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(routes));
    } catch (error) {
      console.warn('[OfflineCache] Failed to save route cache:', error);
    }
  }

  /**
   * Save geocode cache to storage
   */
  private async saveGeocodeCache(): Promise<void> {
    try {
      const geocodes = Array.from(this.geocodeCache.values());
      await AsyncStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(geocodes));
    } catch (error) {
      console.warn('[OfflineCache] Failed to save geocode cache:', error);
    }
  }

  /**
   * Clean expired entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();

    // Clean routes
    for (const [key, cached] of this.routeCache.entries()) {
      if (now > cached.expiresAt) {
        this.routeCache.delete(key);
      }
    }

    // Clean geocodes
    for (const [key, cached] of this.geocodeCache.entries()) {
      if (now > cached.expiresAt) {
        this.geocodeCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    this.routeCache.clear();
    this.geocodeCache.clear();
    await AsyncStorage.removeItem(ROUTE_CACHE_KEY);
    await AsyncStorage.removeItem(GEOCODE_CACHE_KEY);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    routeCount: number;
    geocodeCount: number;
    totalSize: number;
  } {
    return {
      routeCount: this.routeCache.size,
      geocodeCount: this.geocodeCache.size,
      totalSize: this.routeCache.size + this.geocodeCache.size,
    };
  }
}

export const offlineCacheService = new OfflineCacheService();

