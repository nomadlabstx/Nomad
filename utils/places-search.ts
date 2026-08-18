/**
 * Google Places API (New) — destination search helpers.
 * Uses places.googleapis.com/v1 (required when legacy APIs are disabled).
 */

import type { Coordinates } from '../services/navigation';
import { getGoogleMapsApiKey } from './google-maps-key';

const PLACES_BASE = 'https://places.googleapis.com/v1';

export interface DestinationSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  coordinates?: Coordinates;
  /** Distance from search origin in meters, when known */
  distanceMeters?: number;
}

function normalizePlaceId(raw: string): string {
  return raw.replace(/^places\//, '');
}

function haversineMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Text Search locationRestriction only accepts a rectangle, not a circle. */
export function circleToViewport(center: Coordinates, radiusMeters: number) {
  const latDelta = radiusMeters / 111320;
  const lngDenom = 111320 * Math.cos((center.latitude * Math.PI) / 180);
  const lngDelta = lngDenom === 0 ? 180 : radiusMeters / Math.abs(lngDenom);
  const clampLat = (lat: number) => Math.max(-90, Math.min(90, lat));
  const wrapLng = (lng: number) => {
    const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
    return wrapped;
  };

  return {
    low: {
      latitude: clampLat(center.latitude - latDelta),
      longitude: wrapLng(center.longitude - lngDelta),
    },
    high: {
      latitude: clampLat(center.latitude + latDelta),
      longitude: wrapLng(center.longitude + lngDelta),
    },
  };
}

function withDistance(
  results: DestinationSuggestion[],
  origin: Coordinates | null
): DestinationSuggestion[] {
  if (!origin) {
    return results;
  }
  return results.map((r) => ({
    ...r,
    distanceMeters: r.coordinates
      ? haversineMeters(origin, r.coordinates)
      : r.distanceMeters,
  }));
}

export function sortByDistance(
  results: DestinationSuggestion[],
  origin: Coordinates | null
): DestinationSuggestion[] {
  if (!origin) {
    return results;
  }
  return withDistance(results, origin).sort((a, b) => {
    const da = a.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    const db = b.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });
}

export function mergePlaceResults(
  ...lists: DestinationSuggestion[][]
): DestinationSuggestion[] {
  const byId = new Map<string, DestinationSuggestion>();
  for (const list of lists) {
    for (const place of list) {
      if (!place.place_id || byId.has(place.place_id)) {
        continue;
      }
      byId.set(place.place_id, place);
    }
  }
  return [...byId.values()];
}

function queryIncludesLocality(query: string, locality: string): boolean {
  return query.toLowerCase().includes(locality.trim().toLowerCase());
}

/** House numbers and street suffixes — these should resolve locally, not to a farther city. */
export function isAddressQuery(query: string): boolean {
  const t = query.trim();
  if (t.length < 4) {
    return false;
  }
  if (/^\d+[a-z]?\s+\S/i.test(t)) {
    return true;
  }
  return /\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|blvd|way|ter|terrace|pl|place|cir|circle|pkwy|parkway)\.?\b/i.test(t);
}

/**
 * Search for destinations. Text search (nearby + wider) is always merged with
 * autocomplete so addresses are not dropped when nearby businesses fill the list.
 * Results are ranked closest-first — farther matches stay, just lower.
 */
