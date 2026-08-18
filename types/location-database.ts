/**
 * Location Database Type Definitions
 * Comprehensive US location data for AI accuracy
 */

export type CitySize = 'major' | 'medium' | 'small' | 'village';
export type DataConfidence = 'high' | 'medium' | 'low';

export interface CityData {
  name: string;
  state: string;
  stateCode: string;
  population: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  size: CitySize;
  confidence: DataConfidence;
  knownFor?: string[]; // ["tech hub", "wine country", etc.]
  isCapital?: boolean;
  isTouristDestination?: boolean;
}

export interface NearbyCity {
  name: string;
  distance: number; // miles
  population: number;
  direction: string; // "north", "northeast", etc.
}

export interface LocationInfo {
  city: CityData;
  nearbyMajorCities: NearbyCity[];
  aiGuidance: AIGuidance;
}

export interface AIGuidance {
  shouldBeSpecific: boolean;
  confidenceLevel: DataConfidence;
  recommendedBehavior: string;
  context: string;
}

export interface LocationDatabaseData {
  majorCities: CityData[]; // Population > 500K
  mediumCities: CityData[]; // 100K - 500K
  smallCities: CityData[]; // 10K - 100K
  villages: CityData[]; // < 10K
  lastUpdated: number;
  version: string;
}


