/**
 * Speed Limit Service
 * Fetches and manages speed limit data using Google Roads API
 */

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SpeedLimitData {
  speedLimit: number; // km/h
  units: 'mph' | 'km/h';
  location: Coordinates;
  timestamp: number;
}

class SpeedLimitService {
  private cache: Map<string, SpeedLimitData> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get speed limit for a location using Google Roads API
   */
  async getSpeedLimit(location: Coordinates): Promise<SpeedLimitData | null> {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    // Check cache first
    const cacheKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached;
    }

    try {
      // Use Google Roads API to get speed limit
      const params = new URLSearchParams({
        path: `${location.latitude},${location.longitude}`,
        key: GOOGLE_MAPS_API_KEY,
      });

      const url = `https://roads.googleapis.com/v1/speedLimits?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.speedLimits && data.speedLimits.length > 0) {
        const speedLimitInfo = data.speedLimits[0];
        
        const speedLimitData: SpeedLimitData = {
          speedLimit: speedLimitInfo.speedLimit,
          units: speedLimitInfo.units === 'MPH' ? 'mph' : 'km/h',
          location,
          timestamp: Date.now(),
        };

        // Cache the result
        this.cache.set(cacheKey, speedLimitData);

        return speedLimitData;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch speed limit:', error);
      return null;
    }
  }

  /**
   * Get speed limit status (under, at, over)
   */
  getSpeedStatus(
    currentSpeed: number, // m/s from GPS
    speedLimit: number, // km/h from API
    units: 'mph' | 'km/h'
  ): 'under' | 'at' | 'over' {
    // Convert current speed to km/h
    const speedKmh = currentSpeed * 3.6;
    
    // Convert speed limit to km/h if needed
    const limitKmh = units === 'mph' ? speedLimit * 1.60934 : speedLimit;

    // Allow 5 km/h buffer
    const buffer = 5;

    if (speedKmh < limitKmh - buffer) {
      return 'under';
    } else if (speedKmh > limitKmh + buffer) {
      return 'over';
    } else {
      return 'at';
    }
  }

  /**
   * Format speed for display
   */
  formatSpeed(speedMs: number, displayUnit: 'mph' | 'km/h'): string {
    if (displayUnit === 'mph') {
      const mph = speedMs * 2.23694;
      return `${Math.round(mph)} mph`;
    } else {
      const kmh = speedMs * 3.6;
      return `${Math.round(kmh)} km/h`;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const speedLimitService = new SpeedLimitService();
export default speedLimitService;

