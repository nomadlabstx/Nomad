/**
 * useNavigation Hook
 * Manages GPS navigation state and logic
 */

import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaceResult } from '../services/google-places';
import navigationService, {
    Coordinates,
    NavigationState,
    Route,
    RouteOptions,
} from '../services/navigation';
import { speedCameraService, type CameraAlert } from '../services/speed-camera';
import { routeHistoryService } from '../services/route-history';
import { gpsSimulator } from '../utils/gps-simulator';
import { formatTripName } from '../utils/trip-names';

interface UseNavigationReturn {
  // State
  isNavigating: boolean;
  currentLocation: Coordinates | null;
  currentSpeed: number; // m/s
  routes: Route[];
  selectedRoute: Route | null;
  navigationState: NavigationState | null;
  isLoadingRoute: boolean;
  error: string | null;
  voiceEnabled: boolean;
  showCurrentSpeed: boolean; // Speed display mode
  cameraAlerts: CameraAlert[]; // Speed camera warnings

  // Actions
  calculateRoute: (destination: Coordinates, options?: RouteOptions, origin?: Coordinates, destinationName?: string) => Promise<void>;
  getDestinationLabel: () => string | null;
  selectRoute: (routeId: string) => void;
  startNavigation: () => void;
  stopNavigation: () => void;
  toggleVoice: () => void;
  toggleSpeedDisplay: () => void;
  clearError: () => void;
  reportCamera: () => void; // Report camera at current location
}

