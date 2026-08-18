/**
 * Navigation Service
 * Handles GPS navigation, route calculation, and turn-by-turn directions
 */

import * as Speech from 'expo-speech';
import type {
    Coordinates,
    LaneInfo,
    PlaceResult,
    Route,
    RouteLeg,
    RouteOptions,
    RouteStep
} from '../types/navigation';
import { googlePlaces } from './google-places';
import { voiceSettingsService } from './voice-settings';
import { offlineCacheService } from './offline-cache';
import { networkStatusService } from './network-status';
import { classifyTraffic } from '../utils/traffic';
import { formatDirectionInstructionText } from '../utils/format-directions';
import { instructionIndicatesHighway } from '../utils/highway-refs';
import { routeMatchingService } from './route-matching';
import { attachTrafficOverlays, fetchTrafficOverlays } from './routes-traffic';

// Re-export types for other modules to use
export type {
    Coordinates,
    LaneInfo,
    PlaceResult,
    Route,
    RouteLeg,
    RouteOptions,
    RouteStep
} from '../types/navigation';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// ==================== TYPES ====================

// Coordinates and RouteOptions are imported from ../types/navigation

export interface Waypoint {
  location: Coordinates;
  name?: string; // Optional name for the waypoint
  stopDuration?: number; // Expected stop duration in seconds
}

// RouteStep, LaneInfo, Lane, RouteLeg, and Route are imported from ../types/navigation

// Route interface is imported from ../types/navigation

export interface NavigationState {
  isNavigating: boolean;
  currentRoute: Route | null;
  currentStepIndex: number;
  currentLegIndex: number;
  distanceToNextTurn: number; // meters
  timeToDestination: number; // seconds
  distanceRemaining: number; // meters
  nextInstruction: string;
  currentManeuver?: string;
  lanes?: LaneInfo[]; // Lane guidance for current step
}

export interface VoiceGuidanceConfig {
  enabled: boolean;
  language: string;
  pitch: number;
  rate: number;
  // Advanced features (toggleable)
  useNaturalLanguage: boolean; // "Take a left" vs "Turn left"
  useSpeedCoaching: boolean; // Speed limit suggestions
  useContextAnnouncements: boolean; // School zones, construction, etc.
  useLandmarks: boolean; // "Turn at Starbucks" vs street names
}

// ==================== CONSTANTS ====================

const DEFAULT_VOICE_CONFIG: VoiceGuidanceConfig = {
  enabled: true,
  language: 'en-US',
  pitch: 1.0,
  rate: 0.95,
  // Advanced features (all enabled by default, user can disable)
  useNaturalLanguage: true,
  useSpeedCoaching: true,
  useContextAnnouncements: true,
  useLandmarks: true,
};

// Distance thresholds for voice announcements (in meters)
// Based on real GPS apps like Apple Maps, Google Maps, and Waze
const VOICE_THRESHOLDS = {
  FAR: 1000, // "In 1 kilometer, turn left" (major turns)
  MEDIUM: 500, // "In 500 meters, turn left" (medium turns)
  NEAR: 200, // "In 200 meters, turn left" (minor turns)
  NOW: 75, // "Turn left now" (immediate turn)
};

// ==================== NAVIGATION SERVICE ====================

class NavigationService {
  private voiceConfig: VoiceGuidanceConfig = DEFAULT_VOICE_CONFIG;
  private lastAnnouncedDistance: number = Infinity;
  private hasAnnouncedCurrentStep: boolean = false;
  private lastTurnStepKey: string | null = null;
  private lastTurnDistance: number | null = null;

  /**
   * Initialize navigation service with voice settings
   */
  async initialize(): Promise<void> {
    try {
      await voiceSettingsService.initialize();
      this.voiceConfig = voiceSettingsService.getConfig();
    } catch (error) {
      console.warn('[NavigationService] Failed to load voice settings:', error);
      this.voiceConfig = DEFAULT_VOICE_CONFIG;
    }
  }

