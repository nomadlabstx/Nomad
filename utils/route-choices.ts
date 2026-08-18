/**
 * Labels for alternative routes: what road they use, and why you'd pick one.
 */

import type { Route } from '../types/navigation';
import { classifyTraffic, type TrafficLevel } from './traffic';

export interface RouteChoice {
  id: string;
  title: string;
  reason: string;
  isFastest: boolean;
  isShortest: boolean;
}

function effectiveDuration(route: Route): number {
  return route.totalDurationInTraffic || route.totalDuration;
}

function trafficLevelOf(route: Route): TrafficLevel {
  return route.trafficLevel || classifyTraffic(route.totalDuration, route.totalDurationInTraffic);
}

/** "CT-15 N and I-84" → "CT-15 to I-84" */
export function formatRoadList(summary?: string | null): string {
  const trimmed = (summary || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed
    .replace(/\s+[NSEW](?=\s|$)/gi, '')
    .replace(/\s+and\s+/gi, ' to ')
    .trim();
}

export function formatViaTitle(summary?: string | null): string {
  const roads = formatRoadList(summary);
  return roads ? `Via ${roads}` : 'Alternative';
}

function formatDelta(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

export function describeRouteChoices(routes: Route[]): RouteChoice[] {
  if (routes.length === 0) {
    return [];
  }

  let fastest = routes[0];
  let shortest = routes[0];
  for (const route of routes) {
    if (effectiveDuration(route) < effectiveDuration(fastest)) {
      fastest = route;
    }
    if (route.totalDistance < shortest.totalDistance) {
      shortest = route;
    }
  }

  const fastestTraffic = trafficLevelOf(fastest);
  const fastestRoads = formatRoadList(fastest.summary) || 'the fastest route';

  return routes.map((route) => {
    const isFastest = route.id === fastest.id;
    const isShortest = route.id === shortest.id;
    const deltaSec = effectiveDuration(route) - effectiveDuration(fastest);
    const level = trafficLevelOf(route);
    const lighterThanFastest =
      (fastestTraffic === 'heavy' && level !== 'heavy') ||
      (fastestTraffic === 'moderate' && level === 'clear');

    const bits: string[] = [];

    if (!isFastest && lighterThanFastest) {
      bits.push(`Due to ${fastestTraffic} traffic on ${fastestRoads}`);
    }

    if (isFastest) {
      bits.push('Fastest');
      if (level === 'moderate' || level === 'heavy') {
        bits.push(`${level === 'heavy' ? 'Heavy' : 'Moderate'} traffic`);
      }
    } else if (deltaSec >= 30) {
      bits.push(`${formatDelta(deltaSec)} slower`);
    }

    if (isShortest && routes.length > 1 && shortest.id !== fastest.id) {
      bits.push('Shortest');
    }

    if (route.hasTolls) {
      bits.push('Has tolls');
    } else if (fastest.hasTolls) {
      bits.push('No tolls');
    }

    if (!isFastest && !route.hasHighways && fastest.hasHighways) {
      bits.push('Avoids highways');
    }

    if (bits.length === 0) {
      bits.push(isFastest ? 'Recommended' : 'Another way');
    }

    return {
      id: route.id,
      title: formatViaTitle(route.summary),
      reason: bits.join(' · '),
      isFastest,
      isShortest,
    };
  });
}
