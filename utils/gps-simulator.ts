/**
 * Dev-only GPS route player.
 * Walks a polyline at a chosen speed and emits Location-like updates
 * so navigation and trip recording can be tested without driving.
 */

import type { LocationObject } from 'expo-location';
import { calculateDistance, toRad } from './calculations';

export type GpsSimulatorPreset = 'city' | 'highway' | 'fast';

export const GPS_SIMULATOR_SPEEDS_MPS: Record<GpsSimulatorPreset, number> = {
  city: 11.176, // 25 mph
  highway: 29.057, // 65 mph
  fast: 89.408, // 200 mph — short routes finish in seconds
};

export const GPS_SIMULATOR_TICK_MS = 1000;

export interface PathPoint {
  latitude: number;
  longitude: number;
}

export interface PathMetrics {
  path: PathPoint[];
  cumulative: number[];
  total: number;
}

export interface PathSample {
  coordinate: PathPoint;
  heading: number;
  distanceAlongMeters: number;
  totalMeters: number;
  done: boolean;
}

export interface GpsSimulatorSnapshot {
  running: boolean;
  paused: boolean;
  preset: GpsSimulatorPreset;
  progress: number;
}

const EMPTY_SNAPSHOT: GpsSimulatorSnapshot = {
  running: false,
  paused: false,
  preset: 'highway',
  progress: 0,
};

export function bearingDegrees(from: PathPoint, to: PathPoint): number {
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function buildPathMetrics(path: PathPoint[]): PathMetrics {
  const filtered = path.filter(
    (point, index) =>
      index === 0 ||
      point.latitude !== path[index - 1].latitude ||
      point.longitude !== path[index - 1].longitude
  );
  const cumulative = [0];
  for (let i = 1; i < filtered.length; i++) {
    cumulative.push(cumulative[i - 1] + calculateDistance(filtered[i - 1], filtered[i]));
  }
  return {
    path: filtered,
    cumulative,
    total: cumulative[cumulative.length - 1] ?? 0,
  };
}

export function sampleAlongPath(metrics: PathMetrics, distanceMeters: number): PathSample {
  const { path, cumulative, total } = metrics;
  if (path.length === 0) {
    return {
      coordinate: { latitude: 0, longitude: 0 },
      heading: 0,
      distanceAlongMeters: 0,
      totalMeters: 0,
      done: true,
    };
  }

  if (path.length === 1 || total <= 0) {
    return {
      coordinate: path[0],
      heading: 0,
      distanceAlongMeters: 0,
      totalMeters: total,
      done: true,
    };
  }

  const d = Math.min(Math.max(0, distanceMeters), total);
  let i = 1;
  while (i < cumulative.length && cumulative[i] < d) {
    i += 1;
  }

  const i1 = Math.max(0, i - 1);
  const i2 = Math.min(path.length - 1, i);
  const segStart = cumulative[i1];
  const segEnd = cumulative[i2];
  const segLen = segEnd - segStart;
  const t = segLen <= 0 ? 0 : (d - segStart) / segLen;
  const coordinate = {
    latitude: path[i1].latitude + (path[i2].latitude - path[i1].latitude) * t,
    longitude: path[i1].longitude + (path[i2].longitude - path[i1].longitude) * t,
  };

  let headingFrom = path[i1];
  let headingTo = path[i2];
  if (headingFrom.latitude === headingTo.latitude && headingFrom.longitude === headingTo.longitude) {
    const lookAhead = Math.min(path.length - 1, i2 + 1);
    headingTo = path[lookAhead];
  }

  return {
    coordinate,
    heading: bearingDegrees(headingFrom, headingTo),
    distanceAlongMeters: d,
    totalMeters: total,
    done: d >= total - 0.5,
  };
}

function toLocationObject(sample: PathSample, speedMps: number): LocationObject {
  return {
    coords: {
      latitude: sample.coordinate.latitude,
      longitude: sample.coordinate.longitude,
      altitude: null,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: sample.heading,
      speed: speedMps,
    },
    timestamp: Date.now(),
    mocked: true,
  };
}

type LocationListener = (location: LocationObject) => void;
type StateListener = () => void;

class GpsSimulator {
  private locationListeners = new Set<LocationListener>();
  private stateListeners = new Set<StateListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private metrics: PathMetrics | null = null;
  private distanceAlong = 0;
  private speedMps = GPS_SIMULATOR_SPEEDS_MPS.highway;
  private preset: GpsSimulatorPreset = 'highway';
  private running = false;
  private paused = false;
  private snapshot: GpsSimulatorSnapshot = EMPTY_SNAPSHOT;
  private lastSample: PathSample | null = null;

  isRunning(): boolean {
    return this.running;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getSnapshot = (): GpsSimulatorSnapshot => this.snapshot;

  getCoordinates(): PathPoint | null {
    return this.lastSample?.coordinate ?? this.metrics?.path[0] ?? null;
  }

  subscribe(listener: LocationListener): { remove: () => void } {
    this.locationListeners.add(listener);
    if (this.running && this.lastSample) {
      listener(toLocationObject(this.lastSample, this.paused ? 0 : this.speedMps));
    }
    return {
      remove: () => {
        this.locationListeners.delete(listener);
      },
    };
  }

  subscribeState = (listener: StateListener): (() => void) => {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  };

  start(path: PathPoint[], preset: GpsSimulatorPreset = 'highway'): boolean {
    if (!__DEV__) {
      return false;
    }

    const metrics = buildPathMetrics(path);
    if (metrics.path.length < 2 || metrics.total <= 0) {
      return false;
    }

    this.stopTimer();
    this.metrics = metrics;
    this.distanceAlong = 0;
    this.preset = preset;
    this.speedMps = GPS_SIMULATOR_SPEEDS_MPS[preset];
    this.running = true;
    this.paused = false;
    this.emitTick(true);
    this.timer = setInterval(() => this.emitTick(false), GPS_SIMULATOR_TICK_MS);
    this.publishState();
    return true;
  }

  setPreset(preset: GpsSimulatorPreset): void {
    this.preset = preset;
    this.speedMps = GPS_SIMULATOR_SPEEDS_MPS[preset];
    this.publishState();
  }

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.publishState();
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.publishState();
  }

  stop(): void {
    const wasActive = this.running;
    this.stopTimer();
    this.running = false;
    this.paused = false;
    this.metrics = null;
    this.distanceAlong = 0;
    this.lastSample = null;
    if (wasActive) {
      this.publishState();
    }
  }

  private emitTick(force: boolean): void {
    if (!this.metrics || !this.running) return;
    if (this.paused && !force) return;

    if (!this.paused && !force) {
      this.distanceAlong += this.speedMps * (GPS_SIMULATOR_TICK_MS / 1000);
    }

    const sample = sampleAlongPath(this.metrics, this.distanceAlong);
    this.lastSample = sample;
    const location = toLocationObject(sample, this.paused ? 0 : this.speedMps);
    this.locationListeners.forEach((listener) => listener(location));
    this.publishState();

    if (sample.done) {
      this.stop();
    }
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private publishState(): void {
    const progress =
      this.metrics && this.metrics.total > 0
        ? Math.min(1, this.distanceAlong / this.metrics.total)
        : 0;
    this.snapshot = {
      running: this.running,
      paused: this.paused,
      preset: this.preset,
      progress,
    };
    this.stateListeners.forEach((listener) => listener());
  }
}

export const gpsSimulator = new GpsSimulator();
