import { getGoogleMapsApiKey } from '../utils/google-maps-key';
import { calculateDistance } from '../utils/calculations';
import {
  mergePlaceIdentity,
  parsePlaceIdentity,
  placeIdentityCacheKey,
  shouldRefreshPlaceIdentity,
  type AddressComponent,
  type PlaceIdentity,
} from '../utils/place-identity';

interface ResolveOptions {
  fallbackRoad?: string;
  nowMs?: number;
}

class PlaceIdentityService {
  private memory = new Map<string, PlaceIdentity>();
  private lastCoords: { latitude: number; longitude: number } | null = null;
  private lastFetchAtMs: number | null = null;
  private lastIdentity: PlaceIdentity | null = null;
  private inFlight: Promise<PlaceIdentity | null> | null = null;

  async resolve(
    coords: { latitude: number; longitude: number },
    options: ResolveOptions = {}
  ): Promise<PlaceIdentity | null> {
    const nowMs = options.nowMs ?? Date.now();
    const cacheKey = placeIdentityCacheKey(coords);
    const cached = this.memory.get(cacheKey);

    if (cached) {
      const identity = mergePlaceIdentity(cached, {
        previous: this.lastIdentity,
        fallbackRoad: options.fallbackRoad,
      });
      this.lastIdentity = identity;
      return identity;
    }

    const distanceMeters = this.lastCoords
      ? calculateDistance(this.lastCoords, coords)
      : Number.POSITIVE_INFINITY;

    const shouldFetch = shouldRefreshPlaceIdentity({
      previousCoords: this.lastCoords,
      previousAtMs: this.lastFetchAtMs,
      nextCoords: coords,
      nowMs,
      distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : Number.POSITIVE_INFINITY,
    });

    if (!shouldFetch && this.lastIdentity) {
      return mergePlaceIdentity(this.lastIdentity, {
        previous: this.lastIdentity,
        fallbackRoad: options.fallbackRoad,
      });
    }

    if (this.inFlight) {
      const pending = await this.inFlight;
      if (pending) {
        return mergePlaceIdentity(pending, {
          previous: this.lastIdentity,
          fallbackRoad: options.fallbackRoad,
        });
      }
    }

    this.inFlight = this.fetchIdentity(coords);
    try {
      const parsed = await this.inFlight;
      this.lastCoords = coords;
      this.lastFetchAtMs = nowMs;
      if (!parsed) {
        if (this.lastIdentity) {
          return mergePlaceIdentity(this.lastIdentity, {
            previous: this.lastIdentity,
            fallbackRoad: options.fallbackRoad,
          });
        }
        return null;
      }
      this.memory.set(cacheKey, parsed);
      const identity = mergePlaceIdentity(parsed, {
        previous: this.lastIdentity,
        fallbackRoad: options.fallbackRoad,
      });
      this.lastIdentity = identity;
      return identity;
    } finally {
      this.inFlight = null;
    }
  }

  private async fetchIdentity(
    coords: { latitude: number; longitude: number }
  ): Promise<PlaceIdentity | null> {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      return null;
    }

    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}` +
      `&result_type=street_address|route|neighborhood|sublocality|locality|administrative_area_level_2|administrative_area_level_1|country` +
      `&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
        return null;
      }

      const mergedComponents = mergeAddressComponents(data.results);
      if (mergedComponents.length === 0) {
        return null;
      }
      return parsePlaceIdentity(mergedComponents);
    } catch (error) {
      console.warn('[PlaceIdentity] Geocode failed:', error);
      return null;
    }
  }
}

/**
 * Google often splits route vs locality across results. Merge types so
 * Loop 340 and Woodway can come from the same parse.
 */
export function mergeAddressComponents(
  results: Array<{ address_components?: AddressComponent[] }>
): AddressComponent[] {
  const byType = new Map<string, AddressComponent>();
  for (const result of results) {
    for (const component of result.address_components || []) {
      for (const type of component.types) {
        if (!byType.has(type)) {
          byType.set(type, component);
        }
      }
    }
  }
  const unique = new Map<string, AddressComponent>();
  for (const component of byType.values()) {
    unique.set(`${component.long_name}|${component.types.join(',')}`, component);
  }
  return [...unique.values()];
}

export const placeIdentityService = new PlaceIdentityService();
