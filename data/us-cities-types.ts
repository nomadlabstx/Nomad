/**
 * US Cities organized by county and state — type definitions only.
 * Runtime data lives in data/us-states-json/*.json (see us-cities-index.ts).
 */

export interface USCityWithCounty {
  name: string;
  state: string;
  stateCode: string;
  county: string;
  latitude: number;
  longitude: number;
  population: number;
  size: string;
  confidence: string;
}

export interface USCounty {
  name: string;
  cities: USCityWithCounty[];
}

export interface USState {
  name: string;
  code: string;
  counties: USCounty[];
}
