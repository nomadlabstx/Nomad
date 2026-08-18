/**
 * GPS Tab — Maps, routing, and turn-by-turn navigation.
 * Trip/path recording runs automatically in the background while navigating.
 */

import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { DestinationParkingPreview } from '../../components/destination-parking-preview';
import DestinationSearch from '../../components/destination-search';
import MaybeMapView, {
    PROVIDER_GOOGLE as MAYBE_PROVIDER_GOOGLE,
    PROVIDER_DEFAULT as MAYBE_PROVIDER_DEFAULT,
    Marker as MaybeMarker,
} from '../../components/maybe-map';
import { Platform } from 'react-native';
import { MultiStopPlanner } from '../../components/multi-stop-planner';
import NavigationUI from '../../components/navigation-ui';
import { ParkingSuggestions } from '../../components/parking-suggestions';
import RouteSelector from '../../components/route-selector';
import RoutePreviewPolylines from '../../components/route-preview-polylines';
import { OfflineIndicator } from '../../components/offline-indicator';
import GpsSimulatorPanel from '../../components/gps-simulator-panel';
import { useAppTint } from '../../components/color-context';
import { useAchievements } from '../../hooks/use-achievements';
import { useNavigation } from '../../hooks/use-navigation';
import { useTripTracking } from '../../hooks/use-trip-tracking';
import { useGpsSimulator } from '../../hooks/use-gps-simulator';
import { aiPlannerContextService } from '../../services/ai-planner-context';
import { Coordinates, navigationService } from '../../services/navigation';
import { gpsSimulator, type GpsSimulatorPreset } from '../../utils/gps-simulator';
import { getAccentFill, getOnAccentColor } from '../../utils/theme-helpers';
import { formatTripName } from '../../utils/trip-names';

