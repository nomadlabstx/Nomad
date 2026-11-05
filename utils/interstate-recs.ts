import type { DetourPreset } from './drive-hud';

const QUALITY_MIN_RATING = 4.2;
const QUALITY_MIN_REVIEWS = 40;
const DETOUR_METERS: Record<DetourPreset, number> = {
  'this-exit': 1609,
  'few-minutes': 8047,
  'worth-the-dip': 24140,
};

function detourMeters(preset: DetourPreset | undefined): number {
  return DETOUR_METERS[preset ?? 'few-minutes'];
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const R = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function isHeadingAhead(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  heading: number
): boolean {
  if (!Number.isFinite(heading) || heading < 0) {
    return true;
  }
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  const normalized = (bearing + 360) % 360;
  const diff = Math.abs(normalized - heading) % 360;
  const headingDiff = diff > 180 ? 360 - diff : diff;
  return headingDiff <= 90;
}

export type RecKind = 'eat' | 'drink' | 'do';

export interface InterstateRecPlace {
  placeId: string;
  name: string;
  kind: RecKind;
  coordinates: { latitude: number; longitude: number };
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  types: string[];
  priceLevel?: string;
  distanceMeters: number;
  distanceFromRouteMeters?: number;
  leavesHighway?: boolean;
}

export interface RecTravelPrefs {
  recommendEat: boolean;
  recommendDrink: boolean;
  recommendDo: boolean;
  detourPreset: DetourPreset;
  preferredStops: string[];
  avoidChains: boolean;
  cuisines: string[];
  activityInterests: string[];
  priceRange: 'budget' | 'moderate' | 'upscale' | 'any';
}

export interface RecFilterOptions {
  prefs: RecTravelPrefs;
  origin: { latitude: number; longitude: number };
  heading?: number;
  preferredHighways?: string[];
  dismissedIds: Set<string>;
  visitedNames?: Set<string>;
}

const EAT_TYPES = new Set([
  'restaurant',
  'meal_takeaway',
  'meal_delivery',
  'bakery',
  'food',
]);

const DRINK_TYPES = new Set([
  'cafe',
  'coffee_shop',
  'bar',
  'night_club',
]);

const DO_TYPES = new Set([
  'tourist_attraction',
  'museum',
  'park',
  'amusement_park',
  'art_gallery',
  'zoo',
  'aquarium',
  'hiking_area',
  'scenic_lookout',
  'point_of_interest',
]);

const COMMON_CHAINS = [
  'mcdonald',
  'burger king',
  "wendy's",
  'taco bell',
  'starbucks',
  'dunkin',
  'subway',
  'chipotle',
  'kfc',
  'pizza hut',
  "domino",
  'popeyes',
  'sonic',
  'dairy queen',
  "arby's",
  'chick-fil-a',
  'whataburger',
  "carl's jr",
  'jack in the box',
  'five guys',
  'panda express',
  "applebee",
  'olive garden',
  'cracker barrel',
  'ihop',
  "denny",
];

export function recsAreEnabled(
  proactiveSuggestions: boolean,
  travel: Pick<RecTravelPrefs, 'recommendEat' | 'recommendDrink' | 'recommendDo'>
): boolean {
  if (!proactiveSuggestions) return false;
  return Boolean(travel.recommendEat || travel.recommendDrink || travel.recommendDo);
}

export function classifyPlaceKind(types: string[]): RecKind | null {
  const lowered = types.map((type) => type.toLowerCase());
  if (lowered.some((type) => DRINK_TYPES.has(type))) return 'drink';
  if (lowered.some((type) => EAT_TYPES.has(type))) return 'eat';
  if (lowered.some((type) => DO_TYPES.has(type))) return 'do';
  return null;
}

export function isLikelyChain(name: string): boolean {
  const lowered = name.toLowerCase();
  return COMMON_CHAINS.some((chain) => lowered.includes(chain));
}

export function matchesPreferredStop(name: string, preferredStops: string[]): boolean {
  if (!preferredStops.length) return false;
  const lowered = name.toLowerCase().replace(/['’]/g, '');
  return preferredStops.some((stop) => {
    const needle = stop.toLowerCase().replace(/['’]/g, '');
    if (needle.length < 3) return false;
    return lowered.includes(needle) || needle.includes(lowered);
  });
}

export function meetsQualityFloor(
  place: Pick<InterstateRecPlace, 'name' | 'rating' | 'userRatingsTotal'>,
  preferredStops: string[]
): boolean {
  if (matchesPreferredStop(place.name, preferredStops)) {
    return true;
  }
  const rating = place.rating ?? 0;
  const reviews = place.userRatingsTotal ?? 0;
  return rating >= QUALITY_MIN_RATING && reviews >= QUALITY_MIN_REVIEWS;
}

export function matchesPriceRange(
  priceLevel: string | undefined,
  range: RecTravelPrefs['priceRange']
): boolean {
  if (range === 'any' || !priceLevel) return true;
  if (range === 'budget') {
    return (
      priceLevel === 'PRICE_LEVEL_FREE' ||
      priceLevel === 'PRICE_LEVEL_INEXPENSIVE'
    );
  }
  if (range === 'moderate') {
    return (
      priceLevel === 'PRICE_LEVEL_INEXPENSIVE' ||
      priceLevel === 'PRICE_LEVEL_MODERATE'
    );
  }
  return (
    priceLevel === 'PRICE_LEVEL_EXPENSIVE' ||
    priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE'
  );
}

export function matchesCuisine(name: string, types: string[], cuisines: string[]): boolean {
  if (!cuisines.length) return true;
  const haystack = `${name} ${types.join(' ')}`.toLowerCase();
  return cuisines.some((cuisine) => haystack.includes(cuisine.toLowerCase()));
}

export function matchesActivity(name: string, types: string[], interests: string[]): boolean {
  if (!interests.length) return true;
  const haystack = `${name} ${types.join(' ')}`.toLowerCase();
  return interests.some((interest) => haystack.includes(interest.toLowerCase()));
}

export function isOpenEnough(openNow: boolean | undefined): boolean {
  return openNow === true;
}

export function minDistanceToPath(
  point: { latitude: number; longitude: number },
  path: { latitude: number; longitude: number }[]
): number {
  if (path.length === 0) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  const stride = Math.max(1, Math.floor(path.length / 80));
  for (let i = 0; i < path.length; i += stride) {
    const distance = distanceMeters(point, path[i]);
    if (distance < min) min = distance;
  }
  return min;
}

export function filterInterstateRecs(
  places: InterstateRecPlace[],
  options: RecFilterOptions
): InterstateRecPlace[] {
  const maxDetour = detourMeters(options.prefs.detourPreset);
  const stayOnHighway = (options.preferredHighways?.length ?? 0) > 0;
  const thisExitMeters = detourMeters('this-exit');

  return places
    .filter((place) => {
      if (options.dismissedIds.has(place.placeId)) return false;
      if (options.visitedNames?.has(place.name.toLowerCase())) return false;
      if (!isOpenEnough(place.openNow)) return false;
      if (place.distanceMeters > maxDetour) return false;
      if (place.kind === 'eat' && !options.prefs.recommendEat) return false;
      if (place.kind === 'drink' && !options.prefs.recommendDrink) return false;
      if (place.kind === 'do' && !options.prefs.recommendDo) return false;
      if (!meetsQualityFloor(place, options.prefs.preferredStops)) return false;
      if (
        options.prefs.avoidChains &&
        isLikelyChain(place.name) &&
        !matchesPreferredStop(place.name, options.prefs.preferredStops)
      ) {
        return false;
      }
      if (place.kind === 'eat' && !matchesCuisine(place.name, place.types, options.prefs.cuisines)) {
        return false;
      }
      if (place.kind === 'do' && !matchesActivity(place.name, place.types, options.prefs.activityInterests)) {
        return false;
      }
      if (!matchesPriceRange(place.priceLevel, options.prefs.priceRange)) return false;
      if (
        options.heading != null &&
        !isHeadingAhead(options.origin, place.coordinates, options.heading)
      ) {
        return false;
      }
      if (
        stayOnHighway &&
        (place.distanceFromRouteMeters ?? place.distanceMeters) > thisExitMeters
      ) {
        return false;
      }
      return true;
    })
    .map((place) => ({
      ...place,
      leavesHighway:
        stayOnHighway &&
        (place.distanceFromRouteMeters ?? 0) > thisExitMeters * 0.6,
    }))
    .sort((a, b) => {
      const aOff = a.distanceFromRouteMeters ?? a.distanceMeters;
      const bOff = b.distanceFromRouteMeters ?? b.distanceMeters;
      const aScore = (a.rating ?? 0) * 10 - aOff / 1000;
      const bScore = (b.rating ?? 0) * 10 - bOff / 1000;
      return bScore - aScore;
    });
}

export function pickInterstateRec(
  places: InterstateRecPlace[],
  options: RecFilterOptions
): InterstateRecPlace | null {
  return filterInterstateRecs(places, options)[0] ?? null;
}

export function hasPassedPlace(
  origin: { latitude: number; longitude: number },
  place: InterstateRecPlace,
  heading?: number
): boolean {
  if (place.distanceMeters < 80) return true;
  if (heading == null || heading < 0) return false;
  return !isHeadingAhead(origin, place.coordinates, heading);
}
