/**
 * Speed Camera Warning Service
 * Sample Texas points plus a throttled nearby OpenStreetMap highway=speed_camera query.
 */

import type { Coordinates } from '../types/navigation';
import { cameraCacheKey, isHeadingAhead } from '../utils/drive-hud';
import { parseOverpassCameras } from '../utils/osm-cameras';

export type CameraType = 'speed' | 'red_light' | 'mobile' | 'average_speed';

export interface SpeedCamera {
  id: string;
  type: CameraType;
  coordinates: Coordinates;
  speedLimit: number; // mph
  direction?: 'north' | 'south' | 'east' | 'west' | 'both';
  road: string;
  verified: boolean;
  lastUpdated: number;
}

export interface CameraAlert {
  camera: SpeedCamera;
  distanceToCamera: number; // meters
  timeToCamera: number; // seconds
  shouldAlert: boolean;
  alertLevel: 'far' | 'medium' | 'near' | 'very_near';
}

const OSM_FETCH_COOLDOWN_MS = 60_000;
const OSM_AROUND_METERS = 1500;

class SpeedCameraService {
  private cameras: SpeedCamera[] = [];
  private userReportedCameras: Map<string, SpeedCamera> = new Map();
  private osmCameras: Map<string, SpeedCamera> = new Map();
  private osmCache = new Map<string, { fetchedAt: number; ids: string[] }>();
  private lastOsmFetchAt = 0;
  private inflightOsm: Promise<void> | null = null;

  private readonly ALERT_DISTANCES = {
    far: 1500,
    medium: 800,
    near: 400,
    very_near: 200,
  };

  constructor() {
    this.loadCameraDatabase();
  }

  private loadCameraDatabase(): void {
    this.cameras = [
      {
        id: 'atx-1',
        type: 'speed',
        coordinates: { latitude: 30.2672, longitude: -97.7431 },
        speedLimit: 65,
        direction: 'both',
        road: 'I-35',
        verified: true,
        lastUpdated: Date.now(),
      },
      {
        id: 'atx-2',
        type: 'red_light',
        coordinates: { latitude: 30.2500, longitude: -97.7500 },
        speedLimit: 45,
        direction: 'both',
        road: 'Lamar Blvd & 6th St',
        verified: true,
        lastUpdated: Date.now(),
      },
      {
        id: 'dfw-1',
        type: 'speed',
        coordinates: { latitude: 32.7767, longitude: -96.7970 },
        speedLimit: 70,
        direction: 'both',
        road: 'I-35E',
        verified: true,
        lastUpdated: Date.now(),
      },
      {
        id: 'mobile-1',
        type: 'mobile',
        coordinates: { latitude: 31.5493, longitude: -97.1467 },
        speedLimit: 55,
        direction: 'both',
        road: 'I-35 near Waco',
        verified: false,
        lastUpdated: Date.now(),
      },
    ];
  }

  async refreshNearbyFromOsm(location: Coordinates): Promise<void> {
    const key = cameraCacheKey(location.latitude, location.longitude);
    const cached = this.osmCache.get(key);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < OSM_FETCH_COOLDOWN_MS) {
      return;
    }
    if (now - this.lastOsmFetchAt < OSM_FETCH_COOLDOWN_MS && this.inflightOsm) {
      return this.inflightOsm;
    }

