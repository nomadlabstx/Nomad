/**
 * Reverse Geocoding Service
 * Convert GPS coordinates to city/state/address information
 */

import { getGoogleMapsApiKey } from '../utils/google-maps-key';
import { Coordinates } from '../types/navigation';
import { offlineCacheService } from './offline-cache';
import { networkStatusService } from './network-status';

interface ReverseGeocodeResult {
  city: string;
  state: string;
  stateCode: string; // e.g., "TX"
  country: string;
  formattedAddress: string;
}

class ReverseGeocodingService {
  private cache: Map<string, ReverseGeocodeResult> = new Map();

  /**
   * Get city and state from GPS coordinates
   * Uses offline cache when available
   */
  async getLocationInfo(coordinates: Coordinates): Promise<ReverseGeocodeResult> {
    const cacheKey = `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`;
    
    // Check in-memory cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check offline cache
    const cachedGeocode = await offlineCacheService.getCachedGeocode(coordinates);
    if (cachedGeocode) {
      console.log('[ReverseGeocoding] Using cached geocode');
      this.cache.set(cacheKey, cachedGeocode);
      return cachedGeocode;
    }

    // Check if we're online
    const isOnline = await networkStatusService.isOnline();
    if (!isOnline) {
      // Return default if offline and no cache
      return {
        city: 'Unknown',
        state: 'Unknown',
        stateCode: '',
        country: 'Unknown',
        formattedAddress: '',
      };
    }

    try {
      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) {
        return {
          city: 'Unknown',
          state: 'Unknown',
          stateCode: '',
          country: 'Unknown',
          formattedAddress: '',
        };
      }
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components;

        let city = '';
        let state = '';
        let stateCode = '';
        let country = '';

        // Extract city (locality or sublocality)
        const cityComponent = components.find((c: any) => 
          c.types.includes('locality') || c.types.includes('sublocality')
        );
        if (cityComponent) {
          city = cityComponent.long_name;
        }

        // Extract state
        const stateComponent = components.find((c: any) => 
          c.types.includes('administrative_area_level_1')
        );
        if (stateComponent) {
          state = stateComponent.long_name;
          stateCode = stateComponent.short_name;
        }

        // Extract country
        const countryComponent = components.find((c: any) => 
          c.types.includes('country')
        );
        if (countryComponent) {
          country = countryComponent.long_name;
        }

        const geocodeResult: ReverseGeocodeResult = {
          city: city || 'Unknown',
          state: state || 'Unknown',
          stateCode: stateCode || '',
          country: country || 'Unknown',
          formattedAddress: result.formatted_address || '',
        };

        // Cache in both in-memory and offline cache
        this.cache.set(cacheKey, geocodeResult);
        await offlineCacheService.cacheGeocode(coordinates, geocodeResult);

        return geocodeResult;
      }

      // Fallback if geocoding fails
      return {
        city: 'Unknown',
        state: 'Unknown',
        stateCode: '',
        country: 'Unknown',
        formattedAddress: '',
      };
    } catch (error) {
      console.error('[ReverseGeocoding] Error:', error);
      return {
        city: 'Unknown',
        state: 'Unknown',
        stateCode: '',
        country: 'Unknown',
        formattedAddress: '',
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export const reverseGeocodingService = new ReverseGeocodingService();