  /**
   * Calculate route between origin and destination
   * Supports multiple waypoints for multi-stop trips
   * Uses offline cache when available
   */
  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options: RouteOptions = {}
  ): Promise<Route[]> {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    // Check if we're online
    const isOnline = await networkStatusService.isOnline();

    // Try to get cached route first (only if no waypoints, as waypoints complicate caching)
    if (!options.waypoints || options.waypoints.length === 0) {
      const cachedRoute = await offlineCacheService.getCachedRoute(origin, destination);
      if (cachedRoute) {
        console.log('[Navigation] Using cached route');
        return [cachedRoute];
      }
    }

    // If offline and no cache, throw error
    if (!isOnline) {
      throw new Error('No internet connection and no cached route available. Please connect to the internet to calculate a new route.');
    }

    try {
      // Build request parameters
      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        alternatives: 'true', // Request multiple route options
        mode: 'driving',
        departure_time: 'now', // Enable real-time traffic data
        traffic_model: 'best_guess', // Use best traffic prediction
      });

      // Add waypoints if provided (Google Directions max is 25 plus origin/destination)
      if (options.waypoints && options.waypoints.length > 0) {
        const GOOGLE_MAX_WAYPOINTS = 25;
        const capped = options.waypoints.length > GOOGLE_MAX_WAYPOINTS;
        const routeWaypoints = capped
          ? options.waypoints.slice(0, GOOGLE_MAX_WAYPOINTS)
          : options.waypoints;
        const waypointsStr = routeWaypoints
          .map(wp => `${wp.latitude},${wp.longitude}`)
          .join('|');
        
        // Add optimize flag if requested (reorders waypoints for optimal route)
        const waypointPrefix = options.optimizeWaypoints ? 'optimize:true|' : '';
        params.append('waypoints', waypointPrefix + waypointsStr);
      }

      const avoid: string[] = [];
      if (options.avoidTolls) avoid.push('tolls');
      if (options.avoidHighways) avoid.push('highways');
      if (options.avoidFerries) avoid.push('ferries');
      if (avoid.length > 0) {
        params.set('avoid', avoid.join('|'));
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      // Parse routes
      let routes = data.routes.map((route: any, index: number) => this.parseRoute(route, index));

      try {
        const overlays = await fetchTrafficOverlays(
          origin,
          destination,
          Math.min(options.waypoints?.length ?? 0, 25)
        );
        routes = attachTrafficOverlays(routes, overlays);
      } catch (overlayError) {
        if (__DEV__) {
          console.warn('[ROUTE] Traffic overlay skipped:', overlayError);
        }
      }

      // Cache the first route for offline use (only if no waypoints)
      if (routes.length > 0 && (!options.waypoints || options.waypoints.length === 0)) {
        await offlineCacheService.cacheRoute(origin, destination, routes[0]);
      }

      return routes;
    } catch (error) {
      console.error('Failed to calculate route:', error);
      throw error;
    }
  }

  /**
   * Parse Google Directions API route response
   */
  private parseRoute(route: any, index: number): Route {
    const legs = route.legs.map((leg: any) => this.parseLeg(leg));
    
    // Calculate totals
    const totalDistance = legs.reduce((sum: number, leg: RouteLeg) => sum + leg.distance, 0);
    const totalDuration = legs.reduce((sum: number, leg: RouteLeg) => sum + leg.duration, 0);

    // Calculate total duration in traffic (if available)
    const totalDurationInTraffic = route.legs.reduce((sum: number, leg: any) => {
      return sum + (leg.duration_in_traffic?.value || leg.duration.value);
    }, 0);

    // Calculate traffic delay
    const trafficDelay = totalDurationInTraffic - totalDuration;
    const trafficLevel = classifyTraffic(totalDuration, totalDurationInTraffic);
    const hasTrafficDelays = trafficLevel !== 'clear';

    // Check for tolls and highways
    const hasTolls = route.warnings?.some((w: string) => w.toLowerCase().includes('toll')) || false;
    const hasHighways = legs.some((leg: RouteLeg) =>
      leg.steps.some((step: RouteStep) =>
        instructionIndicatesHighway(
          formatDirectionInstructionText(step.instruction),
          step.maneuver
        )
      )
    );

    return {
      id: `route-${index}`,
      legs,
      overviewPolyline: route.overview_polyline.points,
      summary: route.summary,
      warnings: route.warnings || [],
      bounds: {
        northeast: route.bounds.northeast,
        southwest: route.bounds.southwest,
      },
      totalDistance,
      totalDuration,
      totalDurationInTraffic,
      hasTolls,
      hasHighways,
      hasTrafficDelays,
      trafficDelay: hasTrafficDelays ? trafficDelay : undefined,
      trafficLevel,
    };
  }

  /**
   * Parse route leg
   */
  private parseLeg(leg: any): RouteLeg {
    return {
      steps: leg.steps.map((step: any, index: number) => this.parseStep(step, index)),
      distance: leg.distance.value,
      duration: leg.duration.value,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      startLocation: {
        latitude: leg.start_location.lat,
        longitude: leg.start_location.lng,
      },
      endLocation: {
        latitude: leg.end_location.lat,
        longitude: leg.end_location.lng,
      },
    };
  }

  /**
   * Parse route step
   */
  private parseStep(step: any, index: number): RouteStep {
    // Parse lane information if available
    const lanes = step.maneuver && step.lanes ? step.lanes.map((laneGroup: any) => ({
      lanes: laneGroup.lanes || [],
      lanesActive: laneGroup.lanes_active || []
    })) : undefined;

    return {
      id: `step-${index}`,
      instruction: step.html_instructions,
      distance: step.distance.value,
      duration: step.duration.value,
      startLocation: {
        latitude: step.start_location.lat,
        longitude: step.start_location.lng,
      },
      endLocation: {
        latitude: step.end_location.lat,
        longitude: step.end_location.lng,
      },
      polyline: step.polyline.points,
      maneuver: step.maneuver,
      travelMode: step.travel_mode,
      lanes,
    };
  }

  /**
   * Get navigation update based on current location
   */
  getNavigationUpdate(
    currentLocation: Coordinates,
    route: Route,
    currentLegIndex: number,
    currentStepIndex: number
  ): NavigationState {
    const currentLeg = route.legs[currentLegIndex];
    const currentStep = currentLeg.steps[currentStepIndex];

    // Validate coordinates before calculating
    if (!currentLocation || !currentStep.endLocation) {
      console.error('Missing location data:', { currentLocation, endLocation: currentStep.endLocation });
      // Return safe default state
      return {
        isNavigating: true,
        currentRoute: route,
        currentStepIndex,
        currentLegIndex,
        distanceToNextTurn: 0,
        timeToDestination: 0,
        distanceRemaining: 0,
        nextInstruction: currentLeg.steps[currentStepIndex + 1]
          ? formatDirectionInstructionText(currentLeg.steps[currentStepIndex + 1].instruction)
          : 'Arrive at destination',
        currentManeuver: currentStep.maneuver,
        lanes: currentStep.lanes,
      };
    }

    const upcomingStep = currentLeg.steps[currentStepIndex + 1];
    const alongCurrent = routeMatchingService.remainingDistanceAlongStep(
      currentLocation,
      currentStep
    );
    const alongStep = routeMatchingService.distanceToUpcomingManeuver(
      currentLocation,
      currentStep,
      upcomingStep
    );
    const stepKey = `${currentLegIndex}:${currentStepIndex}:${currentStep.id}`;
    let distanceToNextTurn = alongStep;
    const usingGapToRamp = alongStep > alongCurrent + 20;
    if (
      !usingGapToRamp &&
      this.lastTurnStepKey === stepKey &&
      this.lastTurnDistance != null &&
      alongStep > this.lastTurnDistance + 20
    ) {
      distanceToNextTurn = this.lastTurnDistance;
    } else {
      this.lastTurnDistance = alongStep;
      this.lastTurnStepKey = stepKey;
    }

    // Safety check for NaN
    if (isNaN(distanceToNextTurn) || distanceToNextTurn < 0) {
      console.warn('Invalid distanceToNextTurn:', distanceToNextTurn);
      console.warn('Current location:', currentLocation);
      console.warn('End location:', currentStep.endLocation);
    }

    // Calculate remaining distance and time
    // Start with distance to end of current step
    let distanceRemaining = distanceToNextTurn;
    
    // Estimate time for current step based on average speed
    // If we know the step distance and duration, calculate proportional time
    const stepProgress = Math.max(0, 1 - (distanceToNextTurn / (currentStep.distance || 1)));
    const currentStepTimeRemaining = currentStep.duration * (1 - stepProgress);
    let timeToDestination = Math.max(0, currentStepTimeRemaining);

    // Add remaining steps in current leg
    for (let i = currentStepIndex + 1; i < currentLeg.steps.length; i++) {
      const step = currentLeg.steps[i];
      distanceRemaining += step.distance || 0;
      timeToDestination += step.duration || 0;
    }

    // Add remaining legs
    for (let i = currentLegIndex + 1; i < route.legs.length; i++) {
      const leg = route.legs[i];
      distanceRemaining += leg.distance || 0;
      timeToDestination += leg.duration || 0;
    }

    // Final safety checks
    distanceRemaining = isNaN(distanceRemaining) ? 0 : Math.max(0, distanceRemaining);
    timeToDestination = isNaN(timeToDestination) ? 0 : Math.max(0, timeToDestination);

    const remaining = Math.max(0, distanceToNextTurn);
    const upcomingHtml = upcomingStep?.instruction;
    const nextInstruction = upcomingHtml
      ? formatDirectionInstructionText(upcomingHtml)
      : 'Arrive at destination';

    return {
      isNavigating: true,
      currentRoute: route,
      currentStepIndex,
      currentLegIndex,
      distanceToNextTurn: remaining,
      timeToDestination,
      distanceRemaining,
      nextInstruction,
      currentManeuver: upcomingStep?.maneuver || currentStep.maneuver,
      lanes: upcomingStep?.lanes || currentStep.lanes,
    };
  }

  /**
   * Check if should advance to next step
   * Uses distance to NEXT step start instead of current step end for better reliability
   */
  shouldAdvanceStep(
    currentLocation: Coordinates,
    currentStep: RouteStep,
    nextStep?: RouteStep,
    threshold: number = 100 // meters (increased to 100 for better reliability)
  ): boolean {
    // If no next step, check distance to current step end (last step)
    if (!nextStep) {
      const distanceToEnd = this.calculateDistance(currentLocation, currentStep.endLocation);
      return distanceToEnd < threshold;
    }
    
    // Check distance to NEXT step start (more reliable)
    const distanceToNextStart = this.calculateDistance(currentLocation, nextStep.startLocation);
    return distanceToNextStart < threshold;
  }

  /**
   * Announce turn instruction with voice guidance
   */
  announceInstruction(
    instruction: string,
    distanceToTurn: number,
    landmark?: PlaceResult,
    currentSpeed?: number,
    speedLimit?: number,
    currentStep?: RouteStep,
    force: boolean = false
  ): void {
    if (!this.voiceConfig.enabled) return;

    // Determine if we should announce based on distance thresholds
    const shouldAnnounce = force || this.shouldAnnounceAtDistance(distanceToTurn);

    if (!shouldAnnounce) return;

    // Build announcement with optional landmark and natural language
    let announcement = '';
    
    if (distanceToTurn <= VOICE_THRESHOLDS.NOW) {
      // Immediate turn - optionally use landmark, optionally make conversational
      const useLandmark = this.voiceConfig.useLandmarks && landmark;
      const baseInstruction = useLandmark
        ? this.getInstructionWithLandmark(instruction, landmark)
        : instruction;
      announcement = this.voiceConfig.useNaturalLanguage
        ? this.makeConversational(baseInstruction, distanceToTurn)
        : `${baseInstruction} now`;
      this.hasAnnouncedCurrentStep = true;
    } else if (distanceToTurn <= VOICE_THRESHOLDS.NEAR) {
      const useLandmark = this.voiceConfig.useLandmarks && landmark;
      const baseInstruction = useLandmark
        ? this.getInstructionWithLandmark(instruction, landmark)
        : instruction;
      announcement = this.voiceConfig.useNaturalLanguage
        ? this.makeConversational(baseInstruction, distanceToTurn)
        : `In ${this.formatDistance(distanceToTurn)}, ${baseInstruction}`;
    } else if (distanceToTurn <= VOICE_THRESHOLDS.MEDIUM) {
      const useLandmark = this.voiceConfig.useLandmarks && landmark;
      const baseInstruction = useLandmark
        ? this.getInstructionWithLandmark(instruction, landmark)
        : instruction;
      announcement = this.voiceConfig.useNaturalLanguage
        ? this.makeConversational(baseInstruction, distanceToTurn)
        : `In ${this.formatDistance(distanceToTurn)}, ${baseInstruction}`;
    } else if (distanceToTurn <= VOICE_THRESHOLDS.FAR) {
      announcement = this.voiceConfig.useNaturalLanguage
        ? this.makeConversational(instruction, distanceToTurn)
        : `In ${this.formatDistance(distanceToTurn)}, ${instruction}`;
    }

    if (announcement) {
      this.speak(announcement);
      this.lastAnnouncedDistance = distanceToTurn;
    }

    // Add contextual announcements after main instruction (if enabled)
    if (this.voiceConfig.useContextAnnouncements && currentStep && distanceToTurn <= VOICE_THRESHOLDS.MEDIUM) {
      const contextAnnouncement = this.getContextualAnnouncement(currentStep);
      if (contextAnnouncement) {
        // Delay slightly so it doesn't overlap
        setTimeout(() => this.speak(contextAnnouncement), 2000);
      }
    }

    // Add speed coaching (only on long straight segments, if enabled)
    if (this.voiceConfig.useSpeedCoaching && currentSpeed && speedLimit && distanceToTurn > VOICE_THRESHOLDS.MEDIUM) {
      const speedCoach = this.getSpeedCoaching(currentSpeed, speedLimit);
      if (speedCoach) {
        // Announce after a longer delay
        setTimeout(() => this.speak(speedCoach), 5000);
      }
    }
  }

  /**
   * Check if should announce at current distance
   */
  private shouldAnnounceAtDistance(distanceToTurn: number): boolean {
    // Don't announce if we already announced this step
    if (this.hasAnnouncedCurrentStep) return false;

    // Announce at specific thresholds
    if (distanceToTurn <= VOICE_THRESHOLDS.NOW && this.lastAnnouncedDistance > VOICE_THRESHOLDS.NOW) {
      return true;
    }
    if (distanceToTurn <= VOICE_THRESHOLDS.NEAR && this.lastAnnouncedDistance > VOICE_THRESHOLDS.NEAR) {
      return true;
    }
    if (distanceToTurn <= VOICE_THRESHOLDS.MEDIUM && this.lastAnnouncedDistance > VOICE_THRESHOLDS.MEDIUM) {
      return true;
    }
    if (distanceToTurn <= VOICE_THRESHOLDS.FAR && this.lastAnnouncedDistance > VOICE_THRESHOLDS.FAR) {
      return true;
    }

    return false;
  }

  /**
   * Reset voice announcement tracking for new step
   */
  resetStepAnnouncements(): void {
    this.lastAnnouncedDistance = Infinity;
    this.hasAnnouncedCurrentStep = false;
    this.lastTurnStepKey = null;
    this.lastTurnDistance = null;
  }

  /**
   * Speak text using text-to-speech
   */
  private speak(text: string): void {
    const cleanText = formatDirectionInstructionText(text);
    
    Speech.speak(cleanText, {
      language: this.voiceConfig.language,
      pitch: this.voiceConfig.pitch,
      rate: this.voiceConfig.rate,
    });
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    Speech.stop();
  }

  /**
   * Update voice guidance configuration
   */
  async setVoiceConfig(config: Partial<VoiceGuidanceConfig>): Promise<void> {
    this.voiceConfig = { ...this.voiceConfig, ...config };
    
    // Also update the voice settings service
    try {
      await voiceSettingsService.updateConfig(config);
    } catch (error) {
      console.warn('[NavigationService] Failed to save voice settings:', error);
    }
  }

  /**
   * Find a prominent landmark near a turn point for more natural directions
   */
  async findLandmarkNearTurn(turnLocation: Coordinates): Promise<PlaceResult | null> {
    try {
      // Search for nearby landmarks within 100 meters
      const landmarks = await googlePlaces.findNearbyLandmarks(turnLocation, 100);
      
      if (landmarks.length === 0) return null;
      
      // Return the most prominent landmark (first result, already sorted by prominence)
      return landmarks[0];
    } catch (error) {
      console.error('Error finding landmark:', error);
      return null;
    }
  }

  /**
   * Generate instruction with landmark if available
   */
  getInstructionWithLandmark(
    instruction: string,
    landmark?: PlaceResult,
    distanceToTurn?: number
  ): string {
    if (!landmark) {
      return instruction;
    }

    // Extract the maneuver from the instruction (e.g., "Turn left", "Turn right")
    const maneuverMatch = instruction.match(/(turn\s+(?:left|right)|make\s+a\s+(?:left|right)|continue)/i);
    
    if (!maneuverMatch) {
      return instruction; // Can't parse maneuver, use original
    }

    const maneuver = maneuverMatch[0];
    const distanceText = distanceToTurn ? ` in ${this.formatDistance(distanceToTurn)}` : '';
    
    // Generate natural instruction with landmark
    return `${maneuver} at the ${landmark.name}${distanceText}`;
  }

  /**
   * Convert instruction to natural, conversational language
   */
  private makeConversational(instruction: string, distance?: number): string {
    // Convert "Turn left" to natural alternatives
    const conversions: Record<string, string[]> = {
      'turn left': ['take a left', 'turn left', 'go left', 'make a left'],
      'turn right': ['take a right', 'turn right', 'go right', 'make a right'],
      'continue': ['keep going', 'stay on this road', 'continue ahead', 'keep straight'],
      'slight left': ['bear left', 'veer left', 'slight left'],
      'slight right': ['bear right', 'veer right', 'slight right'],
      'sharp left': ['sharp left', 'hang a sharp left'],
      'sharp right': ['sharp right', 'hang a sharp right'],
      'u-turn': ['make a U-turn', 'turn around', 'do a U-turn'],
    };

    let natural = instruction.toLowerCase();
    
    // Replace with conversational alternatives (pick first for consistency)
    for (const [formal, alternatives] of Object.entries(conversions)) {
      if (natural.includes(formal)) {
        natural = natural.replace(formal, alternatives[0]);
      }
    }

    // Add distance context naturally
    if (distance) {
      if (distance <= VOICE_THRESHOLDS.NOW) {
        return `${natural} now`;
      } else if (distance <= VOICE_THRESHOLDS.NEAR) {
        return `Coming up, ${natural}`;
      } else if (distance <= VOICE_THRESHOLDS.MEDIUM) {
        return `In about ${this.formatDistance(distance)}, ${natural}`;
      } else {
        return `In ${this.formatDistance(distance)}, ${natural}`;
      }
    }

    return natural;
  }

  /**
   * Generate speed coaching message
   */
  private getSpeedCoaching(currentSpeed: number, speedLimit?: number): string | null {
    if (!speedLimit || currentSpeed === 0) return null;

    const speedMph = currentSpeed * 2.237; // m/s to mph
    const limitMph = speedLimit;

    // More than 10 mph over
    if (speedMph > limitMph + 10) {
      return `You're going ${Math.round(speedMph - limitMph)} over the speed limit`;
    }
    // More than 10 mph under (on highway speeds)
    else if (limitMph >= 45 && speedMph < limitMph - 10) {
      return `Speed limit is ${limitMph}, you can speed up if you'd like`;
    }

    return null;
  }

  /**
   * Get contextual announcements (school zones, construction, etc.)
   */
  private getContextualAnnouncement(step: RouteStep): string | null {
    const instruction = step.instruction.toLowerCase();

    // School zone detection
    if (instruction.includes('school') || instruction.includes('educational')) {
      return 'Entering a school zone, watch for children';
    }

    // Construction zone
    if (instruction.includes('construction') || instruction.includes('work zone')) {
      return 'Construction ahead, expect delays';
    }

    // Tunnel or bridge
    if (instruction.includes('tunnel')) {
      return 'Entering tunnel';
    }
    if (instruction.includes('bridge')) {
      return 'Crossing bridge';
    }

    return null;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(from: Coordinates, to: Coordinates): number {
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

  /**
   * Calculate bearing between two coordinates
   */
  calculateBearing(from: Coordinates, to: Coordinates): number {
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360; // Convert to degrees
  }

  /**
   * Check if user is off route using route polyline matching
   * This is how real GPS apps detect off-route situations
   */
  isOffRoute(
    currentLocation: Coordinates,
    route: Route,
    threshold: number = 75 // meters (real GPS apps use 50-100m)
  ): boolean {
    // Use route matching service for accurate off-route detection
    const { routeMatchingService } = require('./route-matching');
    return routeMatchingService.isOffRoute(currentLocation, route, threshold);
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number, unit: 'miles' | 'km' = 'miles'): string {
    if (unit === 'km') {
      if (meters < 1000) {
        return `${Math.round(meters)} m`;
      }
      return `${(meters / 1000).toFixed(1)} km`;
    } else {
      const miles = meters / 1609.34;
      if (miles < 0.1) {
        return `${Math.round(meters * 3.281)} ft`;
      }
      return `${miles.toFixed(1)} mi`;
    }
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get maneuver icon name for display
   */
  getManeuverIcon(maneuver?: string): string {
    if (!maneuver) return 'arrow-up';

    const maneuverMap: Record<string, string> = {
      'turn-left': 'arrow-turn-left',
      'turn-right': 'arrow-turn-right',
      'turn-slight-left': 'arrow-turn-slight-left',
      'turn-slight-right': 'arrow-turn-slight-right',
      'turn-sharp-left': 'arrow-turn-sharp-left',
      'turn-sharp-right': 'arrow-turn-sharp-right',
      'uturn-left': 'arrow-u-turn-left',
      'uturn-right': 'arrow-u-turn-right',
      'merge': 'arrow-merge',
      'fork-left': 'arrow-fork-left',
      'fork-right': 'arrow-fork-right',
      'ferry': 'ferry',
      'roundabout-left': 'arrow-roundabout-left',
      'roundabout-right': 'arrow-roundabout-right',
      'ramp-left': 'arrow-ramp-left',
      'ramp-right': 'arrow-ramp-right',
      'straight': 'arrow-up',
    };

    return maneuverMap[maneuver] || 'arrow-up';
  }

  /**
   * Decode Google Maps encoded polyline to array of coordinates
   * Based on Google's polyline encoding algorithm
   */
  decodePolyline(encoded: string): Coordinates[] {
    const coordinates: Coordinates[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;

      // Decode latitude
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      // Decode longitude
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return coordinates;
  }

  /**
   * Road-following path from each step's polyline. The overview string is a last-resort fallback.
   */
  getDetailedRoutePath(route: Route): Coordinates[] {
    const points: Coordinates[] = [];
    const push = (point: Coordinates) => {
      const last = points[points.length - 1];
      if (
        last &&
        last.latitude === point.latitude &&
        last.longitude === point.longitude
      ) {
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
}

// Export singleton instance
export const navigationService = new NavigationService();
export default navigationService;