    this.inflightOsm = this.fetchOsmCameras(location, key);
    try {
      await this.inflightOsm;
    } finally {
      this.inflightOsm = null;
    }
  }

  private async fetchOsmCameras(location: Coordinates, key: string): Promise<void> {
    this.lastOsmFetchAt = Date.now();
    const query = `[out:json][timeout:15];node["highway"="speed_camera"](around:${OSM_AROUND_METERS},${location.latitude},${location.longitude});out;`;
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      const parsed = parseOverpassCameras(payload);
      for (const camera of parsed) {
        this.osmCameras.set(camera.id, {
          id: camera.id,
          type: camera.type,
          coordinates: camera.coordinates,
          speedLimit: camera.speedLimit,
          direction: 'both',
          road: camera.road,
          verified: true,
          lastUpdated: Date.now(),
        });
      }
      this.osmCache.set(key, {
        fetchedAt: Date.now(),
        ids: parsed.map((camera) => camera.id),
      });
    } catch {
      // Stay quiet on quota / offline. Sample DB still applies.
    }
  }

  checkForCameras(
    currentLocation: Coordinates,
    currentSpeed: number, // mph
    heading: number
  ): CameraAlert[] {
    void this.refreshNearbyFromOsm(currentLocation);

    const alerts: CameraAlert[] = [];

    for (const camera of this.getAllCameras()) {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        camera.coordinates.latitude,
        camera.coordinates.longitude
      );

      if (distance > 1500) continue;
      if (!isHeadingAhead(currentLocation, camera.coordinates, heading)) continue;

      const timeToCamera = currentSpeed > 0 ? distance / (currentSpeed * 0.44704) : 999;

      alerts.push({
        camera,
        distanceToCamera: distance,
        timeToCamera,
        shouldAlert: this.shouldAlert(distance, currentSpeed, camera.speedLimit),
        alertLevel: this.getAlertLevel(distance),
      });
    }

    return alerts.sort((a, b) => a.distanceToCamera - b.distanceToCamera);
  }

  private shouldAlert(distance: number, currentSpeed: number, cameraSpeedLimit: number): boolean {
    if (distance > 1500) return false;
    if (cameraSpeedLimit > 0 && currentSpeed > cameraSpeedLimit) return true;
    return distance < 800;
  }

  private getAlertLevel(distance: number): 'far' | 'medium' | 'near' | 'very_near' {
    if (distance < this.ALERT_DISTANCES.very_near) return 'very_near';
    if (distance < this.ALERT_DISTANCES.near) return 'near';
    if (distance < this.ALERT_DISTANCES.medium) return 'medium';
    return 'far';
  }

  getAlertMessage(alert: CameraAlert): string {
    const { camera, distanceToCamera, alertLevel } = alert;
    const distanceMiles = (distanceToCamera * 0.000621371).toFixed(1);
    const distanceFeet = Math.round(distanceToCamera * 3.28084);
    const distance = distanceToCamera > 800 ? `${distanceMiles} miles` : `${distanceFeet} feet`;
    const urgency = alertLevel === 'very_near' || alertLevel === 'near' ? 'Camera ahead: ' : 'Camera in ';
    const cameraType =
      camera.type === 'red_light'
        ? 'red light camera'
        : camera.type === 'mobile'
          ? 'mobile speed trap'
          : camera.type === 'average_speed'
            ? 'average speed camera'
            : 'speed camera';
    return `${urgency}${cameraType} in ${distance}`;
  }

  reportCamera(location: Coordinates, type: CameraType, speedLimit: number, road: string): void {
    const id = `user-${Date.now()}`;
    this.userReportedCameras.set(id, {
      id,
      type,
      coordinates: location,
      speedLimit,
      road,
      verified: false,
      lastUpdated: Date.now(),
    });
  }

  confirmReport(location: Coordinates): string {
    const nearbyCamera = this.findNearbyCamera(location, 100);
    if (nearbyCamera) {
      return 'Thanks! This camera was already reported.';
    }
    return 'Thanks! Camera added to community database.';
  }

  private findNearbyCamera(location: Coordinates, maxDistance: number): SpeedCamera | null {
    for (const camera of this.getAllCameras()) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        camera.coordinates.latitude,
        camera.coordinates.longitude
      );
      if (distance <= maxDistance) {
        return camera;
      }
    }
    return null;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  getAllCameras(): SpeedCamera[] {
    return [
      ...this.cameras,
      ...Array.from(this.userReportedCameras.values()),
      ...Array.from(this.osmCameras.values()),
    ];
  }
}

export const speedCameraService = new SpeedCameraService();
