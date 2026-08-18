/**
 * Optional Routes API overlay: per-segment speed (blue / yellow / red).
 * Directions remains the source of turn-by-turn steps.
 */

import type { Coordinates, Route } from '../types/navigation';
import { getGoogleMapsApiKey } from '../utils/google-maps-key';
import {
  parseTrafficSpeed,
  type SpeedInterval,
} from '../utils/traffic';

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

interface RoutesApiRoute {
  polyline?: { encodedPolyline?: string };
  duration?: string;
  staticDuration?: string;
  distanceMeters?: number;
  travelAdvisory?: {
    speedReadingIntervals?: Array<{
      startPolylinePointIndex?: number;
      endPolylinePointIndex?: number;
      speed?: string;
    }>;
  };
}

function intervalsFromAdvisory(
  advisory: RoutesApiRoute['travelAdvisory']
): SpeedInterval[] {
  const raw = advisory?.speedReadingIntervals;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => ({
      startPolylinePointIndex: item.startPolylinePointIndex ?? 0,
      endPolylinePointIndex: item.endPolylinePointIndex ?? 0,
      speed: parseTrafficSpeed(item.speed),
    }))
    .filter((item) => item.endPolylinePointIndex > item.startPolylinePointIndex);
}

/**
 * Fetch traffic-colored polyline data. Returns [] if Routes API is off or fails.
 */
export async function fetchTrafficOverlays(
  origin: Coordinates,
  destination: Coordinates,
  waypointCount: number
): Promise<Array<{ encodedPolyline: string; intervals: SpeedInterval[] }>> {
  if (waypointCount > 0) {
    return [];
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(ROUTES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'routes.polyline.encodedPolyline,routes.duration,routes.staticDuration,routes.distanceMeters,routes.travelAdvisory.speedReadingIntervals',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: origin.latitude, longitude: origin.longitude },
          },
        },
        destination: {
          location: {
            latLng: { latitude: destination.latitude, longitude: destination.longitude },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: true,
        extraComputations: ['TRAFFIC_ON_POLYLINE'],
        // HIGH is the same SKU as OVERVIEW — more vertices, still on the free credit.
        polylineQuality: 'HIGH',
        polylineEncoding: 'ENCODED_POLYLINE',
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error || !Array.isArray(data.routes)) {
      if (__DEV__) {
        console.warn(
          '[RoutesTraffic] overlay skipped:',
          data.error?.message || data.status || response.status
        );
      }
      return [];
    }

    return (data.routes as RoutesApiRoute[])
      .map((route) => ({
        encodedPolyline: route.polyline?.encodedPolyline || '',
        intervals: intervalsFromAdvisory(route.travelAdvisory),
      }))
      .filter((route) => route.encodedPolyline);
  } catch (error) {
    if (__DEV__) {
      console.warn('[RoutesTraffic] overlay failed:', error);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export function attachTrafficOverlays(
  routes: Route[],
  overlays: Array<{ encodedPolyline: string; intervals: SpeedInterval[] }>
): Route[] {
  if (overlays.length === 0) {
    return routes;
  }

  return routes.map((route, index) => {
    const overlay = overlays[index] ?? overlays[0];
    if (!overlay) {
      return route;
    }
    return {
      ...route,
      trafficIntervals: overlay.intervals,
    };
  });
}
