/**
 * Recorder Tab - Dual Mode GPS Navigation
 * Supports both active navigation and passive trip recording
 */

import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { AITripPlanner, type ParsedTripPlan } from '../../components/ai-trip-planner';
import { DestinationParkingPreview } from '../../components/destination-parking-preview';
import DestinationSearch from '../../components/destination-search';
import MaybeMapView, {
    PROVIDER_GOOGLE as MAYBE_PROVIDER_GOOGLE,
    PROVIDER_DEFAULT as MAYBE_PROVIDER_DEFAULT,
    Marker as MaybeMarker,
    Polyline as MaybePolyline,
} from '../../components/maybe-map';
import { Platform } from 'react-native';
import { MultiStopPlanner } from '../../components/multi-stop-planner';
import NavigationUI from '../../components/navigation-ui';
import { ParkingSuggestions } from '../../components/parking-suggestions';
import RPGNavigationOverlay from '../../components/rpg-navigation-overlay';
import RecorderHUD from '../../components/recorder-hud';
import RouteSelector from '../../components/route-selector';
import { RouteHistory } from '../../components/route-history';
import { OfflineIndicator } from '../../components/offline-indicator';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAchievements } from '../../hooks/use-achievements';
import { useNavigation } from '../../hooks/use-navigation';
import { useTripTracking } from '../../hooks/use-trip-tracking';
import { Coordinates, navigationService } from '../../services/navigation';
import { reverseGeocodingService } from '../../services/reverse-geocoding';
import { userPreferencesService } from '../../services/user-preferences';
import type { RPGOverlaySettings } from '../../types/user-preferences';

type RecorderMode = 'passive' | 'navigate';

