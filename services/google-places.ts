/**
 * Google Places API Service (New API v1)
 * Provides access to 200M+ places worldwide for recommendations and landmarks
 * 
 * Migration: This service uses the NEW Google Places API (v1)
 * All endpoints use places.googleapis.com/v1 with X-Goog-Api-Key header
 */

import type { Coordinates } from '../types/navigation';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Place types supported by Google Places API (New)
export type PlaceType = 
  | 'restaurant' | 'cafe' | 'bar'
  | 'lodging' | 'hotel'
  | 'gas_station' | 'parking'
  | 'grocery_or_supermarket' | 'shopping_mall'
  | 'atm' | 'bank'
  | 'hospital' | 'pharmacy'
  | 'tourist_attraction' | 'museum' | 'park' | 'amusement_park'
  | 'gym' | 'movie_theater' | 'night_club'
  | 'airport' | 'bus_station' | 'train_station'
  | 'school' | 'library' | 'post_office'
  | 'store' | 'point_of_interest';

export interface PlacePhoto {
  name: string; // Resource name for the photo
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri: string;
    photoUri: string;
  }>;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress?: string;
  coordinates: Coordinates;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
  types: string[];
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  openNow?: boolean;
  photos?: PlacePhoto[];
  shortFormattedAddress?: string;
  distance?: number; // Distance in meters (added for nearby searches)
}

export interface PlaceDetails extends PlaceResult {
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    openNow: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  reviews?: Array<{
    name: string;
    authorName: string;
    rating: number;
    text: { text: string; languageCode: string };
    relativePublishTimeDescription: string;
  }>;
  photos?: PlacePhoto[];
}

interface TextSearchParams {
  query: string;
  location?: Coordinates;
  radius?: number;
  includedType?: PlaceType;
  minRating?: number;
  maxResultCount?: number;
  priceLevels?: string[];
  openNow?: boolean;
  languageCode?: string;
}

interface NearbySearchParams {
  location: Coordinates;
  radius: number; // in meters (max 50,000)
  includedTypes?: PlaceType[];
  excludedTypes?: PlaceType[];
  maxResultCount?: number;
  rankPreference?: 'POPULARITY' | 'DISTANCE';
  priceLevels?: string[];
  languageCode?: string;
}

