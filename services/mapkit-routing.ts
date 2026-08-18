/**
 * Apple MapKit Directions API Service
 * Provides routing using Apple's MapKit API (iOS native)
 * 
 * Note: MapKit API is free up to 250k requests/month
 * No API key needed - uses app bundle ID for authentication
 */

import type { Coordinates, Route, RouteLeg, RouteOptions, RouteStep } from '../types/navigation';

// MapKit Directions API endpoint
const MAPKIT_DIRECTIONS_URL = 'https://maps-api.apple.com/v1/directions';

interface MapKitRouteResponse {
  routes: Array<{
    distance: number; // meters
    expectedTravelTime: number; // seconds
    polyline: {
      coordinates: Array<[number, number]>; // [longitude, latitude]
    };
    steps: Array<{
      distance: number; // meters
      expectedTravelTime: number; // seconds
      instructions: string;
      transportType: string;
      polyline: {
        coordinates: Array<[number, number]>;
      };
    }>;
  }>;
}

class MapKitRoutingService {
  /**
   * Calculate route using Apple MapKit Directions API
   * Note: This requires the app to be running on iOS with proper entitlements
   */
  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: RouteOptions = {}
  ): Promise<Route[]> {
    try {
      // Build waypoints array (origin, waypoints, destination)
      const waypoints: Coordinates[] = [origin];
      if (options.waypoints && options.waypoints.length > 0) {
        waypoints.push(...options.waypoints);
      }
      waypoints.push(destination);

      // MapKit API request
      const requestBody = {
        origin: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        transportType: 'automobile',
        // Note: MapKit doesn't support waypoint optimization or alternatives
        // We can only request a single route
      };

      // Add waypoints if provided (MapKit supports intermediate waypoints)
      if (options.waypoints && options.waypoints.length > 0) {
        (requestBody as any).waypoints = options.waypoints.map(wp => ({
          latitude: wp.latitude,
          longitude: wp.longitude,
        }));
      }

      // Add route options
      const avoid: string[] = [];
      if (options.avoidTolls) avoid.push('tolls');
      if (options.avoidHighways) avoid.push('highways');
      if (options.avoidFerries) avoid.push('ferries');
      if (avoid.length > 0) {
        (requestBody as any).avoid = avoid;
      }

      // Call native MapKit Directions module
      try {
        const { NativeModules } = require('react-native');
        const { MapKitDirections } = NativeModules;
        
        if (!MapKitDirections) {
          throw new Error('MapKitDirections native module not available');
        }
        
        const routeData = await MapKitDirections.calculateRoute(
          requestBody.origin,
          requestBody.destination,
          (requestBody as any).waypoints || null,
          (requestBody as any).avoid || null
        );
        
        // Parse the route response
        return [this.parseRoute(routeData, 0)];
      } catch (nativeError) {
        // If native module fails, fall back to Google Maps
        console.warn('[MapKitRouting] Native module error, falling back to Google Maps:', nativeError);
        throw new Error('MapKit routing not available, falling back to Google Maps.');
      }

    } catch (error) {
      console.error('[MapKitRouting] Failed to calculate route:', error);
      throw error;
    }
  }

  /**
   * Parse MapKit route response to our Route format
   */
  private parseRoute(routeData: any, index: number): Route {
    const legs = this.parseLegs(routeData);
    
    const totalDistance = routeData.distance || 0;
    const totalDuration = routeData.expectedTravelTime || 0;
    const coords = routeData.polyline?.coordinates || [];

    return {
      id: `mapkit-route-${index}`,
      legs,
      overviewPolyline: this.encodePolyline(coords),
      summary: `Route via MapKit`,
      warnings: [],
      bounds: this.calculateBounds(coords),
      totalDistance,
      totalDuration,
      totalDurationInTraffic: totalDuration, // MapKit doesn't provide separate traffic time
      hasTolls: false, // Would need to check route options
      hasHighways: false, // Would need to analyze steps
      hasTrafficDelays: false,
      trafficLevel: 'clear',
    };
  }

  /**
   * Parse route legs
   */
  private parseLegs(routeData: any): RouteLeg[] {
    // MapKit returns steps directly, we need to group them into legs
    // For simplicity, treat all steps as one leg
    const steps = (routeData.steps || []).map((step: any, index: number) => 
      this.parseStep(step, index)
    );

    const coords = routeData.polyline?.coordinates || [];
    if (!Array.isArray(coords) || coords.length === 0) {
      throw new Error('MapKit route is missing polyline coordinates');
    }
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    return [{
      steps,
      distance: routeData.distance || 0,
      duration: routeData.expectedTravelTime || 0,
      startAddress: '',
      endAddress: '',
      startLocation: {
        latitude: startCoord[1],
        longitude: startCoord[0],
      },
      endLocation: {
        latitude: endCoord[1],
        longitude: endCoord[0],
      },
    }];
  }

  /**
   * Parse route step
   */
  private parseStep(step: any, index: number): RouteStep {
    const coords = step.polyline?.coordinates || [];
    if (!Array.isArray(coords) || coords.length === 0) {
      throw new Error(`MapKit step ${index} is missing polyline coordinates`);
    }
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    return {
      id: `mapkit-step-${index}`,
      instruction: step.instructions || '',
      distance: step.distance || 0,
      duration: step.expectedTravelTime || 0,
      startLocation: {
        latitude: startCoord[1],
        longitude: startCoord[0],
      },
      endLocation: {
        latitude: endCoord[1],
        longitude: endCoord[0],
      },
      polyline: this.encodePolyline(coords),
      maneuver: this.extractManeuver(step.instructions || ''),
      travelMode: 'driving',
    };
  }

  /**
   * Extract maneuver type from instruction text
   */
  private extractManeuver(instruction: string): string {
    const lower = instruction.toLowerCase();
    if (lower.includes('turn left')) return 'turn-left';
    if (lower.includes('turn right')) return 'turn-right';
    if (lower.includes('straight')) return 'straight';
    if (lower.includes('u-turn')) return 'uturn';
    if (lower.includes('merge')) return 'merge';
    if (lower.includes('ramp')) return 'ramp';
    return 'straight';
  }

  /**
   * Encode coordinates to polyline string
   */
  private encodePolyline(coordinates: Array<[number, number]>): string {
    let encoded = '';
    let prevLat = 0;
    let prevLng = 0;

    for (const [lng, lat] of coordinates) {
      const latE5 = Math.round(lat * 1e5);
      const lngE5 = Math.round(lng * 1e5);
      encoded += this.encodeValue(latE5 - prevLat);
      encoded += this.encodeValue(lngE5 - prevLng);
      prevLat = latE5;
      prevLng = lngE5;
    }

    return encoded;
  }

  /**
   * Encode an integer microdegree delta for polyline
   */
  private encodeValue(value: number): string {
    let n = value < 0 ? ~(value << 1) : value << 1;
    let encoded = '';
    while (n >= 0x20) {
      encoded += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    encoded += String.fromCharCode(n + 63);
    return encoded;
  }

  /**
   * Calculate bounds from coordinates
   */
  private calculateBounds(coordinates: Array<[number, number]>): {
    northeast: Coordinates;
    southwest: Coordinates;
  } {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const [lng, lat] of coordinates) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }

    return {
      northeast: { latitude: maxLat, longitude: maxLng },
      southwest: { latitude: minLat, longitude: minLng },
    };
  }
}

export const mapkitRoutingService = new MapKitRoutingService();

