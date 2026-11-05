export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface PlaceIdentity {
  road: string;
  town: string;
  state: string;
  stateCode: string;
  county: string;
  country: string;
  countryCode: string;
}

export const PLACE_IDENTITY_REFRESH_METERS = 150;
export const PLACE_IDENTITY_REFRESH_MS = 20_000;

const GENERIC_TOWN_NAMES = new Set([
  'downtown',
  'midtown',
  'uptown',
  'eastside',
  'westside',
  'northside',
  'southside',
  'east side',
  'west side',
  'north side',
  'south side',
  'historic district',
  'central business district',
  'cbd',
  'the loop',
]);

const WEAK_ROAD_RE = /\b(ramp|frontage|access road|unnamed)\b/i;
const HIGHWAY_STYLE_RE =
  /\b(?:I-|I\s|Interstate|US-|U\.S\.|Loop|FM\s|RM\s|SH-|TX-|SR-|Hwy|Highway|State Route)\b/i;

function findComponent(components: AddressComponent[], type: string): AddressComponent | undefined {
  return components.find((component) => component.types.includes(type));
}

function isGenericTownName(name: string): boolean {
  return GENERIC_TOWN_NAMES.has(name.trim().toLowerCase());
}

export function isHighwayStyleRoad(name: string): boolean {
  return HIGHWAY_STYLE_RE.test(name);
}

export function isWeakRoadName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) {
    return true;
  }
  return WEAK_ROAD_RE.test(trimmed);
}

/**
 * Prefer the suburb/municipal grain Tesla shows (Woodway) over the metro (Waco).
 * Skip generic neighborhood labels like "Downtown".
 */
export function pickTown(components: AddressComponent[]): string {
  const sublocality =
    findComponent(components, 'sublocality_level_1') ||
    findComponent(components, 'sublocality');
  if (sublocality?.long_name && !isGenericTownName(sublocality.long_name)) {
    return sublocality.long_name;
  }

  const neighborhood = findComponent(components, 'neighborhood');
  if (neighborhood?.long_name && !isGenericTownName(neighborhood.long_name)) {
    return neighborhood.long_name;
  }

  const locality = findComponent(components, 'locality');
  return locality?.long_name?.trim() || '';
}

export function pickRoad(components: AddressComponent[]): string {
  const route = findComponent(components, 'route');
  return route?.long_name?.trim() || route?.short_name?.trim() || '';
}

/**
 * When geocode and a nav-step fallback both exist, keep the highway-style name.
 */
export function preferRoadLabel(geocodedRoad: string, fallbackRoad?: string): string {
  const geo = geocodedRoad.trim();
  const fallback = usableFallbackRoad(fallbackRoad);

  if (!geo) {
    return fallback;
  }
  if (isWeakRoadName(geo) && fallback) {
    return fallback;
  }
  if (fallback && isHighwayStyleRoad(fallback) && !isHighwayStyleRoad(geo)) {
    return fallback;
  }
  return geo;
}

function usableFallbackRoad(fallbackRoad?: string): string {
  const fallback = fallbackRoad?.trim() || '';
  if (!fallback) {
    return '';
  }
  if (/^(arrive|destination)\b/i.test(fallback)) {
    return '';
  }
  return fallback;
}

/**
 * Keep the last good road on unnamed ramps instead of flickering blank.
 */
export function keepLastGoodRoad(nextRoad: string, previousRoad?: string): string {
  const next = nextRoad.trim();
  if (next && !isWeakRoadName(next)) {
    return next;
  }
  if (previousRoad?.trim()) {
    return previousRoad.trim();
  }
  return next;
}

export function parsePlaceIdentity(components: AddressComponent[]): PlaceIdentity {
  const state = findComponent(components, 'administrative_area_level_1');
  const county = findComponent(components, 'administrative_area_level_2');
  const country = findComponent(components, 'country');

  return {
    road: pickRoad(components),
    town: pickTown(components),
    state: state?.long_name?.trim() || '',
    stateCode: state?.short_name?.trim() || '',
    county: county?.long_name?.trim() || '',
    country: country?.long_name?.trim() || '',
    countryCode: country?.short_name?.trim() || '',
  };
}

export function mergePlaceIdentity(
  parsed: PlaceIdentity,
  options?: { previous?: PlaceIdentity | null; fallbackRoad?: string }
): PlaceIdentity {
  const road = keepLastGoodRoad(
    preferRoadLabel(parsed.road, options?.fallbackRoad),
    options?.previous?.road
  );

  return {
    ...parsed,
    road,
    town: parsed.town || options?.previous?.town || '',
    state: parsed.state || options?.previous?.state || '',
    stateCode: parsed.stateCode || options?.previous?.stateCode || '',
    county: parsed.county || options?.previous?.county || '',
    country: parsed.country || options?.previous?.country || '',
    countryCode: parsed.countryCode || options?.previous?.countryCode || '',
  };
}

export function formatPlaceLine(identity: PlaceIdentity): string {
  if (identity.town && identity.stateCode) {
    return `${identity.town}, ${identity.stateCode}`;
  }
  return identity.town || identity.state || '';
}

export function formatCountyLine(identity: PlaceIdentity): string {
  return identity.county;
}

export function shouldRefreshPlaceIdentity(params: {
  previousCoords?: { latitude: number; longitude: number } | null;
  previousAtMs?: number | null;
  nextCoords: { latitude: number; longitude: number };
  nowMs: number;
  distanceMeters: number;
}): boolean {
  if (!params.previousCoords || params.previousAtMs == null) {
    return true;
  }
  if (params.distanceMeters >= PLACE_IDENTITY_REFRESH_METERS) {
    return true;
  }
  if (params.nowMs - params.previousAtMs >= PLACE_IDENTITY_REFRESH_MS) {
    return true;
  }
  return false;
}

export function placeIdentityCacheKey(coords: { latitude: number; longitude: number }): string {
  return `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;
}
