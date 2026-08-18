/**
 * Location Auto-Discovery Service
 * FROZEN (2026-06-20): Google Places auto-discovery disabled per DATA_STRATEGY_WIKIPEDIA.
 * GPS visits + Wikipedia fill gaps; no new Google Places bulk expansion.
 */

import type { Coordinates } from '../types/navigation';

export interface DiscoveredLocation {
  name: string;
  state: string;
  county: string;
  coordinates: Coordinates;
  population?: number;
  type: 'city' | 'town' | 'village' | 'neighborhood';
  confidence: 'high' | 'medium' | 'low';
}

class LocationAutoDiscoveryService {
  /** Disabled — see docs/DATA_STRATEGY_WIKIPEDIA.md */
  private readonly enabled = false;
  private discoveryCache = new Set<string>();
  private readonly MAX_DISCOVERY_RADIUS = 50000; // 50km
  private readonly MIN_DISCOVERY_RADIUS = 1000; // 1km

  /**
   * Auto-discover missing locations around a given point
   */
  async discoverNearbyLocations(centerCoordinates: Coordinates, radiusMeters: number = 10000): Promise<DiscoveredLocation[]> {
    if (!this.enabled) {
      return [];
    }
    try {
      console.log(`[AutoDiscovery] Discovering locations within ${radiusMeters}m of ${centerCoordinates.latitude}, ${centerCoordinates.longitude}`);
      return [];

    } catch (error) {
      console.error('[AutoDiscovery] Error discovering nearby locations:', error);
      return [];
    }
  }

  /**
   * Auto-discover locations for a specific city/region
   */
  async discoverLocationsForCity(cityName: string, stateCode: string): Promise<DiscoveredLocation[]> {
    if (!this.enabled) {
      return [];
    }
    try {
      console.log(`[AutoDiscovery] Discovering locations for ${cityName}, ${stateCode}`);
      return [];
    } catch (error) {
      console.error(`[AutoDiscovery] Error discovering locations for ${cityName}, ${stateCode}:`, error);
      return [];
    }
  }

  /**
   * Auto-discover locations for a specific state
   */
  async discoverLocationsForState(stateName: string, stateCode: string): Promise<DiscoveredLocation[]> {
    if (!this.enabled) {
      return [];
    }
    try {
      console.log(`[AutoDiscovery] Discovering locations for ${stateName}`);
      return [];

    } catch (error) {
      console.error(`[AutoDiscovery] Error discovering locations for ${stateName}:`, error);
      return [];
    }
  }

  /**
   * Auto-discover locations for the entire US
   */
  async discoverLocationsForUS(): Promise<DiscoveredLocation[]> {
    if (!this.enabled) {
      return [];
    }
    try {
      console.log('[AutoDiscovery] Starting comprehensive US location discovery...');
      return [];

    } catch (error) {
      console.error('[AutoDiscovery] Error discovering US locations:', error);
      return [];
    }
  }

  /**
   * Add discovered locations to the Explorer database
   */
  async addDiscoveredLocationsToDatabase(discoveredLocations: DiscoveredLocation[]): Promise<number> {
    try {
      console.log(`[AutoDiscovery] Adding ${discoveredLocations.length} discovered locations to database...`);
      
      let addedCount = 0;
      
      for (const location of discoveredLocations) {
        try {
          // Check if location already exists
          const existingLocation = await this.findExistingLocation(location);
          if (existingLocation) {
            console.log(`[AutoDiscovery] Location ${location.name} already exists, skipping`);
            continue;
          }

          // Add to Explorer database
          await this.addLocationToExplorer(location);
          addedCount++;
          
          console.log(`[AutoDiscovery] Added ${location.name}, ${location.state} to database`);
          
        } catch (error) {
          console.error(`[AutoDiscovery] Error adding location ${location.name}:`, error);
        }
      }

      console.log(`[AutoDiscovery] Successfully added ${addedCount} new locations to database`);
      return addedCount;

    } catch (error) {
      console.error('[AutoDiscovery] Error adding discovered locations to database:', error);
      return 0;
    }
  }

