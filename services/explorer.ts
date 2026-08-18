/**
 * Explorer Service
 * Handles location tracking, geocoding, and explorer data management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_AK_HIGHWAYS } from '../data/ak-highways';
import { ALL_AL_HIGHWAYS } from '../data/al-highways';
import { ALL_AR_HIGHWAYS } from '../data/ar-highways';
import { ALL_AZ_HIGHWAYS } from '../data/az-highways';
import { ALL_CA_HIGHWAYS } from '../data/ca-highways';
import { ALL_CO_HIGHWAYS } from '../data/co-highways';
import { ALL_CT_HIGHWAYS } from '../data/ct-highways';
import { ALL_DE_HIGHWAYS } from '../data/de-highways';
import { ALL_FL_HIGHWAYS } from '../data/fl-highways';
import { ALL_GA_HIGHWAYS } from '../data/ga-highways';
import { ALL_HI_HIGHWAYS } from '../data/hi-highways';
import { ALL_IA_HIGHWAYS } from '../data/ia-highways';
import { ALL_ID_HIGHWAYS } from '../data/id-highways';
import { ALL_IL_HIGHWAYS } from '../data/il-highways';
import { ALL_IN_HIGHWAYS } from '../data/in-highways';
import { ALL_KS_HIGHWAYS } from '../data/ks-highways';
import { ALL_KY_HIGHWAYS } from '../data/ky-highways';
import { ALL_LA_HIGHWAYS } from '../data/la-highways';
import { ALL_MA_HIGHWAYS } from '../data/ma-highways';
import { ALL_MD_HIGHWAYS } from '../data/md-highways';
import { ALL_ME_HIGHWAYS } from '../data/me-highways';
import { ALL_MI_HIGHWAYS } from '../data/mi-highways';
import { ALL_MN_HIGHWAYS } from '../data/mn-highways';
import { ALL_MO_HIGHWAYS } from '../data/mo-highways';
import { ALL_MS_HIGHWAYS } from '../data/ms-highways';
import { ALL_MT_HIGHWAYS } from '../data/mt-highways';
import { ALL_NC_HIGHWAYS } from '../data/nc-highways';
import { ALL_ND_HIGHWAYS } from '../data/nd-highways';
import { ALL_NE_HIGHWAYS } from '../data/ne-highways';
import { ALL_NH_HIGHWAYS } from '../data/nh-highways';
import { ALL_NJ_HIGHWAYS } from '../data/nj-highways';
import { ALL_NM_HIGHWAYS } from '../data/nm-highways';
import { ALL_NV_HIGHWAYS } from '../data/nv-highways';
import { ALL_NY_HIGHWAYS } from '../data/ny-highways';
import { ALL_OH_HIGHWAYS } from '../data/oh-highways';
import { ALL_OK_HIGHWAYS } from '../data/ok-highways';
import { ALL_OR_HIGHWAYS } from '../data/or-highways';
import { ALL_PA_HIGHWAYS } from '../data/pa-highways';
import { ALL_RI_HIGHWAYS } from '../data/ri-highways';
import { ALL_SC_HIGHWAYS } from '../data/sc-highways';
import { ALL_SD_HIGHWAYS } from '../data/sd-highways';
import { ALL_TEXAS_HIGHWAYS } from '../data/texas-highways-complete';
import { TEXAS_HIGHWAY_EXITS } from '../data/texas-exits-mapping';
import { I95_CONNECTICUT_EXITS_WIKIPEDIA } from '../data/i95-connecticut-exits-wikipedia';
import { ALL_TN_HIGHWAYS } from '../data/tn-highways';
import { US_STATES_WITH_COUNTIES } from '../data/us-cities-index';
import { ALL_UT_HIGHWAYS } from '../data/ut-highways';
import { ALL_VA_HIGHWAYS } from '../data/va-highways';
import { ALL_VT_HIGHWAYS } from '../data/vt-highways';
import { ALL_WA_HIGHWAYS } from '../data/wa-highways';
import { ALL_WI_HIGHWAYS } from '../data/wi-highways';
import { ALL_WV_HIGHWAYS } from '../data/wv-highways';
import { ALL_WY_HIGHWAYS } from '../data/wy-highways';
import type {
    ExplorerCity,
    ExplorerCountry,
    ExplorerCounty,
    ExplorerData,
    ExplorerHighway,
    ExplorerState
} from '../types/explorer';
import { normalizeExitNumber } from '../utils/exit-labels';
import { locationAutoDiscovery } from './location-auto-discovery';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const EXPLORER_DATA_KEY = '@nomad_explorer_data';

interface GeocodingResult {
  country: string;
  countryCode: string;
  state?: string;
  county?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  route?: string;
}

class ExplorerService {
  private explorerData: ExplorerData | null = null;
  private lastVisitTimestamps: Map<string, number> = new Map(); // Track last visit time per location
  private readonly VISIT_DEBOUNCE_MS = 300000; // 5 minutes - only count as new visit if 5+ min since last

  /**
   * Initialize ALL Texas highways (pre-populated, not visited)
   */
  private initializeAllTexasHighways(): ExplorerHighway[] {
    return ALL_TEXAS_HIGHWAYS.map(hw => {
      // Get exit data for this highway if available
      const exitData = (TEXAS_HIGHWAY_EXITS[hw.id] || []).filter((exit) => {
        const lat = exit.coordinates?.latitude;
        const lng = exit.coordinates?.longitude;
        return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
      });
      
      // Convert exit data to ExplorerHighwayExit format
      const exits = exitData.map((exit, index) => ({
        id: `exit-${hw.id}-${exit.exitNumber}-${index}`,
        type: 'highway-exit' as const,
        highwayId: hw.id,
        exitNumber: normalizeExitNumber(exit.exitNumber),
        description: exit.description,
        coordinates: exit.coordinates,
        milepointStart: exit.milepointStart,
        milepointEnd: exit.milepointEnd,
        visited: false,
        firstVisited: undefined,
        lastVisited: undefined,
        visitCount: 0,
      }));
      
      return {
        id: hw.id,
        name: hw.name,
        type: 'highway',
        highwayType: hw.highwayType,
        number: hw.number,
        fullName: hw.fullName,
        states: hw.states,
        direction: hw.direction, // CRITICAL: Include direction for grouping
        parentHighwayId: hw.parentHighwayId, // CRITICAL: Include parent reference for grouping
        totalExits: hw.totalExits,
        exits: exits, // Populated from exit data
        visited: false,
        visitedExits: 0,
        completionPercent: 0,
        visitCount: 0,
      };
    });
  }

  /**
   * Initialize COMPLETE US DATA with all states, counties, and cities
   * Uses geocoded county data for 50 states, 3,143 counties, 19,394 cities
   */
  private initializeAllUSLocations(): ExplorerCountry[] {
    console.log('[ExplorerService] Loading complete US data from geocoded database...');
    
    const unitedStates: ExplorerCountry = {
      id: 'country-US',
      name: 'United States',
      type: 'country',
      isoCode: 'US',
      visited: false,
      visitCount: 0,
      states: [],
      completionPercent: 0,
    };

    // Convert geocoded US data to Explorer format
    let totalCities = 0;
    let totalCounties = 0;
    
    for (const stateData of US_STATES_WITH_COUNTIES) {
      const explorerState: ExplorerState = {
        id: `state-US-${stateData.code}`,
        name: stateData.name,
        type: 'state',
        countryId: unitedStates.id,
        visited: false,
        visitCount: 0,
        counties: [],
        highways: stateData.code === 'TX'
          ? this.initializeAllTexasHighways()
          : stateData.code === 'CT'
          ? this.initializeAllCTHighways()
          : stateData.code === 'CA'
          ? this.initializeAllCAHighways()
          : stateData.code === 'FL'
          ? this.initializeAllFLHighways()
          : stateData.code === 'NY'
          ? this.initializeAllNYHighways()
          : [],
        completionPercent: 0,
      };

      // Convert all counties in this state
      for (const countyData of stateData.counties) {
        totalCounties++;
        const explorerCounty: ExplorerCounty = {
          id: `county-${stateData.code}-${countyData.name.replace(/\s+/g, '-').replace(/'/g, '').toLowerCase()}`,
          name: countyData.name,
          type: 'county',
          stateId: explorerState.id,
          visited: false,
          visitCount: 0,
          cities: [],
          completionPercent: 0,
        };

        // Convert all cities in this county
        for (const cityData of countyData.cities) {
          totalCities++;
          const explorerCity: ExplorerCity = {
            id: `city-${stateData.code}-${countyData.name.replace(/\s+/g, '-')}-${cityData.name.replace(/\s+/g, '-')}-${cityData.latitude.toFixed(4)}`.toLowerCase().replace(/'/g, ''),
            name: cityData.name,
            type: 'city',
            countyId: explorerCounty.id,
            visited: false,
            visitCount: 0,
            latitude: cityData.latitude,
            longitude: cityData.longitude,
            population: cityData.population,
            streets: [],
            landmarks: [],
            completionPercent: 0,
          };
          explorerCounty.cities.push(explorerCity);
        }

        explorerState.counties.push(explorerCounty);
      }

      unitedStates.states.push(explorerState);
    }

    console.log(`[ExplorerService] Complete US data loaded: ${unitedStates.states.length} states, ${totalCounties} counties, ${totalCities} cities`);
    return [unitedStates];
  }

  /**
   * Initialize explorer data from storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(EXPLORER_DATA_KEY);
      console.log('[ExplorerService] Initializing... stored data:', stored ? 'EXISTS' : 'NONE');
      
      if (stored) {
        this.explorerData = JSON.parse(stored);
        console.log('[ExplorerService] Loaded data - countries:', this.explorerData?.countries?.length || 0);
        
        // Log Texas state info
        const texas = this.explorerData?.countries?.[0]?.states?.find(s => s.name === 'Texas');
        if (texas) {
          const mclennan = texas.counties?.find(c => c.name === 'McLennan County');
          console.log('[ExplorerService] McLennan County status:', mclennan ? { visited: mclennan.visited, cities: mclennan.cities.length } : 'NOT FOUND');
        }
        
        // Migration: Update to complete US data if needed
        const needsUSUpdate = !this.explorerData?.countries ||
                              this.explorerData.countries.length === 0 ||
                              (this.explorerData.countries[0]?.states?.length || 0) <= 1; // Old data had only Texas
        
        console.log('[ExplorerService] Needs US update?', needsUSUpdate, 'States:', this.explorerData?.countries?.[0]?.states?.length);
        
        if (needsUSUpdate) {
          console.log('[ExplorerService] Upgrading to complete US data...');
          const oldCountries = this.explorerData?.countries || [];
          const newCountries = this.initializeAllUSLocations();
          
          // Merge old visited data into new structure
          for (const oldCountry of oldCountries) {
            const newCountry = newCountries.find(c => c.id === oldCountry.id);
            if (newCountry) {
              newCountry.visited = oldCountry.visited;
              newCountry.firstVisited = oldCountry.firstVisited;
              newCountry.lastVisited = oldCountry.lastVisited;
              newCountry.visitCount = oldCountry.visitCount;
              
              for (const oldState of oldCountry.states) {
                const newState = newCountry.states.find(s => s.id === oldState.id);
                if (newState) {
                  newState.visited = oldState.visited;
                  newState.firstVisited = oldState.firstVisited;
                  newState.lastVisited = oldState.lastVisited;
                  newState.visitCount = oldState.visitCount;
                  
                  for (const oldCounty of oldState.counties) {
                    const newCounty = newState.counties.find(c => c.id === oldCounty.id);
                    if (newCounty) {
                      newCounty.visited = oldCounty.visited;
                      newCounty.firstVisited = oldCounty.firstVisited;
                      newCounty.lastVisited = oldCounty.lastVisited;
                      newCounty.visitCount = oldCounty.visitCount;
                      newCounty.completionPercent = oldCounty.completionPercent;
                      
                      for (const oldCity of oldCounty.cities) {
                        const newCity = newCounty.cities.find(c => c.id === oldCity.id);
                        if (newCity) {
                          newCity.visited = oldCity.visited;
                          newCity.firstVisited = oldCity.firstVisited;
                          newCity.lastVisited = oldCity.lastVisited;
                          newCity.visitCount = oldCity.visitCount;
                          newCity.completionPercent = oldCity.completionPercent;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          
          console.log('[ExplorerService] Merged old visit data into new structure');
          
          // Add Texas highways
          const texasState = newCountries[0]?.states.find(s => s.id === 'state-US-TX');
          if (texasState) {
            texasState.highways = this.initializeAllTexasHighways();
            console.log('[ExplorerService] Added', texasState.highways.length, 'highways to Texas');
          }
          
          this.explorerData!.countries = newCountries;
          console.log('[ExplorerService] US data upgrade complete!');
        }
        
        await this.save();
      } else {
        // Initialize with COMPLETE US DATA
        console.log('[ExplorerService] No stored data, creating fresh with complete US coverage...');
        
        const countries = this.initializeAllUSLocations();
        console.log('[ExplorerService] Created countries:', countries.length);
        
        // Add Texas highways
        const texasState = countries[0]?.states.find(s => s.id === 'state-US-TX');
        if (texasState) {
          texasState.highways = this.initializeAllTexasHighways();
          console.log('[ExplorerService] Added', texasState.highways.length, 'highways to Texas');
        }

        // Calculate total locations
        const totalCities = countries[0]?.states.reduce((sum, s) => 
          sum + s.counties.reduce((csum, c) => csum + c.cities.length, 0), 0) || 0;
        const totalHighways = 118; // Texas highways
        
        console.log('[ExplorerService] Initial totals:', totalCities, 'cities +', totalHighways, 'highways');

        this.explorerData = {
          countries,
          highways: [],
          landmarks: [], // Will be populated as discovered
          lastUpdated: Date.now(),
          totalLocations: totalCities + totalHighways,
          visitedLocations: 0,
          globalCompletionPercent: 0,
          filters: {
            streets: { enabled: true, minSignificance: 'major' },
            landmarks: {
              enabled: true,
              excludeChains: true,
              minRating: 4.0,
              categories: {
                naturalFeatures: true,
                historicSites: true,
                governmentBuildings: true,
                universities: true,
                hospitals: true,
                stadiums: true,
                airports: true,
                attractions: true,
              },
            },
            display: {
              visibilityMode: 'all' as const, // Show both discovered and undiscovered
              showVisitCounts: true,
              groupByCategory: true,
              sortBy: 'name' as const,
            },
          },
        };
        await this.save();
      }
    } catch (error) {
      console.error('Failed to initialize explorer data:', error);
      throw error;
    }
  }

  /**
   * Save explorer data to storage
   */
  private async save(): Promise<void> {
    if (!this.explorerData) return;

    try {
      this.explorerData.lastUpdated = Date.now();
      await AsyncStorage.setItem(EXPLORER_DATA_KEY, JSON.stringify(this.explorerData));
    } catch (error) {
      console.error('Failed to save explorer data:', error);
    }
  }

  /**
   * Get all explorer data
   */
  getData(): ExplorerData | null {
    return this.explorerData;
  }

  /**
   * Reverse geocode coordinates to location hierarchy
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&result_type=street_address|route|neighborhood|locality|administrative_area_level_2|administrative_area_level_1|country`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        return null;
      }

      // Parse address components
      const result = data.results[0];
      const components = result.address_components;

      const geocodingResult: GeocodingResult = {
        country: '',
        countryCode: '',
      };

      for (const component of components) {
        const types = component.types;

        if (types.includes('country')) {
          geocodingResult.country = component.long_name;
          geocodingResult.countryCode = component.short_name;
        } else if (types.includes('administrative_area_level_1')) {
          geocodingResult.state = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          geocodingResult.county = component.long_name;
        } else if (types.includes('locality')) {
          geocodingResult.city = component.long_name;
        } else if (types.includes('neighborhood') || types.includes('sublocality')) {
          geocodingResult.neighborhood = component.long_name;
        } else if (types.includes('route')) {
          geocodingResult.street = component.long_name;
        }
      }

      return geocodingResult;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Record a location visit
   */
  async recordVisit(latitude: number, longitude: number): Promise<boolean> {
    if (!this.explorerData) {
      await this.initialize();
    }

    try {
      // Reverse geocode the location
      const location = await this.reverseGeocode(latitude, longitude);
      if (!location || !location.country) {
        return false;
      }

      console.log('[ExplorerService] Geocoding result:', {
        city: location.city,
        county: location.county,
        state: location.state,
        country: location.country,
      });

      // Update explorer data hierarchy
      this.updateHierarchy(location);

      // Fetch Wikipedia summaries for visited places (non-blocking)
      void this.enrichVisitWithWikipedia(location);

      // Check and record highway visit
      const highwayId = await this.detectHighway(latitude, longitude);
      if (highwayId) {
        await this.recordHighwayVisit(highwayId);
      }

      // Auto-discover nearby locations if this is a new area
      await this.autoDiscoverNearbyLocations(latitude, longitude, location);

      // Save changes
      await this.save();

      return true;
    } catch (error) {
      console.error('Failed to record visit:', error);
      return false;
    }
  }


  /**
   * Attach Wikipedia article excerpts to visited city/county/state nodes
   */
  private async enrichVisitWithWikipedia(location: GeocodingResult): Promise<void> {
    if (!this.explorerData || location.countryCode !== 'US') return;

    try {
      const { wikipediaService } = await import('./wikipedia');
      const country = this.explorerData.countries.find((c) => c.isoCode === location.countryCode);
      const state = country?.states.find((s) => s.name === location.state);
      const county = state?.counties.find((c) => c.name === location.county);
      const city = county?.cities.find((c) => c.name === location.city);

      if (location.city && city && !city.wikiExtract) {
        const summary = await wikipediaService.getPlaceSummary(location.city, location.state, 'city');
        if (summary) {
          city.wikiTitle = summary.title;
          city.wikiExtract = summary.extract;
          city.wikiPageUrl = summary.pageUrl;
          await this.save();
        }
      }

      if (location.county && county && !county.wikiExtract) {
        const summary = await wikipediaService.getPlaceSummary(location.county, location.state, 'county');
        if (summary) {
          county.wikiTitle = summary.title;
          county.wikiExtract = summary.extract;
          county.wikiPageUrl = summary.pageUrl;
          await this.save();
        }
      }

      if (location.state && state && !state.wikiExtract) {
        const summary = await wikipediaService.getPlaceSummary(location.state, undefined, 'state');
        if (summary) {
          state.wikiTitle = summary.title;
          state.wikiExtract = summary.extract;
          state.wikiPageUrl = summary.pageUrl;
          await this.save();
        }
      }
    } catch (error) {
      console.warn('[ExplorerService] Wikipedia enrichment skipped:', error);
    }
  }

  /**
   * Auto-discover nearby locations when visiting a new area
   */
  private async autoDiscoverNearbyLocations(
    latitude: number, 
    longitude: number, 
    currentLocation: GeocodingResult
  ): Promise<void> {
    try {
      // Only auto-discover for US locations
      if (currentLocation.countryCode !== 'US') {
        return;
      }

      // Check if we should discover locations (avoid too frequent discoveries)
      const discoveryKey = `${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
      const lastDiscovery = this.lastVisitTimestamps.get(`discovery_${discoveryKey}`);
      const now = Date.now();
      
      // Only discover if we haven't discovered in this area in the last 24 hours
      if (lastDiscovery && (now - lastDiscovery) < 86400000) { // 24 hours
        return;
      }

      console.log('[ExplorerService] Auto-discovering nearby locations...');
      
      // Discover nearby locations using Google Places API
      const discoveredLocations = await locationAutoDiscovery.discoverNearbyLocations(
        { latitude, longitude },
        20000 // 20km radius
      );

      if (discoveredLocations.length > 0) {
        console.log(`[ExplorerService] Discovered ${discoveredLocations.length} new locations`);
        
        // Add discovered locations to the database
        await this.addDiscoveredLocations(discoveredLocations);
        
        // Update discovery timestamp
        this.lastVisitTimestamps.set(`discovery_${discoveryKey}`, now);
      }

    } catch (error) {
      console.error('[ExplorerService] Error in auto-discovery:', error);
    }
  }

  /**
   * Add discovered locations to the Explorer database
   */
  async addDiscoveredLocations(discoveredLocations: any[]): Promise<void> {
    if (!this.explorerData) return;

    for (const location of discoveredLocations) {
      try {
        // Find or create the state
        let state = this.explorerData.countries[0]?.states.find(s => s.name === location.state);
        if (!state) {
          // Create new state
          state = {
            id: `state_${location.state.toLowerCase().replace(/\s+/g, '_')}`,
            name: location.state,
            type: 'state',
            countryId: this.explorerData!.countries[0].id,
            visited: false,
            firstVisited: undefined,
            lastVisited: undefined,
            visitCount: 0,
            completionPercent: 0,
            counties: [],
            highways: []
          };
          this.explorerData!.countries[0].states.push(state);
        }

        // Find or create the county
        let county = state?.counties.find(c => c.name === location.county);
        if (!county) {
          // Create new county
          county = {
            id: `county_${location.county.toLowerCase().replace(/\s+/g, '_')}`,
            name: location.county,
            type: 'county',
            stateId: state?.id || '',
            visited: false,
            firstVisited: undefined,
            lastVisited: undefined,
            visitCount: 0,
            completionPercent: 0,
            cities: []
          };
          state?.counties.push(county);
        }

        // Check if city already exists
        const existingCity = county?.cities.find(c => c.name === location.name);
        if (!existingCity) {
          // Add new city
                 const newCity: ExplorerCity = {
                   id: `city_${location.name.toLowerCase().replace(/\s+/g, '_')}`,
                   name: location.name,
                   type: 'city',
                   countyId: county?.id || '',
                   state: location.state,
                   county: location.county,
                   latitude: location.coordinates.latitude,
                   longitude: location.coordinates.longitude,
                   visited: false,
                    firstVisited: undefined,
                    lastVisited: undefined,
                   visitCount: 0,
                   completionPercent: 0,
                   population: location.population,
                   cityType: location.type,
                   confidence: location.confidence,
                   streets: [],
                   landmarks: []
                 };
          county?.cities.push(newCity);
          
          console.log(`[ExplorerService] Added discovered location: ${location.name}, ${location.county}, ${location.state}`);
        }

      } catch (error) {
        console.error(`[ExplorerService] Error adding discovered location ${location.name}:`, error);
      }
    }
    
    // Save changes after adding all locations
    await this.save();
    this.recalculateStats();
  }

  /**
   * Update explorer hierarchy with new visit
   */
  private updateHierarchy(location: GeocodingResult): void {
    if (!this.explorerData) return;

    const timestamp = Date.now();

    // Find or create country
    let country = this.explorerData.countries.find(
      (c) => c.isoCode === location.countryCode
    );

    if (!country) {
      country = {
        id: `country-${location.countryCode}`,
        name: location.country,
        type: 'country',
        isoCode: location.countryCode,
        visited: true,
        firstVisited: timestamp,
        lastVisited: timestamp,
        visitCount: 1,
        states: [],
        completionPercent: 0,
      };
      this.explorerData.countries.push(country);
    } else {
      country.visited = true;
      country.lastVisited = timestamp;
      country.visitCount++;
    }

    // Handle state if available
    if (location.state) {
      let state = country.states.find((s) => s.name === location.state);

      if (!state) {
        state = {
          id: `state-${location.countryCode}-${location.state.replace(/\s+/g, '-')}`,
          name: location.state,
          type: 'state',
          countryId: country.id,
          visited: true,
          firstVisited: timestamp,
          lastVisited: timestamp,
          visitCount: 1,
          counties: [],
          highways: [],
          completionPercent: 0,
        };
        country.states.push(state);
      } else {
        state.visited = true;
        state.lastVisited = timestamp;
        state.visitCount++;
      }

      // Handle county if available
      if (location.county) {
        let county = state?.counties.find((c) => c.name === location.county);

        if (!county) {
          console.log(`[ExplorerService] County "${location.county}" not found in state "${state?.name}". Creating new county.`);
          console.log(`[ExplorerService] Available counties in ${state?.name}:`, state?.counties.map(c => c.name).slice(0, 10));
          county = {
            id: `county-${state?.id}-${location.county.replace(/\s+/g, '-')}`,
            name: location.county,
            type: 'county',
            stateId: state?.id || '',
            visited: true,
            firstVisited: timestamp,
            lastVisited: timestamp,
            visitCount: 1,
            cities: [],
            completionPercent: 0,
          };
          state?.counties.push(county);
        } else {
          console.log(`[ExplorerService] Found existing county "${location.county}" in state "${state?.name}". Marking as visited.`);
          console.log(`[ExplorerService] County before update:`, { visited: county.visited, visitCount: county.visitCount });
          county.visited = true;
          county.lastVisited = timestamp;
          county.visitCount++;
          console.log(`[ExplorerService] County after update:`, { visited: county.visited, visitCount: county.visitCount });
        }

        // Handle city if available
        if (location.city) {
          let city = county.cities.find((c) => c.name === location.city);

          if (!city) {
            city = {
              id: `city-${county.id}-${location.city.replace(/\s+/g, '-')}`,
              name: location.city,
              type: 'city',
              countyId: county.id,
              visited: true,
              firstVisited: timestamp,
              lastVisited: timestamp,
              visitCount: 1,
              streets: [],
              landmarks: [],
              completionPercent: 0,
            };
            county.cities.push(city);
          } else {
            city.visited = true;
            city.lastVisited = timestamp;
            city.visitCount++;
          }

          // Update county completion percentage
          const visitedCities = county.cities.filter(c => c.visited).length;
          county.completionPercent = county.cities.length > 0 ? (visitedCities / county.cities.length) * 100 : 0;

          // Handle street if available
          if (location.street) {
            let street = city.streets.find((s) => s.name === location.street);

            if (!street) {
              street = {
                id: `street-${city.id}-${location.street.replace(/\s+/g, '-')}`,
                name: location.street,
                type: 'street',
                cityId: city.id,
                visited: true,
                firstVisited: timestamp,
                lastVisited: timestamp,
                visitCount: 1,
                significance: 'Auto-detected',
              };
              city.streets.push(street);
              this.lastVisitTimestamps.set(street.id, timestamp);
            } else {
              street.visited = true;
              street.lastVisited = timestamp;
              
              // Only increment visit count if it's been 5+ minutes since last visit
              const lastVisit = this.lastVisitTimestamps.get(street.id) || 0;
              if (timestamp - lastVisit >= this.VISIT_DEBOUNCE_MS) {
                street.visitCount++;
                this.lastVisitTimestamps.set(street.id, timestamp);
              }
            }
          }
        }
      }
    }

    // Recalculate statistics
    this.recalculateStats();
  }

  /**
   * Recalculate completion statistics
   */
  private recalculateStats(): void {
    if (!this.explorerData) return;

    let totalLocations = 0;
    let visitedLocations = 0;

    for (const country of this.explorerData.countries) {
      totalLocations++;
      if (country.visited) visitedLocations++;

      for (const state of country.states) {
        totalLocations++;
        if (state.visited) visitedLocations++;

        for (const county of state.counties) {
          totalLocations++;
          if (county.visited) visitedLocations++;

          for (const city of county.cities) {
            totalLocations++;
            if (city.visited) visitedLocations++;

            for (const street of city.streets) {
              totalLocations++;
              if (street.visited) visitedLocations++;
            }
          }
        }
      }
    }

    this.explorerData.totalLocations = totalLocations;
    this.explorerData.visitedLocations = visitedLocations;
    this.explorerData.globalCompletionPercent =
      totalLocations > 0 ? Math.round((visitedLocations / totalLocations) * 100) : -1;
  }

  /**
   * Clear all explorer data
   */
  async clearAll(): Promise<void> {
    this.explorerData = {
      countries: [],
      highways: [],
      landmarks: [],
      lastUpdated: Date.now(),
      totalLocations: 0,
      visitedLocations: 0,
      globalCompletionPercent: 0,
      filters: {
        streets: { enabled: true, minSignificance: 'major' },
        landmarks: { enabled: true, excludeChains: true, minRating: 4.0 },
        display: { showVisited: true, showUnvisited: true }
      }
    };
    await this.save();
  }

  /**
   * Get statistics for display
   */
  getStats(): {
    totalLocations: number;
    visitedLocations: number;
    completionPercent: number;
    completionPercentKnown: boolean;
    countriesVisited: number;
    statesVisited: number;
    countiesVisited: number;
    citiesVisited: number;
    highwaysVisited: number;
  } {
    if (!this.explorerData) {
      return {
        totalLocations: 0,
        visitedLocations: 0,
        completionPercent: 0,
        completionPercentKnown: false,
        countriesVisited: 0,
        statesVisited: 0,
        countiesVisited: 0,
        citiesVisited: 0,
        highwaysVisited: 0,
      };
    }

    let countriesVisited = 0;
    let statesVisited = 0;
    let countiesVisited = 0;
    let citiesVisited = 0;
    let highwaysVisited = 0;

    for (const country of this.explorerData.countries) {
      if (country.visited) countriesVisited++;

      for (const state of country.states) {
        if (state.visited) statesVisited++;

        for (const county of state.counties) {
          if (county.visited) countiesVisited++;
          for (const city of county.cities) {
            if (city.visited) citiesVisited++;
          }
        }

        // Count visited highways
        for (const highway of state.highways) {
          if (highway.visited) highwaysVisited++;
        }
      }
    }

    return {
      totalLocations: this.explorerData.totalLocations,
      visitedLocations: this.explorerData.visitedLocations,
      completionPercent: Math.max(0, this.explorerData.globalCompletionPercent),
      completionPercentKnown: this.explorerData.globalCompletionPercent >= 0,
      countriesVisited,
      statesVisited,
      countiesVisited,
      citiesVisited,
      highwaysVisited,
    };
  }

  /**
   * Check if current location is on a highway
   * Returns highway ID if on highway, null otherwise
   */
  async detectHighway(latitude: number, longitude: number): Promise<string | null> {
    const geocodingResult = await this.reverseGeocode(latitude, longitude);
    if (!geocodingResult || !geocodingResult.route) return null;

    const route = geocodingResult.route.toUpperCase();
    
    // Check for interstate
    if (route.includes('I-') || route.includes('INTERSTATE')) {
      const match = route.match(/(?:I-|INTERSTATE\s+)(\d+)/);
      if (match) return `interstate-${match[1]}`;
    }
    
    // Check for US highway
    if (route.includes('US') || route.includes('HIGHWAY')) {
      const match = route.match(/(?:US|HIGHWAY)\s+(\d+)/);
      if (match) return `us-${match[1]}`;
    }
    
    // Check for TX highways
    if (route.includes('TX') || route.includes('SH')) {
      const match = route.match(/(?:TX|SH)\s+(\d+)/);
      if (match) return `tx-${match[1]}`;
    }
    
    // Check for FM roads
    if (route.includes('FM') || route.includes('FARM')) {
      const match = route.match(/(?:FM|FARM)\s+(\d+)/);
      if (match) return `fm-${match[1]}`;
    }
    
    return null;
  }

  /**
   * Record highway visit
   */
  async recordHighwayVisit(highwayId: string): Promise<void> {
    if (!this.explorerData) await this.initialize();
    if (!this.explorerData) return;

    // Find the Texas state (all our highways are under Texas for now)
    const texasState = this.explorerData.countries
      .find(c => c.isoCode === 'US')
      ?.states.find(s => s.id === 'state-us-tx');
    
    if (!texasState) return;

    // Initialize highways array if not exists
    if (!texasState.highways) {
      texasState.highways = [];
    }

    // Find or create highway
    let highway = texasState.highways.find(h => h.id === highwayId);
    
    if (!highway) {
      // Import highway data
      const { getHighwayById } = await import('../data/us-highways');
      const highwayData = getHighwayById(highwayId);
      
      if (!highwayData) return;

      highway = {
        ...highwayData,
        visited: false,
        visitCount: 0,
        exits: [],
        visitedExits: 0,
        completionPercent: 0,
      };
      
      texasState.highways.push(highway);
    }

    // Update visit data
    const now = Date.now();
    if (!highway.visited) {
      highway.visited = true;
      highway.firstVisited = now;
      this.explorerData.visitedLocations++;
    }
    highway.lastVisited = now;
    highway.visitCount++;

    await this.save();
  }

  /**
   * Get all highways (from all states)
   */
  getHighways() {
    if (!this.explorerData) return [];
    
    const allHighways: ExplorerHighway[] = [];
    for (const country of this.explorerData.countries) {
      for (const state of country.states) {
        if (state.highways) {
          allHighways.push(...state.highways);
        }
      }
    }
    return allHighways;
  }

  /**
   * Get highway progress
   */
  getHighwayProgress(highwayId: string) {
    const allHighways = this.getHighways();
    const highway = allHighways.find(h => h.id === highwayId);
    if (!highway) return null;

    return {
      name: highway.fullName,
      visited: highway.visited,
      totalExits: highway.totalExits,
      visitedExits: highway.visitedExits,
      completionPercent: highway.completionPercent,
      visitCount: highway.visitCount,
    };
  }

  /**
   * Update filter settings
   */
  async updateFilters(newFilters: Partial<ExplorerData['filters']>): Promise<void> {
    if (!this.explorerData) {
      await this.initialize();
    }

    if (!this.explorerData) return;

    // Deep merge filters
    this.explorerData.filters = {
      streets: {
        ...this.explorerData.filters?.streets,
        ...newFilters.streets,
      },
      landmarks: {
        ...this.explorerData.filters?.landmarks,
        ...newFilters.landmarks,
        categories: {
          ...this.explorerData.filters?.landmarks?.categories,
          ...newFilters.landmarks?.categories,
        },
      },
      display: {
        ...this.explorerData.filters?.display,
        ...newFilters.display,
      },
    };

    await this.save();
  }

  /**
   * Get current filters
   */
  getFilters() {
    return this.explorerData?.filters;
  }


  /**
   * Initialize Alaska highways
   */
  private initializeAllAKHighways(): ExplorerHighway[] {
    return ALL_AK_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Alabama highways
   */
  private initializeAllALHighways(): ExplorerHighway[] {
    return ALL_AL_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Arkansas highways
   */
  private initializeAllARHighways(): ExplorerHighway[] {
    return ALL_AR_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Arizona highways
   */
  private initializeAllAZHighways(): ExplorerHighway[] {
    return ALL_AZ_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize California highways
   */
  private initializeAllCAHighways(): ExplorerHighway[] {
    return ALL_CA_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Colorado highways
   */
  private initializeAllCOHighways(): ExplorerHighway[] {
    return ALL_CO_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Connecticut highways
   */
  private initializeAllCTHighways(): ExplorerHighway[] {
    return ALL_CT_HIGHWAYS.map((hw) => {
      const exitSource =
        hw.id === 'interstate-95' ? I95_CONNECTICUT_EXITS_WIKIPEDIA.exits : [];
      const exits = exitSource.map((exit, index) => ({
        id: `exit-${hw.id}-${exit.exitNumber}-${index}`,
        type: 'highway-exit' as const,
        highwayId: hw.id,
        exitNumber: normalizeExitNumber(exit.exitNumber),
        description: exit.description,
        coordinates: exit.coordinates,
        milepointStart: exit.milepointStart,
        milepointEnd: undefined,
        visited: false,
        firstVisited: undefined,
        lastVisited: undefined,
        visitCount: 0,
      }));

      return {
        ...hw,
        visited: false,
        firstVisited: undefined,
        lastVisited: undefined,
        visitCount: 0,
        exits,
        totalExits: exits.length > 0 ? exits.length : hw.totalExits,
        visitedExits: 0,
        completionPercent: 0,
      };
    });
  }

  /**
   * Initialize Delaware highways
   */
  private initializeAllDEHighways(): ExplorerHighway[] {
    return ALL_DE_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Florida highways
   */
  private initializeAllFLHighways(): ExplorerHighway[] {
    return ALL_FL_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Georgia highways
   */
  private initializeAllGAHighways(): ExplorerHighway[] {
    return ALL_GA_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Hawaii highways
   */
  private initializeAllHIHighways(): ExplorerHighway[] {
    return ALL_HI_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Iowa highways
   */
  private initializeAllIAHighways(): ExplorerHighway[] {
    return ALL_IA_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Idaho highways
   */
  private initializeAllIDHighways(): ExplorerHighway[] {
    return ALL_ID_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Illinois highways
   */
  private initializeAllILHighways(): ExplorerHighway[] {
    return ALL_IL_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Indiana highways
   */
  private initializeAllINHighways(): ExplorerHighway[] {
    return ALL_IN_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Kansas highways
   */
  private initializeAllKSHighways(): ExplorerHighway[] {
    return ALL_KS_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Kentucky highways
   */
  private initializeAllKYHighways(): ExplorerHighway[] {
    return ALL_KY_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Louisiana highways
   */
  private initializeAllLAHighways(): ExplorerHighway[] {
    return ALL_LA_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Massachusetts highways
   */
  private initializeAllMAHighways(): ExplorerHighway[] {
    return ALL_MA_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Maryland highways
   */
  private initializeAllMDHighways(): ExplorerHighway[] {
    return ALL_MD_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Maine highways
   */
  private initializeAllMEHighways(): ExplorerHighway[] {
    return ALL_ME_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Michigan highways
   */
  private initializeAllMIHighways(): ExplorerHighway[] {
    return ALL_MI_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Minnesota highways
   */
  private initializeAllMNHighways(): ExplorerHighway[] {
    return ALL_MN_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Missouri highways
   */
  private initializeAllMOHighways(): ExplorerHighway[] {
    return ALL_MO_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Mississippi highways
   */
  private initializeAllMSHighways(): ExplorerHighway[] {
    return ALL_MS_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Montana highways
   */
  private initializeAllMTHighways(): ExplorerHighway[] {
    return ALL_MT_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize North Carolina highways
   */
  private initializeAllNCHighways(): ExplorerHighway[] {
    return ALL_NC_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize North Dakota highways
   */
  private initializeAllNDHighways(): ExplorerHighway[] {
    return ALL_ND_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Nebraska highways
   */
  private initializeAllNEHighways(): ExplorerHighway[] {
    return ALL_NE_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize New Hampshire highways
   */
  private initializeAllNHHighways(): ExplorerHighway[] {
    return ALL_NH_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize New Jersey highways
   */
  private initializeAllNJHighways(): ExplorerHighway[] {
    return ALL_NJ_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize New Mexico highways
   */
  private initializeAllNMHighways(): ExplorerHighway[] {
    return ALL_NM_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Nevada highways
   */
  private initializeAllNVHighways(): ExplorerHighway[] {
    return ALL_NV_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize New York highways
   */
  private initializeAllNYHighways(): ExplorerHighway[] {
    return ALL_NY_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Ohio highways
   */
  private initializeAllOHHighways(): ExplorerHighway[] {
    return ALL_OH_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Oklahoma highways
   */
  private initializeAllOKHighways(): ExplorerHighway[] {
    return ALL_OK_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Oregon highways
   */
  private initializeAllORHighways(): ExplorerHighway[] {
    return ALL_OR_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Pennsylvania highways
   */
  private initializeAllPAHighways(): ExplorerHighway[] {
    return ALL_PA_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Rhode Island highways
   */
  private initializeAllRIHighways(): ExplorerHighway[] {
    return ALL_RI_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize South Carolina highways
   */
  private initializeAllSCHighways(): ExplorerHighway[] {
    return ALL_SC_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize South Dakota highways
   */
  private initializeAllSDHighways(): ExplorerHighway[] {
    return ALL_SD_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Tennessee highways
   */
  private initializeAllTNHighways(): ExplorerHighway[] {
    return ALL_TN_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Texas highways
   */
  private initializeAllTXHighways(): ExplorerHighway[] {
    return ALL_TEXAS_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Utah highways
   */
  private initializeAllUTHighways(): ExplorerHighway[] {
    return ALL_UT_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Virginia highways
   */
  private initializeAllVAHighways(): ExplorerHighway[] {
    return ALL_VA_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Vermont highways
   */
  private initializeAllVTHighways(): ExplorerHighway[] {
    return ALL_VT_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Washington highways
   */
  private initializeAllWAHighways(): ExplorerHighway[] {
    return ALL_WA_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Wisconsin highways
   */
  private initializeAllWIHighways(): ExplorerHighway[] {
    return ALL_WI_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize West Virginia highways
   */
  private initializeAllWVHighways(): ExplorerHighway[] {
    return ALL_WV_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

  /**
   * Initialize Wyoming highways
   */
  private initializeAllWYHighways(): ExplorerHighway[] {
    return ALL_WY_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }

}

// Export singleton instance
export const explorerService = new ExplorerService();
export default explorerService;

