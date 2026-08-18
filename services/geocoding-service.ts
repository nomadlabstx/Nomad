/**
 * Geocoding Service Abstraction
 * Provides unified geocoding interface that works with both Google Maps and Apple MapKit
 * Automatically selects the appropriate provider based on platform
 */

import { Platform } from 'react-native';
import type { Coordinates } from '../types/navigation';
import { mapkitGeocodingService, type ReverseGeocodeResult } from './mapkit-geocoding';
import { reverseGeocodingService } from './reverse-geocoding';

class GeocodingService {
  /**
   * Get location info from coordinates using platform-appropriate service
   */
  async getLocationInfo(coordinates: Coordinates): Promise<ReverseGeocodeResult> {
    // Use Apple MapKit on iOS, Google Maps on Android/Web
    if (Platform.OS === 'ios') {
      try {
        // Try MapKit first (requires native implementation)
        return await mapkitGeocodingService.getLocationInfo(coordinates);
      } catch (error) {
        // Fallback to Google Maps if MapKit not available
        console.warn('[GeocodingService] MapKit not available, falling back to Google Maps:', error);
        return await reverseGeocodingService.getLocationInfo(coordinates);
      }
    } else {
      // Android/Web: Use Google Maps
      return await reverseGeocodingService.getLocationInfo(coordinates);
    }
  }

  /**
   * Get the current provider being used
   */
  getCurrentProvider(): 'mapkit' | 'google' {
    return Platform.OS === 'ios' ? 'mapkit' : 'google';
  }
}

export const geocodingService = new GeocodingService();