  /**
   * Check if a place is a locality (city, town, village)
   */
  private isLocality(place: any): boolean {
    const localityTypes = [
      'locality',
      'sublocality',
      'sublocality_level_1',
      'sublocality_level_2',
      'administrative_area_level_3',
      'administrative_area_level_4',
      'administrative_area_level_5'
    ];

    return place.types && place.types.some((type: string) => localityTypes.includes(type));
  }

  /**
   * Process a Google Place as a discovered location
   */
  private async processPlaceAsLocation(place: any): Promise<DiscoveredLocation | null> {
    try {
      // Extract location information from the place
      const name = place.name;
      const coordinates = place.coordinates;
      
      // Try to extract state and county from formatted address
      const addressParts = place.formattedAddress?.split(', ') || [];
      let state = '';
      let county = '';
      
      // Find state (usually second to last part)
      for (let i = addressParts.length - 2; i >= 0; i--) {
        const part = addressParts[i];
        if (this.isStateName(part)) {
          state = part;
          break;
        }
      }

      // For now, we'll use the state as the county (this can be improved with more sophisticated parsing)
      county = state;

      // Determine location type based on name and types
      let type: 'city' | 'town' | 'village' | 'neighborhood' = 'city';
      if (place.types?.includes('sublocality')) {
        type = 'neighborhood';
      } else if (name.toLowerCase().includes('village')) {
        type = 'village';
      } else if (name.toLowerCase().includes('town')) {
        type = 'town';
      }

      // Estimate population based on place rating and reviews (rough heuristic)
      let population: number | undefined;
      if (place.userRatingsTotal && place.rating) {
        // Very rough population estimate based on review count and rating
        population = Math.max(100, place.userRatingsTotal * 10);
      }

      return {
        name,
        state,
        county,
        coordinates,
        population,
        type,
        confidence: place.rating && place.rating >= 4.0 ? 'high' : 'medium'
      };

    } catch (error) {
      console.error('[AutoDiscovery] Error processing place as location:', error);
      return null;
    }
  }

  /**
   * Check if a string looks like a state name
   */
  private isStateName(str: string): boolean {
    const stateNames = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
      'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
      'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
      'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
      'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
      'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
    ];
    
    return stateNames.includes(str);
  }

  /**
   * Remove duplicate locations based on coordinates
   */
  private removeDuplicateLocations(locations: DiscoveredLocation[]): DiscoveredLocation[] {
    const seen = new Set<string>();
    const unique: DiscoveredLocation[] = [];

    for (const location of locations) {
      const key = `${location.coordinates.latitude},${location.coordinates.longitude}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(location);
      }
    }

    return unique;
  }

  /**
   * Find existing location in Explorer database
   */
  private async findExistingLocation(location: DiscoveredLocation): Promise<boolean> {
    try {
      // Lazy import to break require cycle
      const { explorerService } = require('./explorer');
      const explorerData = explorerService.getData();
      if (!explorerData) return false;

      // Check if location exists in the database
      for (const country of explorerData.countries) {
        for (const state of country.states) {
          if (state.name === location.state) {
            for (const county of state.counties) {
              if (county.name === location.county) {
                for (const city of county.cities) {
                  if (city.name === location.name) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('[AutoDiscovery] Error checking existing location:', error);
      return false;
    }
  }

  /**
   * Add location to Explorer database
   */
  private async addLocationToExplorer(location: DiscoveredLocation): Promise<void> {
    try {
      // Lazy import to break require cycle
      const { explorerService } = require('./explorer');
      // Use explorer service to add the discovered location
      await explorerService.addDiscoveredLocations([location]);
      console.log(`[AutoDiscovery] Added location to Explorer: ${location.name}, ${location.county}, ${location.state}`);
    } catch (error) {
      console.error('[AutoDiscovery] Error adding location to Explorer:', error);
    }
  }
}

// Export singleton instance
export const locationAutoDiscovery = new LocationAutoDiscoveryService();
