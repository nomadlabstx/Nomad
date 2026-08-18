/**
 * Explorer System Type Definitions
 * Hierarchical location tracking: Country > State > County > City > Street
 */

export interface ExplorerLocation {
  id: string;
  name: string;
  visited: boolean;
  firstVisited?: number; // timestamp
  lastVisited?: number; // timestamp
  visitCount: number;
  /** Wikipedia article cached on first visit */
  wikiTitle?: string;
  wikiExtract?: string;
  wikiPageUrl?: string;
}

export interface ExplorerStreet extends ExplorerLocation {
  type: 'street';
  cityId: string;
  significance: string; // Why this street is tracked (historic, food, event, etc.)
  coordinates?: { latitude: number; longitude: number }[];
}

export interface ExplorerCity extends ExplorerLocation {
  type: 'city';
  countyId: string;
  state?: string; // State name for auto-discovered cities
  county?: string; // County name for auto-discovered cities
  latitude?: number; // Coordinates for auto-discovered cities
  longitude?: number; // Coordinates for auto-discovered cities
  population?: number; // Population for auto-discovered cities
  cityType?: 'city' | 'town' | 'village' | 'neighborhood'; // Type for auto-discovered cities
  confidence?: 'high' | 'medium' | 'low'; // Confidence level for auto-discovered cities
  streets: ExplorerStreet[];
  landmarks: ExplorerLandmark[]; // Important places in this city
  completionPercent: number; // Based on significant streets and landmarks visited
  neighborhoods?: ExplorerNeighborhood[];
}

export interface ExplorerNeighborhood extends ExplorerLocation {
  type: 'neighborhood';
  cityId: string;
  significantStreets: string[]; // Street IDs
  landmarks: string[]; // Landmark names/IDs
  completionPercent: number;
}

export interface ExplorerCounty extends ExplorerLocation {
  type: 'county';
  stateId: string;
  cities: ExplorerCity[];
  completionPercent: number;
}

export interface ExplorerState extends ExplorerLocation {
  type: 'state';
  countryId: string;
  counties: ExplorerCounty[];
  highways: ExplorerHighway[]; // Highways in this state
  completionPercent: number;
}

export interface ExplorerCountry extends ExplorerLocation {
  type: 'country';
  states: ExplorerState[];
  completionPercent: number;
  isoCode: string; // e.g., "US", "CA", "MX"
}

export interface ExplorerHighway extends ExplorerLocation {
  type: 'highway';
  highwayType: 'interstate' | 'us-highway' | 'state-highway' | 'fm-road' | 'ranch-road' | 'special';
  number: string; // e.g., "35", "183", "2222"
  fullName: string; // e.g., "Interstate 35 North", "Texas Farm Road 2222"
  states: string[]; // State abbreviations this highway passes through
  direction?: 'north' | 'south' | 'east' | 'west'; // Direction of travel for directional highways
  parentHighwayId?: string; // Reference to parent highway (e.g., "interstate-35" for "interstate-35-north")
  exits: ExplorerHighwayExit[];
  totalExits: number;
  visitedExits: number;
  completionPercent: number;
}

export interface ExplorerHighwayExit extends ExplorerLocation {
  type: 'highway-exit';
  highwayId: string;
  exitNumber: string; // Can be number or letter (e.g., "234A")
  description: string; // e.g., "FM 2222 / Koenig Lane"
  coordinates: { latitude: number; longitude: number };
  milepointStart?: number;
  milepointEnd?: number;
}

export interface ExplorerLandmark extends ExplorerLocation {
  type: 'landmark';
  category: 'attraction' | 'historic' | 'natural' | 'cultural' | 'food' | 'entertainment' | 'sport' | 'shopping';
  cityId: string;
  coordinates: { latitude: number; longitude: number };
  placeId?: string; // Google Places ID for more info
  rating?: number;
  description?: string;
  significance: string; // Why it's tracked (e.g., "Famous BBQ joint", "Historic courthouse")
}

export interface ExplorerData {
  countries: ExplorerCountry[];
  highways: ExplorerHighway[]; // All highways tracked
  landmarks: ExplorerLandmark[]; // Top-level significant landmarks (not tied to cities)
  lastUpdated: number;
  totalLocations: number;
  visitedLocations: number;
  globalCompletionPercent: number;
  filters?: any; // Explorer display filters
}

export interface LocationHierarchy {
  country: string;
  state?: string;
  county?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  highway?: {
    type: string;
    number: string;
    exitNumber?: string;
  };
}

