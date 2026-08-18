/**
 * Route Matching Service - Core GPS Navigation Logic
 * Implements map matching and route following like Apple Maps, Google Maps, and Waze
 */

import { Coordinates, Route, RouteStep } from '../types/navigation';

export interface RouteProgress {
  currentStepIndex: number;
  currentLegIndex: number;
  stepProgress: number; // 0-100% through current step
  totalRouteProgress: number; // 0-100% through entire route
  distanceFromRoute: number; // meters off route
  nearestPointOnRoute: Coordinates;
  isOnRoute: boolean;
}

export interface MapMatchResult {
  nearestPoint: Coordinates;
  distanceFromRoute: number;
  segmentIndex: number;
  progressAlongSegment: number; // 0-1
}

export class RouteMatchingService {
  /**
   * Find the nearest point on a polyline to a given location
   * This is the core of map matching used by all GPS apps
   */
  findNearestPointOnPolyline(
    userLocation: Coordinates,
    polyline: Coordinates[]
  ): MapMatchResult {
    if (polyline.length < 2) {
      return {
        nearestPoint: userLocation,
        distanceFromRoute: 0,
        segmentIndex: 0,
        progressAlongSegment: 0,
      };
    }

    let minDistance = Infinity;
    let nearestPoint = userLocation;
    let segmentIndex = 0;
    let progressAlongSegment = 0;

    // Check each segment of the polyline
    for (let i = 0; i < polyline.length - 1; i++) {
      const segmentStart = polyline[i];
      const segmentEnd = polyline[i + 1];
      
      const { point, distance, progress } = this.findNearestPointOnSegment(
        userLocation,
        segmentStart,
        segmentEnd
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
        segmentIndex = i;
        progressAlongSegment = progress;
      }
    }

    return {
      nearestPoint,
      distanceFromRoute: minDistance,
      segmentIndex,
      progressAlongSegment,
    };
  }

  /**
   * Find the nearest point on a line segment to a given point
   * Uses perpendicular projection from point to line segment
   */
  private findNearestPointOnSegment(
    point: Coordinates,
    segmentStart: Coordinates,
    segmentEnd: Coordinates
  ): { point: Coordinates; distance: number; progress: number } {
    const dx = segmentEnd.longitude - segmentStart.longitude;
    const dy = segmentEnd.latitude - segmentStart.latitude;
    const dz = 0; // Assuming flat earth for simplicity

    // If segment has zero length, return start point
    if (dx === 0 && dy === 0) {
      return {
        point: segmentStart,
        distance: this.calculateDistance(point, segmentStart),
        progress: 0,
      };
    }

    // Calculate projection parameter t
    const t = ((point.longitude - segmentStart.longitude) * dx + 
               (point.latitude - segmentStart.latitude) * dy) / 
              (dx * dx + dy * dy);

    // Clamp t to [0, 1] to stay on segment
    const clampedT = Math.max(0, Math.min(1, t));

    // Calculate nearest point on segment
    const nearestPoint: Coordinates = {
      longitude: segmentStart.longitude + clampedT * dx,
      latitude: segmentStart.latitude + clampedT * dy,
    };

    const distance = this.calculateDistance(point, nearestPoint);

    return {
      point: nearestPoint,
      distance,
      progress: clampedT,
    };
  }

  /**
   * Track progress along the entire route
   * This is how real GPS apps determine step advancement
   */
  trackRouteProgress(
    userLocation: Coordinates,
    route: Route,
    lockedStepIndex?: number,
    lockedLegIndex: number = 0
  ): RouteProgress {
    const currentLegIndex =
      route.legs.length === 0
        ? 0
        : Math.min(Math.max(0, lockedLegIndex), route.legs.length - 1);
    const currentLeg = route.legs[currentLegIndex];
    if (!currentLeg || currentLeg.steps.length === 0) {
      return {
        currentStepIndex: 0,
        currentLegIndex,
        stepProgress: 0,
        totalRouteProgress: 0,
        distanceFromRoute: 0,
        nearestPointOnRoute: userLocation,
        isOnRoute: false,
      };
    }

    // Find nearest point on the detailed route (overview jumps off the road)
    const routePolyline = this.detailedRoutePolyline(route);
    const mapMatch = this.findNearestPointOnPolyline(userLocation, routePolyline);

    // Use locked step index during active navigation — don't jump steps from GPS noise
    const currentStepIndex =
      lockedStepIndex !== undefined
        ? Math.min(Math.max(0, lockedStepIndex), currentLeg.steps.length - 1)
        : this.findCurrentStepFromRouteProgress(mapMatch, route, userLocation, currentLegIndex);

    const currentStep = currentLeg.steps[currentStepIndex];
    
    // Calculate step progress (0-100%)
    const stepProgress = this.calculateStepProgress(
      userLocation,
      currentStep,
      mapMatch
    );

    // Calculate total route progress
    const totalRouteProgress = this.calculateTotalRouteProgress(
      currentStepIndex,
      stepProgress,
      currentLeg.steps.length
    );

    // Determine if user is on route (within 75 meters)
    const isOnRoute = mapMatch.distanceFromRoute <= 75;

    return {
      currentStepIndex,
      currentLegIndex,
      stepProgress,
      totalRouteProgress,
      distanceFromRoute: mapMatch.distanceFromRoute,
      nearestPointOnRoute: mapMatch.nearestPoint,
      isOnRoute,
    };
  }

