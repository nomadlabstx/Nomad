import { googlePlaces } from '../services/google-places';
import type { Coordinates, RouteOptions } from '../types/navigation';
import {
  AI_PLAN_MAX_STOPS,
  capNamedLocations,
  dedupeNamedLocations,
  extractLocationNames,
  inferPlanRegion,
} from './trip-plan-extract';

export {
  AI_PLAN_MAX_STOPS,
  GOOGLE_MAX_WAYPOINTS,
  capNamedLocations,
  dedupeNamedLocations,
  extractLocationNames,
  inferPlanRegion,
} from './trip-plan-extract';

export interface ParsedTripStop {
  name: string;
  location: Coordinates;
  duration?: string;
  notes?: string;
}

export interface ParsedTripPlanResult {
  stops: ParsedTripStop[];
  finalDestination: ParsedTripStop;
  routeOptions: RouteOptions;
  summary: string;
}

function buildSearchQuery(name: string, regionCity?: string, regionState?: string): string {
  const cleaned = name.replace(/[:.\s]+$/g, '').trim();
  if (/,/.test(cleaned) || /\b[A-Z]{2}\b/.test(cleaned)) {
    return cleaned;
  }
  if (regionCity && regionState) {
    return `${cleaned}, ${regionCity}, ${regionState}`;
  }
  if (regionState) {
    return `${cleaned}, ${regionState}`;
  }
  return cleaned;
}

function isValidCoordinate(coords?: Coordinates | null): coords is Coordinates {
  return (
    !!coords &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude) &&
    !(coords.latitude === 0 && coords.longitude === 0)
  );
}

export async function parsePlanTextToStops(
  planText: string,
  currentCity?: string,
  currentState?: string
): Promise<ParsedTripPlanResult> {
  const locationNames = extractLocationNames(planText, currentCity);
  const region = inferPlanRegion(planText, currentCity, currentState);
  const stops: ParsedTripStop[] = [];

  for (const name of locationNames) {
    try {
      const searchQuery = buildSearchQuery(name, region.city, region.state);
      const results = await googlePlaces.textSearch({ query: searchQuery });
      if (results.length === 0) continue;

      const place = results[0];
      const assignedLocation = isValidCoordinate(place.coordinates)
        ? place.coordinates
        : (place as { location?: Coordinates }).location;

      if (!isValidCoordinate(assignedLocation)) {
        continue;
      }

      stops.push({
        name: place.name || place.formattedAddress || name,
        location: assignedLocation,
        notes: place.formattedAddress,
      });
    } catch {
      // Skip locations that fail to geocode
    }
  }

  if (stops.length === 0) {
    throw new Error(
      'Could not map stops from that plan. Ask for a destination or a numbered list of places.'
    );
  }

  const deduped = dedupeNamedLocations(stops);
  const capped = capNamedLocations(deduped, AI_PLAN_MAX_STOPS);
  const finalDestination = capped[capped.length - 1];
  const waypoints = capped.slice(0, -1);

  return {
    stops: waypoints,
    finalDestination,
    routeOptions: {
      avoidTolls: /avoid.*toll/i.test(planText),
      avoidHighways: /avoid.*highway|avoid.*freeway/i.test(planText),
      optimizeWaypoints: /optimize|efficient|fastest/i.test(planText),
    },
    summary: planText,
  };
}
