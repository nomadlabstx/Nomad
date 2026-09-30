/**
 * Along-interstate Eat / Drink / Do suggestions.
 * Throttled Places nearby search. Recs Off means no polling.
 */

import { googlePlaces, type PlaceResult, type PlaceType } from './google-places';
import { navigationService } from './navigation';
import type { Coordinates, Route } from '../types/navigation';
import {
  PLACE_IDENTITY_REFRESH_METERS,
  PLACE_IDENTITY_REFRESH_MS,
  isHighwayStyleRoad,
  type PlaceIdentity,
} from '../utils/place-identity';
import { calculateDistance } from '../utils/calculations';
import { detourMeters } from '../utils/drive-hud';
import {
  classifyPlaceKind,
  minDistanceToPath,
  pickInterstateRec,
  recsAreEnabled,
  type InterstateRecPlace,
  type RecTravelPrefs,
} from '../utils/interstate-recs';
import type { UserPreferences } from '../types/user-preferences';

const EAT_TYPES: PlaceType[] = ['restaurant'];
const DRINK_TYPES: PlaceType[] = ['cafe', 'bar'];
const DO_TYPES: PlaceType[] = ['tourist_attraction', 'museum', 'park'];

export interface InterstateRecQuery {
  location: Coordinates;
  heading?: number;
  identity: PlaceIdentity | null;
  route?: Route | null;
  preferredHighways?: string[];
  prefs: UserPreferences;
  dismissedIds: Set<string>;
  visitedNames?: Set<string>;
}

class InterstateRecsService {
  private lastFetchAt = 0;
  private lastFetchLocation: Coordinates | null = null;
  private lastPlaces: InterstateRecPlace[] = [];
  private inflight: Promise<InterstateRecPlace[]> | null = null;

  prefsFromUser(prefs: UserPreferences): RecTravelPrefs {
    return {
      recommendEat: prefs.travel.recommendEat !== false,
      recommendDrink: prefs.travel.recommendDrink !== false,
      recommendDo: prefs.travel.recommendDo !== false,
      detourPreset: prefs.travel.detourPreset ?? 'few-minutes',
      preferredStops: prefs.travel.preferredStops ?? [],
      avoidChains: prefs.food.avoidChains,
      cuisines: prefs.food.cuisines ?? [],
      activityInterests: prefs.activities.interests ?? [],
      priceRange: prefs.food.priceRange,
    };
  }

  shouldSearch(query: InterstateRecQuery): boolean {
    const travel = this.prefsFromUser(query.prefs);
    if (!recsAreEnabled(query.prefs.proactiveSuggestions, travel)) {
      return false;
    }
    if (!query.identity?.road || !isHighwayStyleRoad(query.identity.road)) {
      return false;
    }
    return true;
  }

  async findSuggestion(query: InterstateRecQuery): Promise<InterstateRecPlace | null> {
    if (!this.shouldSearch(query)) {
      return null;
    }

    const travel = this.prefsFromUser(query.prefs);
    const places = await this.loadPlaces(query, travel);
    let path: Coordinates[] = [];
    if (query.route) {
      try {
        path = navigationService.getDetailedRoutePath(query.route);
        if (path.length < 2) {
          path = navigationService.decodePolyline(query.route.overviewPolyline);
        }
      } catch {
        path = [];
      }
    }

    const withRouteDistance = places.map((place) => ({
      ...place,
      distanceFromRouteMeters: path.length ? minDistanceToPath(place.coordinates, path) : undefined,
    }));

    return pickInterstateRec(withRouteDistance, {
      prefs: travel,
      origin: query.location,
      heading: query.heading,
      preferredHighways: query.preferredHighways,
      dismissedIds: query.dismissedIds,
      visitedNames: query.visitedNames,
    });
  }

  private async loadPlaces(
    query: InterstateRecQuery,
    travel: RecTravelPrefs
  ): Promise<InterstateRecPlace[]> {
    const now = Date.now();
    const moved = this.lastFetchLocation
      ? calculateDistance(this.lastFetchLocation, query.location)
      : Number.POSITIVE_INFINITY;
    if (
      this.lastPlaces.length > 0 &&
      now - this.lastFetchAt < PLACE_IDENTITY_REFRESH_MS &&
      moved < PLACE_IDENTITY_REFRESH_METERS
    ) {
      return this.lastPlaces;
    }

    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.fetchPlaces(query, travel);
    try {
      const places = await this.inflight;
      this.lastPlaces = places;
      this.lastFetchAt = Date.now();
      this.lastFetchLocation = query.location;
      return places;
    } catch {
      return this.lastPlaces;
    } finally {
      this.inflight = null;
    }
  }

  private async fetchPlaces(
    query: InterstateRecQuery,
    travel: RecTravelPrefs
  ): Promise<InterstateRecPlace[]> {
    const radius = Math.min(detourMeters(travel.detourPreset), 50000);
    const typeGroups: PlaceType[][] = [];
    if (travel.recommendEat) typeGroups.push(EAT_TYPES);
    if (travel.recommendDrink) typeGroups.push(DRINK_TYPES);
    if (travel.recommendDo) typeGroups.push(DO_TYPES);
    if (typeGroups.length === 0) return [];

    const results = await Promise.all(
      typeGroups.map((includedTypes) =>
        googlePlaces
          .nearbySearch({
            location: query.location,
            radius,
            includedTypes,
            maxResultCount: 8,
            rankPreference: 'DISTANCE',
          })
          .catch(() => [] as PlaceResult[])
      )
    );

    const mapped: InterstateRecPlace[] = [];
    const seen = new Set<string>();
    for (const group of results) {
      for (const place of group) {
        if (seen.has(place.placeId)) continue;
        const kind = classifyPlaceKind(place.types);
        if (!kind) continue;
        seen.add(place.placeId);
        mapped.push({
          placeId: place.placeId,
          name: place.name,
          kind,
          coordinates: place.coordinates,
          rating: place.rating,
          userRatingsTotal: place.userRatingsTotal,
          openNow: place.openNow,
          types: place.types,
          priceLevel: place.priceLevel,
          distanceMeters: place.distance ?? calculateDistance(query.location, place.coordinates),
        });
      }
    }
    return mapped;
  }
}

export const interstateRecsService = new InterstateRecsService();