  /**
   * Find which step the user is currently on based on route progress
   */
  private findCurrentStepFromRouteProgress(
    mapMatch: MapMatchResult,
    route: Route,
    userLocation: Coordinates,
    lockedLegIndex: number = 0
  ): number {
    const currentLeg = route.legs[lockedLegIndex] ?? route.legs[0];
    if (!currentLeg || currentLeg.steps.length === 0) {
      return 0;
    }
    
    // For each step, check if user is closer to its polyline than other steps
    let closestStepIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < currentLeg.steps.length; i++) {
      const step = currentLeg.steps[i];
      const stepPolyline = this.decodePolyline(step.polyline);
      const stepMapMatch = this.findNearestPointOnPolyline(userLocation, stepPolyline);
      
      if (stepMapMatch.distanceFromRoute < minDistance) {
        minDistance = stepMapMatch.distanceFromRoute;
        closestStepIndex = i;
      }
    }

    return closestStepIndex;
  }

  /**
   * Calculate how far through the current step the user is (0-100%)
   * Uses cumulative distance along the full step polyline, not just the nearest segment.
   */
  private calculateStepProgress(
    userLocation: Coordinates,
    currentStep: RouteStep,
    _mapMatch: MapMatchResult
  ): number {
    const stepPolyline = this.decodePolyline(currentStep.polyline);
    if (stepPolyline.length < 2) {
      const stepLength = currentStep.distance || 0;
      if (stepLength <= 0) return 0;
      const traveled = Math.max(
        0,
        stepLength - this.calculateDistance(userLocation, currentStep.endLocation)
      );
      return Math.min(100, (traveled / stepLength) * 100);
    }

    const stepMapMatch = this.findNearestPointOnPolyline(userLocation, stepPolyline);
    const totalLength = this.calculatePolylineLength(stepPolyline);
    if (totalLength <= 0) return 0;

    let distanceAlongStep = 0;
    for (let i = 0; i < stepMapMatch.segmentIndex; i++) {
      distanceAlongStep += this.calculateDistance(stepPolyline[i], stepPolyline[i + 1]);
    }
    distanceAlongStep += this.calculateDistance(
      stepPolyline[stepMapMatch.segmentIndex],
      stepMapMatch.nearestPoint
    );

    return Math.min(100, Math.max(0, (distanceAlongStep / totalLength) * 100));
  }

  /**
   * Remaining distance along a polyline from the snapped position to the last vertex.
   * Counts down as you follow the road; crow-flies to the end pin can go up on curves.
   */
  remainingDistanceAlongPolyline(
    userLocation: Coordinates,
    polyline: Coordinates[]
  ): number {
    if (polyline.length === 0) {
      return 0;
    }
    if (polyline.length === 1) {
      return this.calculateDistance(userLocation, polyline[0]);
    }

    const match = this.findNearestPointOnPolyline(userLocation, polyline);
    const nextIndex = match.segmentIndex + 1;
    let remaining =
      nextIndex < polyline.length
        ? this.calculateDistance(match.nearestPoint, polyline[nextIndex])
        : 0;

    for (let i = nextIndex; i < polyline.length - 1; i++) {
      remaining += this.calculateDistance(polyline[i], polyline[i + 1]);
    }

    return remaining;
  }

  remainingDistanceAlongStep(userLocation: Coordinates, currentStep: RouteStep): number {
    const stepPolyline = this.decodePolyline(currentStep.polyline || '');
    if (stepPolyline.length < 2) {
      return this.calculateDistance(userLocation, currentStep.endLocation);
    }
    return this.remainingDistanceAlongPolyline(userLocation, stepPolyline);
  }

  distanceToStep(userLocation: Coordinates, step: RouteStep): number {
    const stepPolyline = this.decodePolyline(step.polyline || '');
    if (stepPolyline.length < 2) {
      return this.calculateDistance(userLocation, step.endLocation);
    }
    return this.findNearestPointOnPolyline(userLocation, stepPolyline).distanceFromRoute;
  }

  /**
   * Distance to the entrance of a step (ramp / merge gore), not the whole highway.
   * Snapping to a later interstate that runs parallel must not count as "already merged."
   */
  distanceToStepEntry(userLocation: Coordinates, step: RouteStep): number {
    const polyline = this.decodePolyline(step.polyline || '');
    if (polyline.length >= 2) {
      const entry = this.polylinePrefix(polyline, 120);
      return this.findNearestPointOnPolyline(userLocation, entry).distanceFromRoute;
    }
    return this.calculateDistance(userLocation, step.startLocation);
  }

  /**
   * Banner distance: remaining on this road, or the gap to the next ramp when
   * Google ends the current step long before you can actually enter the next road.
   */
  distanceToUpcomingManeuver(
    userLocation: Coordinates,
    currentStep: RouteStep,
    nextStep?: RouteStep
  ): number {
    const remaining = this.remainingDistanceAlongStep(userLocation, currentStep);
    if (!nextStep) {
      return remaining;
    }
    const toEntry = this.distanceToStepEntry(userLocation, nextStep);
    if (remaining <= 50 && toEntry > remaining) {
      return toEntry;
    }
    return remaining;
  }

  /**
   * Only leave a step when its geometry is finished AND you are at the next
   * step's entrance. Nearby later highways must not skip the ramp.
   */
  canAdvanceToNextStep(
    userLocation: Coordinates,
    currentStep: RouteStep,
    nextStep?: RouteStep
  ): boolean {
    if (!nextStep) {
      return this.remainingDistanceAlongStep(userLocation, currentStep) <= 35;
    }
    const remaining = this.remainingDistanceAlongStep(userLocation, currentStep);
    if (remaining > 50) {
      return false;
    }
    return this.distanceToStepEntry(userLocation, nextStep) <= 55;
  }

  /**
   * Advance at most one step, and only after the current step is actually finished.
   * Being near a later highway (parallel to the road you're still on) must not skip ahead.
   */
  resolveActiveStepIndex(
    userLocation: Coordinates,
    route: Route,
    lockedStepIndex: number,
    lockedLegIndex: number = 0
  ): number {
    const steps = route.legs[lockedLegIndex]?.steps;
    if (!steps || steps.length === 0) {
      return 0;
    }

    const locked = Math.min(Math.max(0, lockedStepIndex), steps.length - 1);
    if (locked >= steps.length - 1) {
      return locked;
    }

    if (!this.canAdvanceToNextStep(userLocation, steps[locked], steps[locked + 1])) {
      return locked;
    }

    return locked + 1;
  }

  private polylinePrefix(polyline: Coordinates[], maxMeters: number): Coordinates[] {
    if (polyline.length < 2 || maxMeters <= 0) {
      return polyline.slice(0, Math.min(2, polyline.length));
    }

    const prefix: Coordinates[] = [polyline[0]];
    let accumulated = 0;
    for (let i = 0; i < polyline.length - 1; i++) {
      const span = this.calculateDistance(polyline[i], polyline[i + 1]);
      if (accumulated + span >= maxMeters) {
        const t = span > 0 ? (maxMeters - accumulated) / span : 0;
        prefix.push({
          latitude: polyline[i].latitude + t * (polyline[i + 1].latitude - polyline[i].latitude),
          longitude: polyline[i].longitude + t * (polyline[i + 1].longitude - polyline[i].longitude),
        });
        return prefix;
      }
      accumulated += span;
      prefix.push(polyline[i + 1]);
    }
    return prefix;
  }

  private calculatePolylineLength(polyline: Coordinates[]): number {
    let total = 0;
    for (let i = 0; i < polyline.length - 1; i++) {
      total += this.calculateDistance(polyline[i], polyline[i + 1]);
    }
    return total;
  }

  /**
   * Calculate total progress through the entire route (0-100%)
   */
  private calculateTotalRouteProgress(
    currentStepIndex: number,
    stepProgress: number,
    totalSteps: number
  ): number {
    if (totalSteps === 0) return 0;
    
    const completedSteps = currentStepIndex;
    const currentStepContribution = stepProgress / 100;
    
    return ((completedSteps + currentStepContribution) / totalSteps) * 100;
  }

  /**
   * Check if user should advance to next step.
   * Distance to step end is primary; progress % is a secondary signal only when near the turn.
   */
  shouldAdvanceStep(
    _routeProgress: RouteProgress,
    userLocation: Coordinates,
    currentStep: RouteStep,
    nextStep?: RouteStep
  ): boolean {
    return this.canAdvanceToNextStep(userLocation, currentStep, nextStep);
  }

  /**
   * Check if user is off route
   * Real GPS apps consider user off route if >75m from route polyline
   */
  isOffRoute(
    userLocation: Coordinates,
    route: Route,
    threshold: number = 75
  ): boolean {
    const routePolyline = this.detailedRoutePolyline(route);
    const mapMatch = this.findNearestPointOnPolyline(userLocation, routePolyline);
    
    return mapMatch.distanceFromRoute > threshold;
  }

  /**
   * Step polylines follow the road. Overview is only used if a step has no geometry.
   */
  private detailedRoutePolyline(route: Route): Coordinates[] {
    const points: Coordinates[] = [];
    const push = (point: Coordinates) => {
      const last = points[points.length - 1];
      if (last && last.latitude === point.latitude && last.longitude === point.longitude) {
        return;
      }
      points.push(point);
    };

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        const decoded = step.polyline ? this.decodePolyline(step.polyline) : [];
        if (decoded.length >= 2) {
          decoded.forEach(push);
          continue;
        }
        push(step.startLocation);
        push(step.endLocation);
      }
    }

    if (points.length >= 2) {
      return points;
    }
    return route.overviewPolyline ? this.decodePolyline(route.overviewPolyline) : [];
  }

  /**
   * Decode Google polyline string to coordinates array
   */
  private decodePolyline(encoded: string): Coordinates[] {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return poly;
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const routeMatchingService = new RouteMatchingService();
