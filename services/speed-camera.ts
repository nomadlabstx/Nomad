/**
 * Speed Camera Warning Service
 * Provides alerts for upcoming speed cameras, red light cameras, and speed traps
 */

import type { Coordinates } from '../types/navigation';

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

class SpeedCameraService {
  private cameras: SpeedCamera[] = [];
  private userReportedCameras: Map<string, SpeedCamera> = new Map();
  
  // Alert distances in meters
  private readonly ALERT_DISTANCES = {
    far: 1500,      // 0.93 miles
    medium: 800,    // 0.5 miles
    near: 400,      // 0.25 miles
    very_near: 200, // 650 feet
  };

  constructor() {
    this.loadCameraDatabase();
  }

  /**
   * Load camera database
   * In production, this would fetch from a crowd-sourced database or API
   */
  private loadCameraDatabase(): void {
    // Sample cameras for Texas (Waco, Austin, Dallas area)
    this.cameras = [
      // Austin cameras
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
      // Dallas cameras
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
      // Mobile speed trap common locations
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

  /**
   * Check for cameras along current route
   */
  checkForCameras(
    currentLocation: Coordinates,
    currentSpeed: number, // mph
    heading: number, // degrees
    route?: { latitude: number; longitude: number }[]
  ): CameraAlert[] {
    const alerts: CameraAlert[] = [];
    const cameras = this.getAllCameras();

    for (const camera of cameras) {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        camera.coordinates.latitude,
        camera.coordinates.longitude
      );

      // Only alert for cameras within 1.5 miles (2.4 km)
      if (distance > 1500) continue;

      // Check if camera is ahead of us (not behind)
      const bearing = this.calculateBearing(currentLocation, camera.coordinates);
      const headingDiff = Math.abs(bearing - heading);
      
      // Camera must be roughly in our direction of travel (within 90 degrees)
      if (headingDiff > 90 && headingDiff < 270) continue;

      const timeToCamera = currentSpeed > 0 ? distance / (currentSpeed * 0.44704) : 999; // Convert mph to m/s

      const alert: CameraAlert = {
        camera,
        distanceToCamera: distance,
        timeToCamera,
        shouldAlert: this.shouldAlert(distance, currentSpeed, camera.speedLimit),
        alertLevel: this.getAlertLevel(distance),
      };

      alerts.push(alert);
    }

    // Sort by distance (closest first)
    return alerts.sort((a, b) => a.distanceToCamera - b.distanceToCamera);
  }

  /**
   * Determine if we should alert the user
   */
  private shouldAlert(distance: number, currentSpeed: number, cameraSpeedLimit: number): boolean {
    // Alert if within 1.5 miles and going over speed limit
    if (distance > 1500) return false;
    
    // Alert if speeding or approaching camera
    return currentSpeed > cameraSpeedLimit || distance < 800;
  }

  /**
   * Get alert urgency level based on distance
   */
  private getAlertLevel(distance: number): 'far' | 'medium' | 'near' | 'very_near' {
    if (distance < this.ALERT_DISTANCES.very_near) return 'very_near';
    if (distance < this.ALERT_DISTANCES.near) return 'near';
    if (distance < this.ALERT_DISTANCES.medium) return 'medium';
    return 'far';
  }

  /**
   * Format camera alert message
   */
  getAlertMessage(alert: CameraAlert): string {
    const { camera, distanceToCamera, alertLevel } = alert;
    
    const distanceMiles = (distanceToCamera * 0.000621371).toFixed(1);
    const distanceFeet = Math.round(distanceToCamera * 3.28084);
    
    let distance = distanceToCamera > 800 
      ? `${distanceMiles} miles` 
      : `${distanceFeet} feet`;

    let urgency = '';
    switch (alertLevel) {
      case 'very_near':
        urgency = '⚠️ AHEAD: ';
        break;
      case 'near':
        urgency = '⚠️ ';
        break;
      case 'medium':
        urgency = '📷 ';
        break;
      case 'far':
        urgency = '📷 ';
        break;
    }

    let cameraType = '';
    switch (camera.type) {
      case 'speed':
        cameraType = 'Speed camera';
        break;
      case 'red_light':
        cameraType = 'Red light camera';
        break;
      case 'mobile':
        cameraType = 'Mobile speed trap';
        break;
      case 'average_speed':
        cameraType = 'Average speed camera';
        break;
    }

    return `${urgency}${cameraType} in ${distance}`;
  }

  /**
   * Report a camera (crowd-sourced data)
   */
  reportCamera(location: Coordinates, type: CameraType, speedLimit: number, road: string): void {
    const id = `user-${Date.now()}`;
    const camera: SpeedCamera = {
      id,
      type,
      coordinates: location,
      speedLimit,
      road,
      verified: false,
      lastUpdated: Date.now(),
    };

    this.userReportedCameras.set(id, camera);
    
    // In production, this would sync to a backend
    console.log('📷 Camera reported:', camera);
  }

  /**
   * Thank user for reporting (confirmation)
   */
  confirmReport(location: Coordinates): string {
    const nearbyCamera = this.findNearbyCamera(location, 100); // Within 100m
    
    if (nearbyCamera) {
      return '✅ Thanks! This camera was already reported.';
    } else {
      return '✅ Thanks! Camera added to community database.';
    }
  }

  /**
   * Find camera near location
   */
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

  /**
   * Calculate distance between two points (Haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing from point A to point B
   * Returns bearing in degrees (0-360)
   */
  private calculateBearing(from: Coordinates, to: Coordinates): number {
    const dLon = this.toRadians(to.longitude - from.longitude);
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Get all cameras (for debugging/testing)
   */
  getAllCameras(): SpeedCamera[] {
    return [...this.cameras, ...Array.from(this.userReportedCameras.values())];
  }
}

// Export singleton instance
export const speedCameraService = new SpeedCameraService();