const RecorderTab = memo(() => {
  // State
  const [unit] = useState<'miles' | 'km'>('miles');
  const [showDestinationSearch, setShowDestinationSearch] = useState(false);
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [showMultiStopPlanner, setShowMultiStopPlanner] = useState(false);
  const [destinationMarker, setDestinationMarker] = useState<Coordinates | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [showParkingSuggestions, setShowParkingSuggestions] = useState(false);

  // Refs
  const navigationMapRef = useRef<any>(null);
  const autoRecordingRef = useRef(false);
  const tripNameRef = useRef('');
  const inboundReplayRef = useRef<string | null>(null);
  const hasInitialCenteredRef = useRef(false);
  const [followsUser, setFollowsUser] = useState(false);

  // Hooks
  const passiveTracking = useTripTracking();
  const navigation = useNavigation();
  const achievements = useAchievements();
  const gpsSim = useGpsSimulator();
  const { tint: themeTint } = useAppTint();
  const tint = getAccentFill(themeTint);
  const onAccent = getOnAccentColor(tint);

  // Get route params for navigation from planned trips
  const params = useLocalSearchParams();
  const router = useRouter();

  // Handle navigation from planned trips
  useFocusEffect(
    useCallback(() => {
      // Check if we arrived from a planned trip
      if (params.applyAIPlan === 'true') {
        const plan = aiPlannerContextService.consumePendingPlan();
        if (plan) {
          void (async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            achievements.recordAITripPlanned();
            await navigation.calculateRoute(plan.finalDestination.location, {
              waypoints: plan.stops.map(stop => stop.location),
              ...plan.routeOptions,
            }, undefined, plan.finalDestination.name);
            setDestinationName(plan.finalDestination.name || '');
            setDestinationMarker(plan.finalDestination.location);
            setShowRouteSelector(true);
          })();
        }
      }

      if (params.fromPlannedTrip === 'true' && params.destinationLat && params.destinationLng) {
        const destination: Coordinates = {
          latitude: parseFloat(params.destinationLat as string),
          longitude: parseFloat(params.destinationLng as string),
        };
        const inboundName = (params.destinationName as string) || 'Destination';
        const replayKey = `${params.replay || ''}:${destination.latitude}:${destination.longitude}:${inboundName}`;
        if (
          Number.isFinite(destination.latitude) &&
          Number.isFinite(destination.longitude) &&
          inboundReplayRef.current !== replayKey
        ) {
          inboundReplayRef.current = replayKey;
          setDestinationMarker(destination);
          setDestinationName(inboundName);
          void (async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await navigation.calculateRoute(destination, {}, undefined, inboundName);
            setShowRouteSelector(true);
          })();
        }
      }
    }, [params.applyAIPlan, params.fromPlannedTrip, params.destinationLat, params.destinationLng, params.destinationName, params.replay, navigation, achievements])
  );

  // Auto-show route selector when routes become available after planned trip navigation
  // This effect handles the case where routes become available after the component has already focused
  // It also handles the case where routes are calculated asynchronously after navigation
  useEffect(() => {
    if (params.fromPlannedTrip === 'true' && navigation.routes.length > 0 && destinationMarker) {
      setShowRouteSelector(true);
    }
  }, [navigation.routes.length, params.fromPlannedTrip, destinationMarker]);

  /**
   * Auto-record trips when navigation is active
   */
  useEffect(() => {
    if (navigation.isNavigating) {
      if (!passiveTracking.tracking) {
        tripNameRef.current = formatTripName(
          destinationName || navigation.getDestinationLabel() || ''
        );
        passiveTracking.start();
        autoRecordingRef.current = true;
      }
      return;
    }

    if (autoRecordingRef.current) {
      passiveTracking.stop({
        name: tripNameRef.current || destinationName || navigation.getDestinationLabel() || undefined,
      });
      autoRecordingRef.current = false;
    }
  }, [navigation.isNavigating, navigation.getDestinationLabel, destinationName, passiveTracking.tracking, passiveTracking.start, passiveTracking.stop]);

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
  const currentLocation = navigation.currentLocation ?? passiveTracking.loc;

  /**
   * Center map once when location first becomes available.
   */
  useEffect(() => {
    if (!currentLocation || hasInitialCenteredRef.current) return;

    hasInitialCenteredRef.current = true;
    navigationMapRef.current?.animateToRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  }, [currentLocation]);

  /**
   * Follow user only while followsUser is enabled (after tapping recenter).
   */
  useEffect(() => {
    if (!followsUser || !currentLocation) return;

    navigationMapRef.current?.animateToRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 300);
  }, [currentLocation, followsUser]);

  /**
   * Recenter map on user location and resume following GPS.
   */
  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowsUser(true);

    if (navigationMapRef.current && currentLocation) {
      navigationMapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  }, [currentLocation]);

  const handleMapPan = useCallback(() => {
    setFollowsUser(false);
  }, []);

  const handleOpenLocationSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        'Open Settings Failed',
        'Please open your device settings and enable location permission for Nomad.'
      );
    });
  }, []);

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
    await navigation.calculateRoute(coordinates, undefined, undefined, description);
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
      navigation.calculateRoute(parking.coordinates, undefined, undefined, parking.name);
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
    navigation.startNavigation();
    setFollowsUser(true);
  }, [navigation]);

  /**
   * Handle stop navigation
   */
  const handleStopNavigation = useCallback(() => {
    gpsSimulator.stop();
    navigation.stopNavigation();
    setDestinationMarker(null);
  }, [navigation]);

  const handleStartSimulation = useCallback((preset: GpsSimulatorPreset) => {
    const route = navigation.selectedRoute;
    if (!route) return;

    let path = navigationService.getDetailedRoutePath(route);
    if (path.length < 2) {
      path = navigationService.decodePolyline(route.overviewPolyline);
    }
    const destination = route.legs[route.legs.length - 1]?.endLocation;
    if (destination) {
      path = [...path, destination];
    }

    const started = gpsSimulator.start(path, preset);
    if (!started) {
      Alert.alert('Simulate drive', 'Could not build a path from this route.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowsUser(true);
    setShowRouteSelector(false);

    if (!navigation.isNavigating) {
      navigation.startNavigation();
    }
  }, [navigation]);

  /**
   * Handle multi-stop route planning
   */
  const handleMultiStopRoute = useCallback(
    async (destination: Coordinates, options: any, destName?: string) => {
      setShowMultiStopPlanner(false);
      if (destName) {
        setDestinationName(destName);
      }
      await navigation.calculateRoute(destination, options, undefined, destName || undefined);
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

  const previewRoutes = useMemo(() => {
    if (navigation.isNavigating) {
      return navigation.selectedRoute ? [navigation.selectedRoute] : [];
    }
    if (navigation.routes.length > 0) {
      return navigation.routes;
    }
    return navigation.selectedRoute ? [navigation.selectedRoute] : [];
  }, [navigation.isNavigating, navigation.routes, navigation.selectedRoute]);

  /**
   * Pull the camera back so the whole route is visible while picking a path.
   */
  useEffect(() => {
    if (!showRouteSelector || navigation.routes.length === 0) {
      return;
    }

    setFollowsUser(false);

    const points = navigation.routes.flatMap((route) => {
      try {
        const detailed = navigationService.getDetailedRoutePath(route);
        return detailed.length >= 2
          ? detailed
          : navigationService.decodePolyline(route.overviewPolyline);
      } catch {
        return [];
      }
    });
    if (currentLocation) {
      points.push(currentLocation);
    }
    if (destinationMarker) {
      points.push(destinationMarker);
    }
    if (points.length < 2) {
      return;
    }

    const bottomPad = Math.round(Dimensions.get('window').height * 0.42);
    const timer = setTimeout(() => {
      navigationMapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 72, right: 40, bottom: bottomPad, left: 40 },
        animated: true,
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [showRouteSelector, navigation.routes, currentLocation, destinationMarker]);

  return (
    <View style={styles.container}>
      <MaybeMapView
        ref={navigationMapRef}
        style={styles.map}
        provider={Platform.OS === 'ios' ? MAYBE_PROVIDER_DEFAULT : MAYBE_PROVIDER_GOOGLE}
        showsUserLocation={!gpsSim.running}
        followsUserLocation={followsUser && !gpsSim.running}
        onRegionChangeComplete={(_, details) => {
          if (details?.isGesture) {
            handleMapPan();
          }
        }}
        scrollEnabled
        zoomEnabled
        zoomTapEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        showsMyLocationButton={false}
        initialRegion={initialRegion}
        mapType="standard"
        moveOnMarkerPress={false}
        toolbarEnabled={false}
      >
        {previewRoutes.length > 0 && (
          <RoutePreviewPolylines
            routes={previewRoutes}
            selectedRouteId={navigation.selectedRoute?.id || null}
            onSelectRoute={showRouteSelector ? navigation.selectRoute : undefined}
          />
        )}

        {destinationMarker && (
          <MaybeMarker
            coordinate={destinationMarker}
            title="Destination"
            pinColor="red"
          />
        )}

        {gpsSim.running && currentLocation && (
          <MaybeMarker
            coordinate={currentLocation}
            title="Simulated position"
            pinColor="#007AFF"
          />
        )}
      </MaybeMapView>

      {!navigation.isNavigating &&
        passiveTracking.permissionStatus !== 'denied' &&
        passiveTracking.permissionError && (
        <View style={styles.permissionInlineError}>
          <Text style={styles.permissionInlineErrorText}>{passiveTracking.permissionError}</Text>
        </View>
      )}

      {!navigation.isNavigating && passiveTracking.permissionStatus === 'denied' && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionTitle}>Location Permission Required</Text>
          <Text style={styles.permissionBody}>
            GPS and navigation need location access. Enable permission in settings, then tap Retry.
          </Text>
          <View style={styles.permissionActions}>
            <TouchableOpacity style={styles.permissionSecondaryBtn} onPress={handleOpenLocationSettings}>
              <Text style={styles.permissionSecondaryBtnText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.permissionPrimaryBtn, { backgroundColor: tint }]}
              onPress={passiveTracking.requestLocationPermission}
            >
              <Text style={[styles.permissionPrimaryBtnText, { color: onAccent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!navigation.isNavigating && !showRouteSelector && (
        <View style={styles.navigationControls} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.whereToButton}
                onPress={() => setShowDestinationSearch(true)}
              >
                <Text style={styles.whereToText}>Search Destination</Text>
              </TouchableOpacity>

              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/(tabs)/ai-assistant?mode=planner&source=navigate')}
                >
                  <Text style={styles.quickActionText}>Pathfinder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => setShowMultiStopPlanner(true)}
                >
                  <Text style={styles.quickActionText}>Multi-Stop</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
                onToggleVoice={navigation.toggleVoice}
                onStopNavigation={handleStopNavigation}
                unit={unit}
                currentLocation={navigation.currentLocation}
                currentSpeed={navigation.currentSpeed}
                route={navigation.selectedRoute || undefined}
                currentLegIndex={navigation.navigationState.currentLegIndex}
                currentStepIndex={navigation.navigationState.currentStepIndex}
                cameraAlerts={navigation.cameraAlerts}
              />
            </>
          )}

      {showRouteSelector && !navigation.isNavigating && (
            <RouteSelector
              routes={navigation.routes}
              selectedRouteId={navigation.selectedRoute?.id || null}
              onSelectRoute={navigation.selectRoute}
              onStartNavigation={handleStartNavigation}
              unit={unit}
            />
          )}

      {showRouteSelector && destinationMarker && destinationName && !navigation.isNavigating && (
            <View style={styles.parkingPreviewOverlay} pointerEvents="box-none">
              <DestinationParkingPreview
                destination={destinationMarker}
                destinationName={destinationName}
                onViewParking={handleViewParking}
                tintColor={tint}
              />
            </View>
          )}

      {navigation.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{navigation.error}</Text>
          <TouchableOpacity onPress={navigation.clearError}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <OfflineIndicator />

      {__DEV__ && navigation.selectedRoute && (
        <GpsSimulatorPanel
          tintColor={tint}
          canStart={Boolean(navigation.selectedRoute)}
          raised={showRouteSelector && !navigation.isNavigating}
          navigating={navigation.isNavigating}
          onSimulateDrive={handleStartSimulation}
          onStopSimulation={handleStopNavigation}
        />
      )}

      {/* Recenter Button */}
      <TouchableOpacity
        style={[
          styles.recenterButton,
          followsUser && styles.recenterButtonActive,
          showRouteSelector && styles.recenterButtonAboveRouteSheet,
        ]}
        onPress={handleRecenter}
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
      >
        <Ionicons name="locate" size={22} color={followsUser ? '#fff' : '#007AFF'} />
      </TouchableOpacity>

      {/* Destination Search Modal */}
      <Modal
        visible={showDestinationSearch}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <DestinationSearch
          currentLocation={currentLocation ?? navigation.currentLocation}
          onSelectDestination={handleSelectDestination}
          onClose={() => setShowDestinationSearch(false)}
        />
      </Modal>

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
    </View>
  );
});

RecorderTab.displayName = 'RecorderTab';

export default RecorderTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  navigationControls: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    gap: 8,
  },
  whereToButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  whereToText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 12,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 30,
  },
  recenterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  recenterButtonAboveRouteSheet: {
    bottom: '52%',
  },
  parkingPreviewOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '50%',
    zIndex: 25,
  },
  permissionBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 20,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  permissionBody: {
    marginTop: 6,
    fontSize: 13,
    color: '#333',
  },
  permissionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  permissionSecondaryBtn: {
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  permissionSecondaryBtnText: {
    color: '#333',
    fontWeight: '600',
  },
  permissionPrimaryBtn: {
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  permissionPrimaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  permissionInlineError: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 190,
    backgroundColor: 'rgba(255, 59, 48, 0.93)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  permissionInlineErrorText: {
    color: '#fff',
    fontSize: 12,
  },
});
