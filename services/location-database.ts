/**
 * Location Database Service
 * Provides verified location data for AI accuracy enhancement
 */

import type {
    AIGuidance,
    CityData,
    LocationInfo,
    NearbyCity
} from '../types/location-database';

import {
    TOURIST_DESTINATIONS
} from '../data/us-cities';

// Legacy Census bulk data archived — see data/archive/README.md
// Pathfinder AI uses tourist destinations + GPS context; no runtime Census import.

class LocationDatabaseService {
  private allCities: CityData[];
  private initialized: boolean = false;

  constructor() {
    this.allCities = [];
  }

  /**
   * Initialize the location database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Tourist destinations only (Census bulk frozen in data/archive/)
    this.allCities = [
      ...TOURIST_DESTINATIONS,
    ];

    console.log(`📍 Location Database initialized with ${this.allCities.length} tourist destinations (Wikipedia-first strategy)`);
    this.initialized = true;
  }

  /**
   * Find a city by name and state
   */
  findCity(cityName: string, stateCodeOrName?: string): CityData | null {
    const normalizedCity = cityName.toLowerCase().trim();
    const normalizedState = stateCodeOrName?.toLowerCase().trim();

    return this.allCities.find(city => {
      const nameMatch = city.name.toLowerCase() === normalizedCity;
      
      if (!normalizedState) return nameMatch;
      
      const stateMatch = 
        city.stateCode.toLowerCase() === normalizedState ||
        city.state.toLowerCase() === normalizedState;
      
      return nameMatch && stateMatch;
    }) || null;
  }

  /**
   * Extract city name from a location string
   * Handles: "Austin, TX", "Austin, Texas", "Austin", "in Dallas", etc.
   */
  extractCityFromLocation(location: string): { city: string; state?: string } | null {
    // Remove common prefixes
    let cleaned = location
      .replace(/^(in|near|around|at)\s+/i, '')
      .trim();

    // Check for "City, State" format
    const commaMatch = cleaned.match(/^([^,]+),\s*([A-Z]{2}|[a-zA-Z\s]+)$/i);
    if (commaMatch) {
      return {
        city: commaMatch[1].trim(),
        state: commaMatch[2].trim(),
      };
    }

    // Single word/phrase (just city name)
    return { city: cleaned };
  }

  /**
   * Get comprehensive location information
   */
  getLocationInfo(location: string): LocationInfo | null {
    const extracted = this.extractCityFromLocation(location);
    if (!extracted) return null;

    const city = this.findCity(extracted.city, extracted.state);
    if (!city) return null;

    const nearbyMajorCities = this.findNearbyMajorCities(city, 100); // Within 100 miles
    const aiGuidance = this.generateAIGuidance(city, nearbyMajorCities);

    return {
      city,
      nearbyMajorCities,
      aiGuidance,
    };
  }

  /**
   * Check if a city is in the database
   */
  isKnownLocation(location: string): boolean {
    const extracted = this.extractCityFromLocation(location);
    if (!extracted) return false;
    
    const city = this.findCity(extracted.city, extracted.state);
    return city !== null;
  }

  /**
   * Find nearby major cities for context
   */
  private findNearbyMajorCities(city: CityData, maxDistanceMiles: number): NearbyCity[] {
    const majorCities = this.allCities.filter(c => 
      c.size === 'major' && c.name !== city.name
    );

    const nearby = majorCities
      .map(majorCity => {
        const distance = this.calculateDistance(
          city.coordinates.latitude,
          city.coordinates.longitude,
          majorCity.coordinates.latitude,
          majorCity.coordinates.longitude
        );

        return {
          name: majorCity.name,
          distance: Math.round(distance),
          population: majorCity.population,
          direction: this.getDirection(city.coordinates, majorCity.coordinates),
        };
      })
      .filter(nearby => nearby.distance <= maxDistanceMiles)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3); // Top 3 nearest

