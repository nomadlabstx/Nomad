/**
 * Traffic severity and map polyline coloring (Google/Apple Maps style).
 */

import type { Coordinates } from '../types/navigation';

export type TrafficLevel = 'clear' | 'moderate' | 'heavy';
export type TrafficSpeed = 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';

export interface SpeedInterval {
  startPolylinePointIndex: number;
  endPolylinePointIndex: number;
  speed: TrafficSpeed;
}

export interface TrafficSlice {
  coordinates: Coordinates[];
  color: string;
  speed: TrafficSpeed;
}

export const TRAFFIC_COLORS = {
  NORMAL: '#4285F4',
  SLOW: '#FBBC04',
  TRAFFIC_JAM: '#EA4335',
  ALT: '#8B95A1',
  CASING: '#12203A',
} as const;

export function classifyTraffic(
  staticSeconds: number,
  trafficSeconds?: number | null
): TrafficLevel {
  const live = trafficSeconds ?? staticSeconds;
  const delay = Math.max(0, live - staticSeconds);
  const ratio = staticSeconds > 0 ? delay / staticSeconds : 0;

  if (delay >= 10 * 60 || ratio >= 0.15) {
    return 'heavy';
  }
  if (delay >= 2 * 60 || ratio >= 0.05) {
    return 'moderate';
  }
  return 'clear';
}

export function colorForSpeed(speed: TrafficSpeed): string {
  if (speed === 'TRAFFIC_JAM') {
    return TRAFFIC_COLORS.TRAFFIC_JAM;
  }
  if (speed === 'SLOW') {
    return TRAFFIC_COLORS.SLOW;
  }
  return TRAFFIC_COLORS.NORMAL;
}

export function colorForLevel(level: TrafficLevel): string {
  if (level === 'heavy') {
    return TRAFFIC_COLORS.TRAFFIC_JAM;
  }
  if (level === 'moderate') {
    return TRAFFIC_COLORS.SLOW;
  }
  return TRAFFIC_COLORS.NORMAL;
}

export function parseTrafficSpeed(raw?: string): TrafficSpeed {
  const value = (raw || '').toUpperCase();
  if (value === 'TRAFFIC_JAM' || value === 'SLOW') {
    return value;
  }
  return 'NORMAL';
}

/**
 * Split a decoded polyline into colored chunks from Routes API speed intervals.
 * Adjacent chunks share a vertex so the line stays continuous.
 */
export function buildTrafficSlices(
  points: Coordinates[],
  intervals: SpeedInterval[] | undefined,
  fallback: TrafficSpeed = 'NORMAL'
): TrafficSlice[] {
  if (points.length < 2) {
    return [];
  }

  if (!intervals || intervals.length === 0) {
    return [{ coordinates: points, color: colorForSpeed(fallback), speed: fallback }];
  }

  const slices: TrafficSlice[] = [];
  const sorted = [...intervals].sort(
    (a, b) => a.startPolylinePointIndex - b.startPolylinePointIndex
  );

  for (const interval of sorted) {
    const start = Math.max(0, interval.startPolylinePointIndex);
    const end = Math.min(points.length - 1, interval.endPolylinePointIndex);
    if (end <= start) {
      continue;
    }
    const coordinates = points.slice(start, end + 1);
    if (coordinates.length < 2) {
      continue;
    }
    slices.push({
      coordinates,
      color: colorForSpeed(interval.speed),
      speed: interval.speed,
    });
  }

  if (slices.length === 0) {
    return [{ coordinates: points, color: colorForSpeed(fallback), speed: fallback }];
  }

  return slices;
}

export function fallbackSpeedForLevel(level: TrafficLevel): TrafficSpeed {
  if (level === 'heavy') {
    return 'TRAFFIC_JAM';
  }
  if (level === 'moderate') {
    return 'SLOW';
  }
  return 'NORMAL';
}
