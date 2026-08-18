import type { Trip } from '../types';
import type { SavedRoute } from '../types/route-history';
import { calculateDistance } from './calculations';
import { displayRouteName, formatTripName } from './trip-names';

const GEO_MATCH_M = 2500;
const TIME_MATCH_MS = 30 * 60 * 1000;

function dateTitle(trip: Trip): string {
  if (!trip.startTs) {
    return 'Trip';
  }
  return new Date(trip.startTs).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function routeLabel(route: SavedRoute): string {
  return displayRouteName(
    route.name,
    route.route?.legs?.at(-1)?.endAddress
  );
}

function pointDistance(
  point: { latitude: number; longitude: number } | undefined,
  target: { latitude: number; longitude: number } | undefined
): number {
  if (
    !point ||
    !target ||
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    !Number.isFinite(target.latitude) ||
    !Number.isFinite(target.longitude)
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const meters = calculateDistance(point, target);
  return Number.isFinite(meters) ? meters : Number.POSITIVE_INFINITY;
}

export function isFriendlyTripTitle(title: string): boolean {
  const formatted = formatTripName(title);
  return formatted.startsWith('Trip to ') && formatted.length > 'Trip to '.length;
}

export function resolveRecordedTripTitle(
  trip: Trip,
  routes: SavedRoute[]
): { title: string; nearestGeoM: number; matchedBy: 'stored' | 'geo' | 'time' | 'date' } {
  if (trip.name && isFriendlyTripTitle(trip.name)) {
    return { title: formatTripName(trip.name), nearestGeoM: 0, matchedBy: 'stored' };
  }

  const first = trip.path?.[0];
  const last = trip.path?.[trip.path.length - 1];
  const tripTime = trip.endTs || trip.startTs || 0;

  let nearestGeoM = Number.POSITIVE_INFINITY;
  let geoName: string | undefined;
  let timeName: string | undefined;
  let nearestTime = Number.POSITIVE_INFINITY;

  for (const route of routes) {
    const name = formatTripName(routeLabel(route));
    if (!isFriendlyTripTitle(name)) {
      continue;
    }

    const geo = Math.min(
      pointDistance(last, route.destination),
      pointDistance(last, route.origin),
      pointDistance(first, route.destination),
      pointDistance(first, route.origin)
    );
    if (geo < nearestGeoM) {
      nearestGeoM = geo;
      if (geo <= GEO_MATCH_M) {
        geoName = name;
      }
    }

    const usedAt = route.lastUsed || route.createdAt;
    const timeDelta = tripTime ? Math.abs(usedAt - tripTime) : Number.POSITIVE_INFINITY;
    if (timeDelta < nearestTime) {
      nearestTime = timeDelta;
      if (timeDelta <= TIME_MATCH_MS) {
        timeName = name;
      }
    }
  }

  if (geoName) {
    return { title: geoName, nearestGeoM, matchedBy: 'geo' };
  }
  if (timeName) {
    return { title: timeName, nearestGeoM, matchedBy: 'time' };
  }
  return { title: dateTitle(trip), nearestGeoM, matchedBy: 'date' };
}

export function recordedTripTitle(trip: Trip, routes: SavedRoute[]): string {
  return resolveRecordedTripTitle(trip, routes).title;
}

export function tripReplayTarget(
  trip: Trip,
  routes: SavedRoute[]
): { latitude: number; longitude: number; name: string } | null {
  const last = trip.path?.[trip.path.length - 1];
  const title = recordedTripTitle(trip, routes);
  let bestDest: { latitude: number; longitude: number } | undefined;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const route of routes) {
    const name = formatTripName(routeLabel(route));
    if (name !== title) {
      continue;
    }
    const dist = pointDistance(last, route.destination);
    if (dist < bestDist) {
      bestDist = dist;
      bestDest = route.destination;
    }
  }

  if (bestDest && Number.isFinite(bestDest.latitude) && Number.isFinite(bestDest.longitude)) {
    return { latitude: bestDest.latitude, longitude: bestDest.longitude, name: title };
  }
  if (!last || !Number.isFinite(last.latitude) || !Number.isFinite(last.longitude)) {
    return null;
  }
  return { latitude: last.latitude, longitude: last.longitude, name: title };
}