export async function searchDestinations(
  query: string,
  currentLocation: Coordinates | null,
  localityHint?: string | null
): Promise<DestinationSuggestion[]> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey || !query.trim()) {
    return [];
  }

  if (currentLocation) {
    const addressQuery = isAddressQuery(query);
    const locality = localityHint?.trim() || null;
    const shouldAppendCity =
      addressQuery && Boolean(locality) && !queryIncludesLocality(query, locality!);
    const localizedQuery = shouldAppendCity ? `${query.trim()}, ${locality}` : null;
    // Street names repeat across towns. Restrict address search so a farther
    // city with the same street cannot beat a closer house.
    const nearbyRadius = addressQuery ? 12000 : 8000;
    const [nearby, wider, autocomplete, addressAuto, localizedText, localizedAuto] = await Promise.all([
      searchTextNew(query, apiKey, currentLocation, {
        restrictRadiusMeters: nearbyRadius,
        rankPreference: addressQuery ? 'DISTANCE' : undefined,
      }).catch((error) => {
        console.warn('[Places] Nearby text search failed:', error instanceof Error ? error.message : error);
        return [] as DestinationSuggestion[];
      }),
      searchTextNew(query, apiKey, currentLocation, {
        biasRadiusMeters: 50000,
        rankPreference: addressQuery ? 'DISTANCE' : undefined,
      }).catch((error) => {
        console.warn('[Places] Wide text search failed:', error instanceof Error ? error.message : error);
        return [] as DestinationSuggestion[];
      }),
      autocompleteNew(query, apiKey, currentLocation).catch((error) => {
        console.warn('[Places] Autocomplete failed:', error instanceof Error ? error.message : error);
        return [] as DestinationSuggestion[];
      }),
      addressQuery
        ? autocompleteNew(query, apiKey, currentLocation, {
            restrictRadiusMeters: nearbyRadius,
            includedPrimaryTypes: ['street_address', 'premise'],
          }).catch((error) => {
            console.warn('[Places] Address autocomplete failed:', error instanceof Error ? error.message : error);
            return [] as DestinationSuggestion[];
          })
        : Promise.resolve([] as DestinationSuggestion[]),
      localizedQuery
        ? searchTextNew(localizedQuery, apiKey, currentLocation, {
            restrictRadiusMeters: nearbyRadius,
            rankPreference: 'DISTANCE',
          }).catch((error) => {
            console.warn('[Places] Localized text search failed:', error instanceof Error ? error.message : error);
            return [] as DestinationSuggestion[];
          })
        : Promise.resolve([] as DestinationSuggestion[]),
      localizedQuery
        ? autocompleteNew(localizedQuery, apiKey, currentLocation, {
            restrictRadiusMeters: nearbyRadius,
            includedPrimaryTypes: ['street_address', 'premise'],
          }).catch((error) => {
            console.warn('[Places] Localized autocomplete failed:', error instanceof Error ? error.message : error);
            return [] as DestinationSuggestion[];
          })
        : Promise.resolve([] as DestinationSuggestion[]),
    ]);

    const resolvedAuto = await resolveAutocompleteDistances(
      mergePlaceResults(autocomplete, addressAuto, localizedAuto),
      apiKey,
      currentLocation
    );
    const merged = mergePlaceResults(nearby, wider, localizedText, resolvedAuto);
    let ranked = sortByDistance(merged, currentLocation);
    if (addressQuery) {
      const local = ranked.filter((r) => (r.distanceMeters ?? Infinity) <= nearbyRadius);
      if (local.length > 0) {
        ranked = local;
      }
    }

    if (ranked.length > 0) {
      return ranked;
    }
  }

  if (!currentLocation) {
    try {
      return await searchTextNew(query, apiKey, null, {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(formatPlacesError(message));
    }
  }

  return [];
}

async function resolveAutocompleteDistances(
  results: DestinationSuggestion[],
  apiKey: string,
  origin: Coordinates | null
): Promise<DestinationSuggestion[]> {
  if (!origin) {
    return results;
  }

  const resolved = await Promise.all(
    results.map(async (item) => {
      if (item.coordinates) {
        return item;
      }
      try {
        const coords = await resolvePlaceCoordinates(item.place_id, item.description);
        return { ...item, coordinates: coords };
      } catch {
        return item;
      }
    })
  );

  return resolved;
}

async function autocompleteNew(
  query: string,
  apiKey: string,
  currentLocation: Coordinates | null,
  options?: { restrictRadiusMeters?: number; includedPrimaryTypes?: string[] }
): Promise<DestinationSuggestion[]> {
  const body: Record<string, unknown> = {
    input: query.trim(),
    languageCode: 'en',
    regionCode: 'us',
    includedRegionCodes: ['us'],
  };

  if (options?.includedPrimaryTypes?.length) {
    body.includedPrimaryTypes = options.includedPrimaryTypes;
  }

  if (currentLocation) {
    body.origin = {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    };
    const restrict = options?.restrictRadiusMeters;
    if (restrict) {
      body.locationRestriction = {
        circle: {
          center: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          radius: Math.min(restrict, 50000),
        },
      };
    } else {
      body.locationBias = {
        circle: {
          center: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          radius: 50000,
        },
      };
    }
  }

  const response = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || data.error.status || 'Autocomplete failed');
  }

  if (!Array.isArray(data.suggestions)) {
    return [];
  }

  return data.suggestions
    .filter((s: { placePrediction?: unknown }) => s.placePrediction)
    .map((s: { placePrediction: {
      placeId?: string;
      place?: string;
      distanceMeters?: number;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    } }) => {
      const p = s.placePrediction;
      const placeId = normalizePlaceId(p.placeId || p.place || '');
      const description = p.text?.text || '';
      return {
        place_id: placeId,
        description,
        structured_formatting: {
          main_text: p.structuredFormat?.mainText?.text || description,
          secondary_text: p.structuredFormat?.secondaryText?.text || '',
        },
        distanceMeters: p.distanceMeters,
      };
    })
    .filter((s: DestinationSuggestion) => s.place_id && s.description);
}