    return nearby;
  }

  /**
   * Generate AI guidance based on city data
   */
  private generateAIGuidance(city: CityData, nearbyMajorCities: NearbyCity[]): AIGuidance {
    const { size, confidence, population, isTouristDestination } = city;

    let shouldBeSpecific = false;
    let recommendedBehavior = '';
    let context = '';

    // Tourist destinations: High confidence even if small
    if (isTouristDestination) {
      shouldBeSpecific = true;
      context = `${city.name} is a well-known tourist destination. You should have extensive knowledge about attractions, hotels, and dining options.`;
      recommendedBehavior = 'Provide specific, detailed recommendations with confidence. Include popular attractions, dining options, and practical travel advice.';
      return { shouldBeSpecific, confidenceLevel: 'high', recommendedBehavior, context };
    }

    // Major cities: Always be specific
    if (size === 'major') {
      shouldBeSpecific = true;
      context = `${city.name} is a major US city with ${population.toLocaleString()} residents. You should have comprehensive data.`;
      recommendedBehavior = 'Provide specific business names, addresses, prices, and detailed recommendations. Be confident and comprehensive.';
      return { shouldBeSpecific, confidenceLevel: 'high', recommendedBehavior, context };
    }

    // Medium cities: Moderate specificity
    if (size === 'medium') {
      shouldBeSpecific = true;
      context = `${city.name} is a medium-sized city with ${population.toLocaleString()} residents. You likely have good general knowledge but may lack some specific details.`;
      recommendedBehavior = 'Provide recommendations when confident, but acknowledge if you lack current specific business data. Focus on well-known chains and landmarks.';
      return { shouldBeSpecific, confidenceLevel: 'medium', recommendedBehavior, context };
    }

    // Small towns/villages: Be honest
    const nearestMajor = nearbyMajorCities[0];
    context = `${city.name} is a ${size} with ${population.toLocaleString()} residents. This is a small community where you likely have LIMITED or OUTDATED specific business information.`;
    
    if (nearestMajor) {
      context += ` The nearest major city is ${nearestMajor.name}, about ${nearestMajor.distance} miles ${nearestMajor.direction}.`;
      recommendedBehavior = `
**CRITICAL ACCURACY MODE:**
1. START by acknowledging: "I have limited current information about specific businesses in ${city.name}."
2. Provide GENERAL guidance for small ${city.state} towns
3. Suggest checking ${nearestMajor.name} (${nearestMajor.distance} miles away) for more options
4. Recommend: "Check Google Maps for current local businesses and reviews"
5. Focus on TYPES of places (local diners, pizza shops) NOT specific names
6. NEVER invent business names or addresses
7. Offer to help with navigation once user finds a place
      `.trim();
    } else {
      recommendedBehavior = `
**CRITICAL ACCURACY MODE:**
1. Be honest: "I don't have detailed current information about ${city.name}"
2. Provide general guidance for small ${city.state} communities
3. Suggest checking online resources for current local information
4. Focus on general advice, not specific recommendations
5. NEVER guess at business names or details
      `.trim();
    }

    return { 
      shouldBeSpecific: false, 
      confidenceLevel: 'low', 
      recommendedBehavior, 
      context,
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in miles
   */
  private calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get compass direction from point A to point B
   */
  private getDirection(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): string {
    const dLon = to.longitude - from.longitude;
    const dLat = to.latitude - from.latitude;
    const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
    
    // Normalize to 0-360
    const normalized = (angle + 360) % 360;
    
    // Convert to compass direction
    if (normalized < 22.5 || normalized >= 337.5) return 'north';
    if (normalized < 67.5) return 'northeast';
    if (normalized < 112.5) return 'east';
    if (normalized < 157.5) return 'southeast';
    if (normalized < 202.5) return 'south';
    if (normalized < 247.5) return 'southwest';
    if (normalized < 292.5) return 'west';
    return 'northwest';
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get statistics about the database
   */
  getStats() {
    return {
      totalCities: this.allCities.length,
      majorCities: this.allCities.filter(c => c.size === 'major').length,
      mediumCities: this.allCities.filter(c => c.size === 'medium').length,
      smallCities: this.allCities.filter(c => c.size === 'small').length,
      villages: this.allCities.filter(c => c.size === 'village').length,
      touristDestinations: this.allCities.filter(c => c.isTouristDestination).length,
    };
  }
}

// Export singleton instance
export const locationDatabase = new LocationDatabaseService();