export function useNavigation(): UseNavigationReturn {
  // State
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0); // m/s
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showCurrentSpeed, setShowCurrentSpeed] = useState(false); // Default to Apple Maps style
  const [cameraAlerts, setCameraAlerts] = useState<CameraAlert[]>([]); // Speed camera warnings

  // Refs
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const currentStepIndex = useRef(0);
  const currentLegIndex = useRef(0);
  const currentLandmark = useRef<PlaceResult | null>(null);
  const lastLandmarkKeyRef = useRef<string | null>(null);
  const lastCameraAlertRef = useRef<string | null>(null);
  const destinationLabelRef = useRef<string | null>(null);
  const destinationRef = useRef<Coordinates | null>(null);
  const routeOptionsRef = useRef<RouteOptions>({});
  const routeRequestIdRef = useRef(0);
  const navStartIdRef = useRef(0);
  const offRouteRecalcRef = useRef(false);
  const isLoadingRouteRef = useRef(false);

  const readDeviceCoordinates = useCallback(async (): Promise<Coordinates | null> => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.warn('[Navigation] Could not read device GPS:', error);
      return null;
    }
  }, []);

  const snapBackToDevice = useCallback(async () => {
    gpsSimulator.stop();
    const device = await readDeviceCoordinates();
    if (device) {
      setCurrentLocation(device);
      setCurrentSpeed(0);
    }
  }, [readDeviceCoordinates]);

  /**
   * Initialize location tracking
   */
  useEffect(() => {
    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch (err) {
        console.error('Failed to get location:', err);
        setError('Failed to get current location');
      }
    };

    initLocation();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  /**
   * Calculate route to destination
   */
  const calculateRoute = useCallback(async (
    destination: Coordinates,
    options: RouteOptions = {},
    origin?: Coordinates,
    destinationName?: string
  ) => {
    const requestId = ++routeRequestIdRef.current;

    // Use provided origin, live sim position, or a fresh device GPS fix.
    // After a simulated arrival the last coords are still the destination;
    // never reuse those as the start of the next trip.
    let routeOrigin = origin;
    if (!routeOrigin) {
      if (gpsSimulator.isRunning()) {
        routeOrigin = gpsSimulator.getCoordinates() ?? currentLocation ?? undefined;
      } else {
        const device = await readDeviceCoordinates();
        if (requestId !== routeRequestIdRef.current) return;
        if (device) {
          setCurrentLocation(device);
          routeOrigin = device;
        } else {
          routeOrigin = currentLocation ?? undefined;
        }
      }
    }

    if (!routeOrigin) {
      if (requestId === routeRequestIdRef.current) {
        setError('Origin location not available');
      }
      return;
    }

    if (destinationName) {
      destinationLabelRef.current = destinationName;
    }
    destinationRef.current = destination;
    routeOptionsRef.current = options;

    isLoadingRouteRef.current = true;
    setIsLoadingRoute(true);
    setError(null);

    if (__DEV__) {
      console.debug('🗺️ [ROUTE] Calculating route...', {
        origin: { lat: routeOrigin.latitude.toFixed(6), lng: routeOrigin.longitude.toFixed(6) },
        destination: { lat: destination.latitude.toFixed(6), lng: destination.longitude.toFixed(6) },
      });
    }

    try {
      const calculatedRoutes = await navigationService.calculateRoute(
        routeOrigin,
        destination,
        options
      );

      if (requestId !== routeRequestIdRef.current) return;

      if (__DEV__) {
        console.debug('✅ [ROUTE] Routes calculated:', {
          count: calculatedRoutes.length,
          firstRoute: calculatedRoutes[0] ? {
            legs: calculatedRoutes[0].legs.length,
            steps: calculatedRoutes[0].legs[0]?.steps.length,
            firstStep: calculatedRoutes[0].legs[0]?.steps[0]?.instruction.substring(0, 50),
            secondStep: calculatedRoutes[0].legs[0]?.steps[1]?.instruction.substring(0, 50),
            thirdStep: calculatedRoutes[0].legs[0]?.steps[2]?.instruction.substring(0, 50),
            totalDistance: (calculatedRoutes[0].totalDistance / 1609.34).toFixed(2) + ' mi',
            totalDuration: (calculatedRoutes[0].totalDuration / 60).toFixed(0) + ' min',
          } : null,
        });
      }

      setRoutes(calculatedRoutes);

      if (calculatedRoutes.length > 0) {
        const firstRoute = calculatedRoutes[0];
        setSelectedRoute(firstRoute);
        currentStepIndex.current = 0;
        currentLegIndex.current = 0;
        currentLandmark.current = null;
        lastLandmarkKeyRef.current = null;
        navigationService.resetStepAnnouncements();

        if (!destinationLabelRef.current) {
          destinationLabelRef.current =
            firstRoute.legs[firstRoute.legs.length - 1]?.endAddress ?? null;
        }

        try {
          await routeHistoryService.saveRoute(
            routeOrigin,
            destination,
            firstRoute,
            options.waypoints,
            formatTripName(
              destinationLabelRef.current || firstRoute.legs[firstRoute.legs.length - 1]?.endAddress
            )
          );
        } catch (error) {
          console.warn('[Navigation] Failed to save route to history:', error);
        }
      }
    } catch (err) {
      if (requestId !== routeRequestIdRef.current) return;
      console.error('❌ [ROUTE] Failed to calculate route:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate route');
    } finally {
      if (requestId === routeRequestIdRef.current) {
        isLoadingRouteRef.current = false;
        setIsLoadingRoute(false);
      }
    }
  }, [currentLocation, readDeviceCoordinates]);

  /**
   * Select a specific route
   */
  const selectRoute = useCallback((routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (route) {
      setSelectedRoute(route);
      currentStepIndex.current = 0;
      currentLegIndex.current = 0;
      currentLandmark.current = null;
      lastLandmarkKeyRef.current = null;
      navigationService.resetStepAnnouncements();
    }
  }, [routes]);

  /**
   * Handle arrival at destination
   */
  const handleArrival = useCallback(() => {
    if (voiceEnabled) {
      navigationService.announceInstruction('You have arrived at your destination', 0);
    }

    // Stop navigation and clear ALL navigation state
    setIsNavigating(false);
    setNavigationState(null);
    setSelectedRoute(null); // Clear route (fixes lingering polyline)
    setRoutes([]); // Clear route options
    currentStepIndex.current = 0;
    currentLegIndex.current = 0;
    currentLandmark.current = null;
    lastLandmarkKeyRef.current = null;
    lastCameraAlertRef.current = null;
    navStartIdRef.current += 1;

    // Stop location updates
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    void snapBackToDevice();
  }, [voiceEnabled, snapBackToDevice]);

  /**
   * Handle off-route situation
   */
  const handleOffRoute = useCallback((location: Coordinates) => {
    if (offRouteRecalcRef.current || isLoadingRouteRef.current || !selectedRoute) {
      return;
    }

    if (__DEV__) {
      console.debug('User is off route, recalculating...');
    }

    if (voiceEnabled) {
      navigationService.announceInstruction('Recalculating route', 0);
    }

    const remainingWaypoints = selectedRoute.legs
      .slice(currentLegIndex.current, selectedRoute.legs.length - 1)
      .map((leg) => leg.endLocation)
      .filter((coord) =>
        Number.isFinite(coord.latitude) &&
        Number.isFinite(coord.longitude) &&
        !(coord.latitude === 0 && coord.longitude === 0)
      );
    const destination =
      destinationRef.current ?? selectedRoute.legs[selectedRoute.legs.length - 1]?.endLocation;
    if (!destination) {
      return;
    }

    const previousOptions = routeOptionsRef.current;
    currentStepIndex.current = 0;
    currentLegIndex.current = 0;
    currentLandmark.current = null;
    lastLandmarkKeyRef.current = null;
    navigationService.resetStepAnnouncements();

    offRouteRecalcRef.current = true;
    void calculateRoute(
      destination,
      {
        avoidTolls: previousOptions.avoidTolls,
        avoidHighways: previousOptions.avoidHighways,
        avoidFerries: previousOptions.avoidFerries,
        waypoints: remainingWaypoints,
      },
      location
    ).finally(() => {
      offRouteRecalcRef.current = false;
    });
  }, [selectedRoute, voiceEnabled, calculateRoute]);

  /**
   * Update navigation state based on current location
   * Uses real GPS app logic: map matching and route progress tracking
   */
  const updateNavigation = useCallback((location: Coordinates, speedMps: number = 0) => {
    if (__DEV__) {
      console.debug('🔄 [NAV] updateNavigation called', {
        lat: location.latitude.toFixed(6),
        lng: location.longitude.toFixed(6),
        hasRoute: !!selectedRoute,
      });
    }

    if (!selectedRoute) {
      if (__DEV__) {
        console.warn('⚠️ [NAV] No selectedRoute!');
      }
      return;
    }

    // Import route matching service dynamically to avoid import issues
    const { routeMatchingService } = require('../services/route-matching');
    const routeProgress = routeMatchingService.trackRouteProgress(
      location,
      selectedRoute,
      currentStepIndex.current,
      currentLegIndex.current
    );
    
    if (__DEV__) {
      console.debug('📍 [NAV] Route progress:', {
        currentStepIndex: routeProgress.currentStepIndex,
        stepProgress: routeProgress.stepProgress.toFixed(1) + '%',
        totalRouteProgress: routeProgress.totalRouteProgress.toFixed(1) + '%',
        distanceFromRoute: routeProgress.distanceFromRoute.toFixed(1) + 'm',
        isOnRoute: routeProgress.isOnRoute,
      });
    }

    // Check if user is off route (like real GPS apps)
    if (!routeProgress.isOnRoute) {
      if (gpsSimulator.isRunning()) {
        if (__DEV__) {
          console.debug('🧪 [NAV] Simulator off-route match ignored', {
            distance: routeProgress.distanceFromRoute.toFixed(1) + 'm',
          });
        }
      } else {
        if (__DEV__) {
          console.debug('🚫 [NAV] User is off route! Distance:', routeProgress.distanceFromRoute.toFixed(1) + 'm');
        }
        handleOffRoute(location);
        return;
      }
    }

    // Catch up one finished step at a time (fast sim can pass a short step in one tick).
    // Never snap to a later highway just because it runs nearby.
    for (let i = 0; i < 8; i++) {
      const snappedIndex = routeMatchingService.resolveActiveStepIndex(
        location,
        selectedRoute,
        currentStepIndex.current,
        currentLegIndex.current
      );
      if (snappedIndex <= currentStepIndex.current) {
        break;
      }
      if (__DEV__) {
        console.debug('⏭️ [NAV] Caught up one step', {
          from: currentStepIndex.current,
          to: snappedIndex,
        });
      }
      currentStepIndex.current = snappedIndex;
      navigationService.resetStepAnnouncements();
    }

    const currentLeg = selectedRoute.legs[currentLegIndex.current];
    if (!currentLeg) {
      console.error('❌ [NAV] No currentLeg!', { currentLegIndex: currentLegIndex.current, totalLegs: selectedRoute.legs.length });
      return;
    }
    
    const currentStep = currentLeg.steps[currentStepIndex.current];
    if (!currentStep) {
      console.error('❌ [NAV] No currentStep!', { currentStepIndex: currentStepIndex.current, totalSteps: currentLeg.steps.length });
      return;
    }

    // EXPLICIT ARRIVAL CHECK: Check if we're within 50m of final destination
    const finalLeg = selectedRoute.legs[selectedRoute.legs.length - 1];
    const finalDestination = finalLeg.endLocation;
    const distanceToDestination = navigationService.calculateDistance(location, finalDestination);
    
    if (__DEV__) {
      console.debug('🎯 [NAV] Distance to destination:', {
        distance: distanceToDestination.toFixed(1) + 'm',
        threshold: '50m',
        shouldArrive: distanceToDestination < 50,
        destLat: finalDestination.latitude.toFixed(6),
        destLng: finalDestination.longitude.toFixed(6),
      });
    }
    
    if (distanceToDestination < 50) { // 50 meters = ~164 feet
      if (__DEV__) {
        console.debug('✅ [NAV] ARRIVED! Triggering handleArrival()');
      }
      handleArrival();
      return;
    }

    // Check if we should advance to next step based on route progress
    const nextStep = currentStepIndex.current + 1 < currentLeg.steps.length 
      ? currentLeg.steps[currentStepIndex.current + 1] 
      : undefined;
    
    let shouldAdvance = routeMatchingService.shouldAdvanceStep(
      routeProgress,
      location,
      currentStep,
      nextStep
    );

    // Don't advance while stationary unless already at the turn point
    const effectiveSpeed = speedMps >= 0 ? speedMps : 0;
    if (shouldAdvance && effectiveSpeed < 0.5) {
      const remainingAlongStep = routeMatchingService.remainingDistanceAlongStep(
        location,
        currentStep
      );
      if (remainingAlongStep > 40) {
        shouldAdvance = false;
        if (__DEV__) {
          console.debug('⏸️ [NAV] Blocked step advance — stationary and not at turn');
        }
      }
    }
    
    if (__DEV__) {
      console.debug('👣 [NAV] Step advancement check:', {
        stepProgress: routeProgress.stepProgress.toFixed(1) + '%',
        distanceToStepEnd:
          navigationService.calculateDistance(location, currentStep.endLocation).toFixed(0) + 'm',
        speed: effectiveSpeed.toFixed(1) + ' m/s',
        shouldAdvance,
        hasNextStep: !!nextStep,
        instruction: currentStep.instruction.substring(0, 50) + '...',
      });
    }

    if (shouldAdvance) {
      if (currentStepIndex.current + 1 < currentLeg.steps.length) {
        if (__DEV__) {
          console.debug('⏭️ [NAV] ADVANCING to next step based on progress!');
        }
        currentStepIndex.current += 1;
      } else if (currentLegIndex.current + 1 < selectedRoute.legs.length) {
        if (__DEV__) {
          console.debug('🔄 [NAV] Completed leg, advancing to next leg');
        }
        currentLegIndex.current += 1;
        currentStepIndex.current = 0;
      } else {
        if (__DEV__) {
          console.debug('✅ [NAV] Completed all legs! Triggering handleArrival()');
        }
        handleArrival();
        return;
      }

      currentLandmark.current = null;
      lastLandmarkKeyRef.current = null;
      navigationService.resetStepAnnouncements();
    }

    // Get updated navigation state
    const navState = navigationService.getNavigationUpdate(
      location,
      selectedRoute,
      currentLegIndex.current,
      currentStepIndex.current
    );

    setNavigationState(navState);

    const landmarkKey = `${currentLegIndex.current}:${currentStepIndex.current}`;
    if (lastLandmarkKeyRef.current !== landmarkKey && navState.nextInstruction) {
      lastLandmarkKeyRef.current = landmarkKey;
      currentLandmark.current = null;
      const stepEnd = currentStep.endLocation;
      navigationService.findLandmarkNearTurn(stepEnd)
        .then((landmark) => {
          if (lastLandmarkKeyRef.current === landmarkKey) {
            currentLandmark.current = landmark;
          }
        })
        .catch((error) => {
          console.error('Error fetching landmark:', error);
        });
    }

    // Announce instruction if needed (with natural language enhancements)
    if (voiceEnabled && navState.nextInstruction) {
      navigationService.announceInstruction(
        navState.nextInstruction,
        navState.distanceToNextTurn,
        currentLandmark.current || undefined,
        currentSpeed, // Current speed for coaching
        undefined, // Speed limit (would come from speed limit service)
        currentStep, // Current step for contextual announcements
        false
      );
    }

    // Off-route detection is now handled by route matching service above
    // No need for additional check here since routeProgress.isOnRoute already handles it
  }, [selectedRoute, voiceEnabled, handleArrival, handleOffRoute]);

  const applyLocationUpdate = useCallback((location: Location.LocationObject) => {
    if (__DEV__) {
      console.debug('📡 [GPS] Location update received', {
        lat: location.coords.latitude.toFixed(6),
        lng: location.coords.longitude.toFixed(6),
        accuracy: location.coords.accuracy?.toFixed(1) + 'm',
        speed: (location.coords.speed || 0).toFixed(1) + ' m/s',
        simulated: Boolean(location.mocked) || gpsSimulator.isRunning(),
      });
    }

    const newLocation: Coordinates = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    setCurrentLocation(newLocation);
    const speedMps =
      location.coords.speed != null && location.coords.speed >= 0
        ? location.coords.speed
        : 0;
    setCurrentSpeed(speedMps);

    const speedMph = speedMps * 2.23694;
    const heading = location.coords.heading || 0;
    const alerts = speedCameraService.checkForCameras(
      newLocation,
      speedMph,
      heading
    );

    const activeAlerts = alerts.filter(a => a.shouldAlert);
    setCameraAlerts(activeAlerts);

    if (voiceEnabled && activeAlerts.length > 0) {
      const urgentAlert = activeAlerts.find(a => a.alertLevel === 'very_near' || a.alertLevel === 'near');
      if (urgentAlert && lastCameraAlertRef.current !== urgentAlert.camera.id) {
        const alertMessage = speedCameraService.getAlertMessage(urgentAlert);
        navigationService.announceInstruction(alertMessage, 0);
        lastCameraAlertRef.current = urgentAlert.camera.id;
      }
    }

    updateNavigation(newLocation, speedMps);
  }, [voiceEnabled, updateNavigation]);

  const getDestinationLabel = useCallback(() => destinationLabelRef.current, []);

  /**
   * Start navigation
   */
  const startNavigation = useCallback(async () => {
    const simulatedOrigin = gpsSimulator.isRunning() ? gpsSimulator.getCoordinates() : null;
    const origin = simulatedOrigin ?? currentLocation;

    if (!selectedRoute || !origin) {
      setError('No route selected or location unavailable');
      return;
    }

    const startId = ++navStartIdRef.current;

    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    if (simulatedOrigin) {
      setCurrentLocation(simulatedOrigin);
    }

    setIsNavigating(true);
    setError(null);
    currentStepIndex.current = 0;
    currentLegIndex.current = 0;
    currentLandmark.current = null;
    lastLandmarkKeyRef.current = null;
    lastCameraAlertRef.current = null;

    navigationService.resetStepAnnouncements();

    // Set initial navigation state immediately (prevents NaN display)
    const initialNavState = navigationService.getNavigationUpdate(
      origin,
      selectedRoute,
      0,
      0
    );
    setNavigationState(initialNavState);

    // Announce navigation start
    if (__DEV__) {
      console.debug('🚀 [NAV] Starting navigation...', {
        destination: selectedRoute.legs[0].endAddress,
        totalSteps: selectedRoute.legs[0].steps.length,
        simulated: gpsSimulator.isRunning(),
      });
    }

    if (voiceEnabled) {
      navigationService.announceInstruction(
        `Starting navigation to ${selectedRoute.legs[0].endAddress}`,
        0,
        undefined
      );
    }

    try {
      if (__DEV__) {
        console.debug('📡 [GPS] Starting location updates...');
      }

      const simSub = gpsSimulator.subscribe(applyLocationUpdate);
      let realSub: Location.LocationSubscription | null = null;

      try {
        realSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 10,
          },
          (location) => {
            if (gpsSimulator.isRunning()) return;
            applyLocationUpdate(location);
          }
        );
      } catch (watchError) {
        if (!gpsSimulator.isRunning()) {
          simSub.remove();
          throw watchError;
        }
        if (__DEV__) {
          console.warn('[NAV] Real GPS unavailable; using simulator', watchError);
        }
      }

      if (navStartIdRef.current !== startId) {
        simSub.remove();
        realSub?.remove();
        return;
      }

      locationSubscription.current = {
        remove: () => {
          simSub.remove();
          realSub?.remove();
        },
      };

      if (__DEV__) {
        console.debug('✅ [GPS] Location updates started successfully');
      }
    } catch (err) {
      console.error('❌ [NAV] Failed to start navigation:', err);
      gpsSimulator.stop();
      setError('Failed to start location tracking');
      setIsNavigating(false);
    }
  }, [selectedRoute, currentLocation, voiceEnabled, applyLocationUpdate]);

  /**
   * Stop navigation
   */
  const stopNavigation = useCallback(() => {
    navStartIdRef.current += 1;
    routeRequestIdRef.current += 1;
    offRouteRecalcRef.current = false;
    setIsNavigating(false);
    setNavigationState(null);
    setSelectedRoute(null); // Clear route (fixes lingering polyline)
    setRoutes([]); // Clear route options
    currentStepIndex.current = 0;
    currentLegIndex.current = 0;
    currentLandmark.current = null;
    lastLandmarkKeyRef.current = null;
    lastCameraAlertRef.current = null;

    // Stop location updates
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    gpsSimulator.stop();

    // Stop any ongoing speech
    navigationService.stopSpeaking();

    void snapBackToDevice();
  }, [snapBackToDevice]);

  /**
   * Toggle voice guidance
   */
  const toggleVoice = useCallback(() => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    navigationService.setVoiceConfig({ enabled: newValue });
  }, [voiceEnabled]);

  /**
   * Toggle speed display mode (Apple Maps vs Waze style)
   */
  const toggleSpeedDisplay = useCallback(() => {
    setShowCurrentSpeed(prev => !prev);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      gpsSimulator.stop();
      navigationService.stopSpeaking();
    };
  }, []);

  /**
   * Report camera at current location
   */
  const reportCamera = useCallback(() => {
    if (!currentLocation) return;
    
    // Default to speed camera on current road
    speedCameraService.reportCamera(
      currentLocation,
      'speed',
      65, // Default speed limit
      'Current Location'
    );
    
    // In production, would open a UI to specify camera type and details
    if (__DEV__) {
      console.debug('📷 Camera reported at current location');
    }
  }, [currentLocation]);

  return {
    // State
    isNavigating,
    currentLocation,
    currentSpeed,
    routes,
    selectedRoute,
    navigationState,
    isLoadingRoute,
    error,
    voiceEnabled,
    showCurrentSpeed,
    cameraAlerts,

    // Actions
    calculateRoute,
    getDestinationLabel,
    selectRoute,
    startNavigation,
    stopNavigation,
    toggleVoice,
    toggleSpeedDisplay,
    clearError,
    reportCamera,
  };
}

export default useNavigation;