async function searchTextNew(
  query: string,
  apiKey: string,
  currentLocation: Coordinates | null,
  options: {
    restrictRadiusMeters?: number;
    biasRadiusMeters?: number;
    rankPreference?: 'DISTANCE' | 'RELEVANCE';
  }
): Promise<DestinationSuggestion[]> {
  const body: Record<string, unknown> = {
    textQuery: query.trim(),
    maxResultCount: 20,
    languageCode: 'en',
  };

  if (options.rankPreference) {
    body.rankPreference = options.rankPreference;
  }

  if (currentLocation && options.restrictRadiusMeters) {
    body.locationRestriction = {
      rectangle: circleToViewport(currentLocation, options.restrictRadiusMeters),
    };
  } else if (currentLocation) {
    body.locationBias = {
      circle: {
        center: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        radius: options.biasRadiusMeters ?? 50000,
      },
    };
  }

  const response = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || data.error.status || 'Search failed');
  }

  if (!Array.isArray(data.places)) {
    return [];
  }

  return data.places.map((place: {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  }) => {
    const placeId = normalizePlaceId(place.id || '');
    const name = place.displayName?.text || place.formattedAddress || 'Unknown';
    const address = place.formattedAddress || '';
    const loc = place.location;
    return {
      place_id: placeId,
      description: name,
      structured_formatting: {
        main_text: name,
        secondary_text: address !== name ? address : '',
      },
      coordinates:
        loc?.latitude != null && loc?.longitude != null
          ? { latitude: loc.latitude, longitude: loc.longitude }
          : undefined,
    };
  }).filter((s: DestinationSuggestion) => s.place_id);
}

export async function resolvePlaceCoordinates(
  placeId: string,
  description: string,
  existing?: Coordinates
): Promise<Coordinates> {
  if (existing) {
    return existing;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  const id = normalizePlaceId(placeId);
  const response = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'location',
    },
  });

  const data = await response.json();

  if (data.location?.latitude != null && data.location?.longitude != null) {
    return {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
    };
  }

  if (data.error) {
    throw new Error(data.error.message || 'Could not resolve place location');
  }

  throw new Error(`Could not resolve coordinates for ${description}`);
}

function formatPlacesError(message: string): string {
  if (
    message.includes('legacy API') ||
    message.includes('LegacyApiNotActivated') ||
    message.includes('not enabled for your project')
  ) {
    return 'Enable "Places API (New)" in Google Cloud Console → APIs & Services → Library, wait 1–2 minutes, then restart Expo.';
  }
  if (message.includes('API keys are not supported') || message.includes('UNAUTHENTICATED')) {
    return 'Places API (New) is not enabled for this API key. Enable it in Google Cloud Console, then restart Expo.';
  }
  return message;
}