class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://places.googleapis.com/v1';

  constructor() {
    this.apiKey = GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  Google Maps API key not configured for Places API');
    }
  }

  /**
   * Search for places by text query using NEW Places API
   * Example: "restaurants in Austin, TX"
   */
  async textSearch(params: TextSearchParams): Promise<PlaceResult[]> {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const requestBody: any = {
        textQuery: params.query,
        languageCode: params.languageCode || 'en',
      };

      if (params.maxResultCount) {
        requestBody.maxResultCount = Math.min(params.maxResultCount, 20);
      }

      if (params.location && params.radius) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: params.location.latitude,
              longitude: params.location.longitude,
            },
            radius: params.radius,
          },
        };
      }

      if (params.includedType) {
        requestBody.includedType = params.includedType;
      }

      if (params.minRating) {
        requestBody.minRating = params.minRating;
      }

      if (params.priceLevels && params.priceLevels.length > 0) {
        requestBody.priceLevels = params.priceLevels;
      }

      if (params.openNow) {
        requestBody.openNow = true;
      }

      const url = `${this.baseUrl}/places:searchText`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.businessStatus,places.currentOpeningHours,places.photos,places.shortFormattedAddress',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Places API error:', data.error);
        throw new Error(`Places API error: ${data.error.message}`);
      }

      if (!data.places || data.places.length === 0) {
        return [];
      }

      return data.places.map((place: any) => this.parsePlaceResult(place, params.location));
    } catch (error) {
      console.error('Error searching places:', error);
      throw error;
    }
  }

  /**
   * Search for nearby places using NEW Places API
   * Example: Find gas stations within 5 miles
   */
  async nearbySearch(params: NearbySearchParams): Promise<PlaceResult[]> {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const requestBody: any = {
        locationRestriction: {
          circle: {
            center: {
              latitude: params.location.latitude,
              longitude: params.location.longitude,
            },
            radius: params.radius,
          },
        },
        languageCode: params.languageCode || 'en',
      };

      if (params.maxResultCount) {
        requestBody.maxResultCount = Math.min(params.maxResultCount, 20);
      }

      if (params.includedTypes && params.includedTypes.length > 0) {
        requestBody.includedTypes = params.includedTypes;
      }

      if (params.excludedTypes && params.excludedTypes.length > 0) {
        requestBody.excludedTypes = params.excludedTypes;
      }

      if (params.rankPreference) {
        requestBody.rankPreference = params.rankPreference;
      }

      if (params.priceLevels && params.priceLevels.length > 0) {
        requestBody.priceLevels = params.priceLevels;
      }

      const url = `${this.baseUrl}/places:searchNearby`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.businessStatus,places.currentOpeningHours,places.photos,places.shortFormattedAddress',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Places API error:', data.error);
        throw new Error(`Places API error: ${data.error.message}`);
      }

      if (!data.places || data.places.length === 0) {
        return [];
      }

      // Calculate distances and sort
      const results = data.places.map((place: any) => this.parsePlaceResult(place, params.location));
      return results.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      console.error('Error searching nearby places:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific place using NEW Places API
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const url = `${this.baseUrl}/places/${placeId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,types,businessStatus,currentOpeningHours,nationalPhoneNumber,internationalPhoneNumber,websiteUri,reviews,photos,shortFormattedAddress,regularOpeningHours',
        },
      });

      const data = await response.json();

      if (data.error) {
        console.error('Place Details API error:', data.error);
        return null;
      }

      return this.parsePlaceDetails(data);
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Get a photo URL for a place using NEW Places API
   * photoName format: "places/{place_id}/photos/{photo_id}"
   */
  getPhotoUrl(photoName: string, maxWidthPx: number = 400, maxHeightPx: number = 400): string {
    if (!this.apiKey) return '';
    return `${this.baseUrl}/${photoName}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}&key=${this.apiKey}`;
  }

  /**
   * Find top attractions in a city
   */
  async findAttractions(cityName: string, stateCode?: string, limit: number = 10): Promise<PlaceResult[]> {
    const query = stateCode 
      ? `tourist attractions in ${cityName}, ${stateCode}`
      : `tourist attractions in ${cityName}`;
    
    const results = await this.textSearch({ 
      query,
      includedType: 'tourist_attraction',
      maxResultCount: limit,
    });
    return results.slice(0, limit);
  }

  /**
   * Find restaurants in a city
   */
  async findRestaurants(cityName: string, stateCode?: string, limit: number = 10): Promise<PlaceResult[]> {
    const query = stateCode
      ? `restaurants in ${cityName}, ${stateCode}`
      : `restaurants in ${cityName}`;
    
    const results = await this.textSearch({ 
      query,
      includedType: 'restaurant',
      maxResultCount: limit,
    });
    return results.slice(0, limit);
  }

  /**
   * Find hotels in a city
   */
  async findHotels(cityName: string, stateCode?: string, limit: number = 10): Promise<PlaceResult[]> {
    const query = stateCode
      ? `hotels in ${cityName}, ${stateCode}`
      : `hotels in ${cityName}`;
    
    const results = await this.textSearch({ 
      query,
      includedType: 'lodging',
      maxResultCount: limit,
    });
    return results.slice(0, limit);
  }

  /**
   * Find things to do in a city (comprehensive)
   */
  async findThingsToDo(cityName: string, stateCode?: string): Promise<{
    attractions: PlaceResult[];
    restaurants: PlaceResult[];
    hotels: PlaceResult[];
  }> {
    const [attractions, restaurants, hotels] = await Promise.all([
      this.findAttractions(cityName, stateCode, 5),
      this.findRestaurants(cityName, stateCode, 5),
      this.findHotels(cityName, stateCode, 5),
    ]);

    return { attractions, restaurants, hotels };
  }

  /**
   * Find nearby landmarks for navigation
   * Used for landmark-based directions (e.g., "Turn left at Starbucks")
   */
  async findNearbyLandmarks(location: Coordinates, radiusMeters: number = 100): Promise<PlaceResult[]> {
    try {
      const results = await this.nearbySearch({
        location,
        radius: radiusMeters,
        maxResultCount: 20,
        rankPreference: 'POPULARITY',
      });

      // Filter to well-known chains and prominent places
      return results.filter(place => {
        const hasRating = place.rating && place.rating >= 4.0;
        const hasManyReviews = place.userRatingsTotal && place.userRatingsTotal >= 50;
        return hasRating || hasManyReviews;
      }).slice(0, 3); // Top 3 most prominent
    } catch (error) {
      console.error('Error finding nearby landmarks:', error);
      return [];
    }
  }

  /**
   * Find parking near a destination
   * Returns parking garages, lots, and street parking
   */
  async findParkingNear(location: Coordinates, radiusMeters: number = 500): Promise<PlaceResult[]> {
    try {
      const results = await this.nearbySearch({
        location,
        radius: radiusMeters,
        includedTypes: ['parking'],
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
      });

      // Sort by distance (closest first)
      return results.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      console.error('Error finding parking:', error);
      return [];
    }
  }

  /**
   * Find parking with specific filters
   */
  async findParkingFiltered(
    location: Coordinates,
    radiusMeters: number = 500,
    options?: {
      includeStreetParking?: boolean;
      includeLots?: boolean;
      includeGarages?: boolean;
    }
  ): Promise<{
    garages: PlaceResult[];
    lots: PlaceResult[];
    street: PlaceResult[];
  }> {
    try {
      const allParking = await this.findParkingNear(location, radiusMeters);

      // Categorize parking by type based on name/types
      const garages = allParking.filter(p => 
        p.name.toLowerCase().includes('garage') ||
        p.name.toLowerCase().includes('deck') ||
        p.types.includes('parking')
      );

      const lots = allParking.filter(p =>
        p.name.toLowerCase().includes('lot') ||
        p.name.toLowerCase().includes('parking lot')
      );

      // Street parking is usually everything else or has specific indicators
      const street = allParking.filter(p =>
        !garages.includes(p) &&
        !lots.includes(p) &&
        (p.name.toLowerCase().includes('street') || p.name.toLowerCase().includes('meter'))
      );

      return {
        garages: options?.includeGarages !== false ? garages : [],
        lots: options?.includeLots !== false ? lots : [],
        street: options?.includeStreetParking !== false ? street : [],
      };
    } catch (error) {
      console.error('Error finding filtered parking:', error);
      return { garages: [], lots: [], street: [] };
    }
  }

  /**
   * Parse place result from NEW API response
   */
  private parsePlaceResult(place: any, userLocation?: Coordinates): PlaceResult {
    const coords = {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
    };

    let distance: number | undefined;
    if (userLocation) {
      distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        coords.latitude,
        coords.longitude
      );
    }

    return {
      placeId: place.id,
      name: place.displayName?.text || place.name || 'Unknown',
      formattedAddress: place.formattedAddress,
      shortFormattedAddress: place.shortFormattedAddress,
      coordinates: coords,
      rating: place.rating,
      userRatingsTotal: place.userRatingCount,
      priceLevel: place.priceLevel,
      types: place.types || [],
      businessStatus: place.businessStatus,
      openNow: place.currentOpeningHours?.openNow,
      photos: place.photos?.map((photo: any) => ({
        name: photo.name,
        widthPx: photo.widthPx,
        heightPx: photo.heightPx,
        authorAttributions: photo.authorAttributions || [],
      })),
      distance,
    };
  }

  /**
   * Parse place details from NEW API response
   */
  private parsePlaceDetails(place: any): PlaceDetails {
    const base = this.parsePlaceResult(place);
    
    return {
      ...base,
      nationalPhoneNumber: place.nationalPhoneNumber,
      internationalPhoneNumber: place.internationalPhoneNumber,
      websiteUri: place.websiteUri,
      regularOpeningHours: place.regularOpeningHours ? {
        openNow: place.regularOpeningHours.openNow,
        periods: place.regularOpeningHours.periods,
        weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions,
      } : undefined,
      reviews: place.reviews?.slice(0, 5).map((review: any) => ({
        name: review.name,
        authorName: review.authorAttribution?.displayName || 'Anonymous',
        rating: review.rating,
        text: review.text || { text: '', languageCode: 'en' },
        relativePublishTimeDescription: review.relativePublishTimeDescription || '',
      })),
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number, unit: 'miles' | 'km' = 'miles'): string {
    if (unit === 'miles') {
      const miles = meters / 1609.34;
      if (miles < 0.1) {
        return `${Math.round(meters * 3.28084)} ft`;
      }
      return `${miles.toFixed(1)} mi`;
    } else {
      const km = meters / 1000;
      if (km < 0.1) {
        return `${Math.round(meters)} m`;
      }
      return `${km.toFixed(1)} km`;
    }
  }

  /**
   * Format price level for display (NEW API format)
   */
  formatPriceLevel(priceLevel?: string): string {
    if (!priceLevel) return 'Price not available';
    
    switch (priceLevel) {
      case 'PRICE_LEVEL_FREE':
        return 'Free';
      case 'PRICE_LEVEL_INEXPENSIVE':
        return '$';
      case 'PRICE_LEVEL_MODERATE':
        return '$$';
      case 'PRICE_LEVEL_EXPENSIVE':
        return '$$$';
      case 'PRICE_LEVEL_VERY_EXPENSIVE':
        return '$$$$';
      default:
        return 'Price not available';
    }
  }
}

// Export singleton instance
export const googlePlaces = new GooglePlacesService();