const RecorderTab = memo(() => {
  // State
  const [mode, setMode] = useState<RecorderMode>('passive');
  const [unit, setUnit] = useState<'miles' | 'km'>('miles');
  const [showDestinationSearch, setShowDestinationSearch] = useState(false);
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [showAIPlanner, setShowAIPlanner] = useState(false);
  const [showMultiStopPlanner, setShowMultiStopPlanner] = useState(false);
  const [destinationMarker, setDestinationMarker] = useState<Coordinates | null>(null);
  const [currentCity, setCurrentCity] = useState<string>('Unknown');
  const [currentState, setCurrentState] = useState<string>('Unknown');
  const [destinationName, setDestinationName] = useState<string>('');
  const [showParkingSuggestions, setShowParkingSuggestions] = useState(false);
  const [rpgSettings, setRpgSettings] = useState<RPGOverlaySettings | null>(null);

  // Refs
  const navigationMapRef = useRef<any>(null);
  const tripStartTimeRef = useRef<number | null>(null);
  const autoRecordingRef = useRef(false);

  // Hooks
  const colorScheme = useColorScheme();
  const passiveTracking = useTripTracking();
  const navigation = useNavigation();
  const achievements = useAchievements();
  
  // Get tint color from theme
  const tint = Colors[colorScheme ?? 'light'].tint;

  // Get route params for navigation from planned trips
  const params = useLocalSearchParams();

  // Load RPG overlay settings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await userPreferencesService.getRPGOverlaySettings();
      setRpgSettings(settings);
    };
    loadSettings();
  }, []);

  // Handle navigation from planned trips
  useFocusEffect(
    useCallback(() => {
      // Check if we arrived from a planned trip
      if (params.fromPlannedTrip === 'true' && params.destinationLat && params.destinationLng) {
        const destination: Coordinates = {
          latitude: parseFloat(params.destinationLat as string),
          longitude: parseFloat(params.destinationLng as string),
        };
        const destinationName = (params.destinationName as string) || 'Destination';

        // Set destination marker and name - this must happen first
        setDestinationMarker(destination);
        setDestinationName(destinationName);

        // Show route selector if routes are already available
        if (navigation.routes.length > 0) {
          setShowRouteSelector(true);
        }
        // Note: If routes aren't available yet, the useEffect below will handle showing
        // the route selector when routes become available
      }
    }, [params.fromPlannedTrip, params.destinationLat, params.destinationLng, params.destinationName, navigation.routes.length])
  );

  // Auto-show route selector when routes become available after planned trip navigation
  // This effect handles the case where routes become available after the component has already focused
  // It also handles the case where routes are calculated asynchronously after navigation
  useEffect(() => {
    if (params.fromPlannedTrip === 'true' && navigation.routes.length > 0 && destinationMarker) {
      setShowRouteSelector(true);
    }
  }, [navigation.routes.length, params.fromPlannedTrip, destinationMarker]);

  // Track trip start time for navigation mode
  useEffect(() => {
    if (navigation.isNavigating && !tripStartTimeRef.current) {
      tripStartTimeRef.current = Date.now();
    } else if (!navigation.isNavigating && tripStartTimeRef.current) {
      tripStartTimeRef.current = null;
    }
  }, [navigation.isNavigating]);

  /**
   * Auto-record trips when navigation is active
   */
  useEffect(() => {
    if (navigation.isNavigating) {
      if (!passiveTracking.tracking) {
        passiveTracking.start();
        autoRecordingRef.current = true;
      }
      return;
    }

    if (autoRecordingRef.current) {
      passiveTracking.stop();
      autoRecordingRef.current = false;
    }
  }, [navigation.isNavigating, passiveTracking.tracking, passiveTracking.start, passiveTracking.stop]);

  // Check achievements periodically during navigation
  useEffect(() => {
    if (!navigation.isNavigating) return;
    
    const interval = setInterval(() => {
      achievements.checkAchievements();
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [navigation.isNavigating, achievements]);

  // Track navigation completion when navigation stops
  const previousNavigatingRef = useRef(false);
  useEffect(() => {
    // If navigation was active and now stopped, track completion
    if (previousNavigatingRef.current && !navigation.isNavigating) {
      achievements.recordNavigationComplete();
    }
    previousNavigatingRef.current = navigation.isNavigating;
  }, [navigation.isNavigating, achievements]);

  /**
   * Get current location for map center
   */
  const currentLocation = mode === 'passive' 
    ? passiveTracking.loc 
    : navigation.currentLocation;

  /**
   * Update current city and state from location
   */
  const updateCurrentLocationInfo = useCallback(async (location: { latitude: number; longitude: number } | null) => {
    if (!location) return;
    
    try {
      const locationInfo = await reverseGeocodingService.getLocationInfo(location);
      setCurrentCity(locationInfo.city);
      setCurrentState(locationInfo.stateCode);
    } catch (error) {
      console.warn('[Recorder] Failed to get location info:', error);
    }
  }, []);

  /**
   * Update location info when current location changes
   */
  useEffect(() => {
    updateCurrentLocationInfo(currentLocation);
  }, [currentLocation, updateCurrentLocationInfo]);

  /**
   * Keep map following the user location
   */
  useEffect(() => {
    if (!currentLocation) return;
    const mapRef = mode === 'passive' ? passiveTracking.mapRef : navigationMapRef;

    if (mapRef?.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, [currentLocation, mode, passiveTracking.mapRef]);

  /**
   * Recenter map on user location
   */
  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const mapRef = mode === 'passive' ? passiveTracking.mapRef : navigationMapRef;
    
    if (mapRef?.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, [mode, passiveTracking.mapRef, currentLocation]);

  /**
   * Handle mode switch
   */
  const handleModeSwitch = useCallback((newMode: RecorderMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Warn if switching modes while tracking
    if (passiveTracking.tracking || navigation.isNavigating) {
      Alert.alert(
        'Switch Mode?',
        'This will stop your current activity. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              if (passiveTracking.tracking) passiveTracking.stop();
              if (navigation.isNavigating) navigation.stopNavigation();
              setMode(newMode);
            },
          },
        ]
      );
    } else {
      setMode(newMode);
    }
  }, [passiveTracking, navigation]);

  /**
   * Handle destination selection
   */
  const handleSelectDestination = useCallback(async (
    coordinates: Coordinates,
    description: string
  ) => {
    setShowDestinationSearch(false);
    setDestinationMarker(coordinates);
    setDestinationName(description);

    // Calculate route
    await navigation.calculateRoute(coordinates);
    setShowRouteSelector(true);
  }, [navigation]);

  /**
   * Handle parking selection
   */
  const handleSelectParking = useCallback((parking: any) => {
    // Navigate to selected parking location
    if (parking.coordinates) {
      setDestinationMarker(parking.coordinates);
      setDestinationName(parking.name);
      navigation.calculateRoute(parking.coordinates);
    }
  }, [navigation]);

  /**
   * Handle view parking suggestions
   */
  const handleViewParking = useCallback(() => {
    setShowParkingSuggestions(true);
  }, []);

  /**
   * Handle start navigation
   */
  const handleStartNavigation = useCallback(() => {
    setShowRouteSelector(false);
    
    // Start passive trip recording in the background during navigation
    if (!passiveTracking.tracking) {
      passiveTracking.start();
    }
    
    navigation.startNavigation();
  }, [navigation, passiveTracking]);

  /**
   * Handle stop navigation
   */
  const handleStopNavigation = useCallback(() => {
    navigation.stopNavigation();
    setDestinationMarker(null);
    setMode('passive'); // Reset to passive mode (fixes UI state)
    // Navigation completion is tracked in the useEffect above
  }, [navigation]);

  /**
   * Handle AI trip plan generated
   */
  const handleAITripPlanGenerated = useCallback(
    async (plan: ParsedTripPlan) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Track AI trip planning achievement
      achievements.recordAITripPlanned();
      
      // Calculate route with waypoints from AI plan
      await navigation.calculateRoute(plan.finalDestination.location, {
        waypoints: plan.stops.map(stop => stop.location),
        ...plan.routeOptions,
      });

      setDestinationMarker(plan.finalDestination.location);
      setShowRouteSelector(true);
    },
    [navigation, achievements]
  );

  /**
   * Handle multi-stop route planning
   */
  const handleMultiStopRoute = useCallback(
    async (destination: Coordinates, options: any) => {
      setShowMultiStopPlanner(false);
      await navigation.calculateRoute(destination, options);
      setDestinationMarker(destination);
      setShowRouteSelector(true);
    },
    [navigation]
  );

  /**
   * Memoize initial region with closer zoom
   */
  const initialRegion = useMemo(() => ({
    latitude: currentLocation?.latitude ?? 31.5493,
    longitude: currentLocation?.longitude ?? -97.1467,
    latitudeDelta: 0.01, // Closer zoom (was 0.08)
    longitudeDelta: 0.01, // Closer zoom (was 0.08)
  }), [currentLocation?.latitude, currentLocation?.longitude]);

  /**
   * Memoize polyline coordinates (for passive mode)
   */
  const passivePolyline = useMemo(() => {
    if (mode !== 'passive' || passiveTracking.path.length <= 1) return [];
    
    let points = passiveTracking.path;
    if (points.length > 500) {
      points = points.filter((_, index) => index % 3 === 0 || index === points.length - 1);
    } else if (points.length > 200) {
      points = points.filter((_, index) => index % 2 === 0 || index === points.length - 1);
    }
    
    return points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  }, [mode, passiveTracking.path]);

  /**
   * Memoize navigation polyline (for navigate mode)
   */
  const navigationPolyline = useMemo(() => {
    if (mode !== 'navigate' || !navigation.selectedRoute) return [];
    
    try {
      // Decode overview polyline from Google Directions
      const decoded = navigationService.decodePolyline(navigation.selectedRoute.overviewPolyline);
      
      // Simplify if too many points (performance optimization)
      if (decoded.length > 500) {
        return decoded.filter((_, index) => index % 3 === 0 || index === decoded.length - 1);
      }
      
      return decoded;
    } catch (error) {
      console.error('Failed to decode route polyline:', error);
      return [];
    }
  }, [mode, navigation.selectedRoute]);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MaybeMapView
        ref={mode === 'passive' ? passiveTracking.mapRef : navigationMapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'ios' ? MAYBE_PROVIDER_DEFAULT : MAYBE_PROVIDER_GOOGLE}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton={false}
        initialRegion={initialRegion}
        mapType="standard"
        pitchEnabled={false}
        rotateEnabled={false}
        loadingEnabled
        loadingIndicatorColor="#888"
        moveOnMarkerPress={false}
        // Performance optimizations
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsIndoors={false}
        showsBuildings={false}
        showsPointsOfInterest={false}
        cacheEnabled={Platform.OS === 'android'}
        loadingBackgroundColor="#f5f5f5"
      >
        {/* Passive mode polyline */}
        {mode === 'passive' && passivePolyline.length > 0 && (
          <MaybePolyline
            coordinates={passivePolyline}
            strokeWidth={4}
            strokeColor="#007AFF"
          />
        )}

        {/* Navigation mode polyline */}
        {mode === 'navigate' && navigationPolyline.length > 0 && (
          <MaybePolyline
            coordinates={navigationPolyline}
            strokeWidth={6}
            strokeColor={tint}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Destination marker */}
        {destinationMarker && (
          <MaybeMarker
            coordinate={destinationMarker}
            title="Destination"
            pinColor="red"
          />
        )}
      </MaybeMapView>

      {/* Mode Switcher - Only show when not tracking/navigating */}
      {!passiveTracking.tracking && !navigation.isNavigating && (
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'passive' && styles.modeButtonActive]}
            onPress={() => handleModeSwitch('passive')}
          >
            <Text style={[styles.modeButtonText, mode === 'passive' && styles.modeButtonTextActive]}>
              🎥 Record
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'navigate' && styles.modeButtonActive]}
            onPress={() => handleModeSwitch('navigate')}
          >
            <Text style={[styles.modeButtonText, mode === 'navigate' && styles.modeButtonTextActive]}>
              🧭 Navigate
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Passive Mode UI */}
      {mode === 'passive' && (
        <RecorderHUD
          meters={passiveTracking.meters}
          elapsedMs={passiveTracking.elapsedMs}
          tracking={passiveTracking.tracking}
          paused={passiveTracking.paused}
          start={passiveTracking.start}
          stop={passiveTracking.stop}
          pause={passiveTracking.pause}
          resume={passiveTracking.resume}
          unit={unit}
          setUnit={setUnit}
        />
      )}

      {/* Navigate Mode UI */}
      {mode === 'navigate' && (
        <>
          {/* Show "Where to?" button when not navigating */}
          {!navigation.isNavigating && !showRouteSelector && (
            <View style={styles.navigationControls}>
              <TouchableOpacity
                style={styles.whereToButton}
                onPress={() => setShowDestinationSearch(true)}
              >
                <Text style={styles.whereToText}>📍 Search Destination</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.planButton, { backgroundColor: tint }]}
                onPress={() => setShowAIPlanner(true)}
              >
                <Text style={styles.planButtonText}>🧠 Plan Trip with AI</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.multiStopButton}
                onPress={() => setShowMultiStopPlanner(true)}
              >
                <Text style={styles.multiStopButtonText}>🗺️ Multi-Stop Route</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => setShowRouteHistory(true)}
              >
                <Text style={styles.historyButtonText}>📚 Route History</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Show navigation UI when navigating */}
          {navigation.isNavigating && navigation.navigationState && navigation.currentLocation && (
            <>
              <NavigationUI
                nextInstruction={navigation.navigationState.nextInstruction}
                distanceToTurn={navigation.navigationState.distanceToNextTurn}
                timeToDestination={navigation.navigationState.timeToDestination}
                distanceRemaining={navigation.navigationState.distanceRemaining}
                currentManeuver={navigation.navigationState.currentManeuver}
                lanes={navigation.navigationState.lanes}
                voiceEnabled={navigation.voiceEnabled}
                showCurrentSpeed={navigation.showCurrentSpeed}
                onToggleVoice={navigation.toggleVoice}
                onToggleSpeedDisplay={navigation.toggleSpeedDisplay}
                onStopNavigation={handleStopNavigation}
                unit={unit}
                currentLocation={navigation.currentLocation}
                currentSpeed={navigation.currentSpeed}
                route={navigation.selectedRoute || undefined}
                currentLegIndex={navigation.navigationState.currentLegIndex}
                currentStepIndex={navigation.navigationState.currentStepIndex}
                cameraAlerts={navigation.cameraAlerts}
              />
              
              {/* RPG Overlay */}
              {rpgSettings && (
                <RPGNavigationOverlay
                  currentCity={currentCity}
                  currentState={currentState}
                  currentLocation={navigation.currentLocation}
                  distanceTraveled={navigation.selectedRoute && navigation.navigationState.distanceRemaining > 0
                    ? navigation.selectedRoute.totalDistance - navigation.navigationState.distanceRemaining
                    : 0}
                  timeElapsed={tripStartTimeRef.current ? Math.floor((Date.now() - tripStartTimeRef.current) / 1000) : 0}
                  routeProgress={navigation.selectedRoute && navigation.navigationState.distanceRemaining > 0
                    ? ((navigation.selectedRoute.totalDistance - navigation.navigationState.distanceRemaining) / navigation.selectedRoute.totalDistance) * 100
                    : undefined}
                  newlyUnlockedAchievements={achievements.newlyUnlocked}
                  onClearAchievements={achievements.clearNewlyUnlocked}
                  settings={rpgSettings}
                  unit={unit}
                  currentSpeed={navigation.currentSpeed}
                />
              )}
            </>
          )}

          {/* Route Selector */}
          {showRouteSelector && !navigation.isNavigating && (
            <RouteSelector
              routes={navigation.routes}
              selectedRouteId={navigation.selectedRoute?.id || null}
              onSelectRoute={navigation.selectRoute}
              onStartNavigation={handleStartNavigation}
              unit={unit}
            />
          )}

          {/* Parking Preview */}
          {showRouteSelector && destinationMarker && destinationName && !navigation.isNavigating && (
            <DestinationParkingPreview
              destination={destinationMarker}
              destinationName={destinationName}
              onViewParking={handleViewParking}
              tintColor={tint}
            />
          )}

          {/* Error Display */}
          {navigation.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{navigation.error}</Text>
              <TouchableOpacity onPress={navigation.clearError}>
                <Text style={styles.errorDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Recenter Button */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={handleRecenter}
      >
        <Text style={styles.recenterIcon}>🎯</Text>
      </TouchableOpacity>

      {/* Destination Search Modal */}
      <Modal
        visible={showDestinationSearch}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <DestinationSearch
          currentLocation={navigation.currentLocation}
          onSelectDestination={handleSelectDestination}
          onClose={() => setShowDestinationSearch(false)}
        />
      </Modal>

      {/* AI Trip Planner Modal */}
      <AITripPlanner
        visible={showAIPlanner}
        onClose={() => setShowAIPlanner(false)}
        currentLocation={currentLocation}
        currentCity={currentCity}
        currentState={currentState}
        onPlanGenerated={handleAITripPlanGenerated}
        tintColor={tint}
      />

      {/* Multi-Stop Planner Modal */}
      <MultiStopPlanner
        visible={showMultiStopPlanner}
        onClose={() => setShowMultiStopPlanner(false)}
        currentLocation={currentLocation}
        onPlanRoute={handleMultiStopRoute}
        tintColor={tint}
      />

      {/* Parking Suggestions Modal */}
      {destinationMarker && (
        <ParkingSuggestions
          visible={showParkingSuggestions}
          onClose={() => setShowParkingSuggestions(false)}
          destination={destinationMarker}
          destinationName={destinationName}
          onSelectParking={handleSelectParking}
          tintColor={tint}
        />
      )}

      {/* Route History Modal */}
      <RouteHistory
        visible={showRouteHistory}
        onClose={() => setShowRouteHistory(false)}
        onSelectRoute={async (savedRoute) => {
          // Set destination and calculate route
          setDestinationMarker(savedRoute.destination);
          setDestinationName(savedRoute.name);
          await navigation.calculateRoute(savedRoute.destination, {
            waypoints: savedRoute.waypoints,
          });
          setShowRouteSelector(true);
        }}
      />
    </View>
  );
});

RecorderTab.displayName = 'RecorderTab';

export default RecorderTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeSwitcher: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  navigationControls: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    gap: 12,
  },
  whereToButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  whereToText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  planButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  planButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  multiStopButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  multiStopButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  historyButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  historyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  errorDismiss: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recenterIcon: {
    fontSize: 24,
  },
});
