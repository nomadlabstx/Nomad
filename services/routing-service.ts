/**
 * Routing Service Abstraction
 * Provides unified routing interface that works with both Google Maps and Apple MapKit
 * Automatically selects the appropriate provider based on platform
 */

import { Platform } from 'react-native';
import type { Coordinates, Route, RouteOptions } from '../types/navigation';
import { mapkitRoutingService } from './mapkit-routing';
import { navigationService } from './navigation';

class RoutingService {
  /**
   * Calculate route using platform-appropriate service
   */
  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: RouteOptions = {}
  ): Promise<Route[]> {
    // Use Apple MapKit on iOS, Google Maps on Android/Web
    if (Platform.OS === 'ios') {
      try {
        // Try MapKit first (requires native implementation)
        return await mapkitRoutingService.calculateRoute(origin, destination, options);
      } catch (error) {
        // Fallback to Google Maps if MapKit not available
        console.warn('[RoutingService] MapKit not available, falling back to Google Maps:', error);
        return await navigationService.calculateRoute(origin, destination, options);
      }
    } else {
      // Android/Web: Use Google Maps
      return await navigationService.calculateRoute(origin, destination, options);
    }
  }

  /**
   * Get the current provider being used
   */
  getCurrentProvider(): 'mapkit' | 'google' {
    return Platform.OS === 'ios' ? 'mapkit' : 'google';
  }
}

export const routingService = new RoutingService();

