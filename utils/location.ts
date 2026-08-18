import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { LocationSubscription, TrackPoint } from '../types';
import { gpsSimulator } from './gps-simulator';

/**
 * Safely removes a location subscription across different platforms
 */
export const safeRemoveSubscription = (subscription: LocationSubscription | number | null): void => {
  if (!subscription) return;
  
  try {
    // Handle web geolocation numeric ID
    if (typeof subscription === 'number' && typeof navigator !== 'undefined' && typeof navigator.geolocation !== 'undefined') {
      navigator.geolocation.clearWatch(subscription);
      return;
    }
    
    // Handle native subscription objects
    if (typeof subscription === 'object') {
      if (typeof subscription.remove === 'function') {
        subscription.remove();
        return;
      }
      if (typeof subscription.removeSubscription === 'function') {
        subscription.removeSubscription();
        return;
      }
      if (typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
        return;
      }
    }
  } catch (error) {
    // Ignore removal errors - subscription might already be removed
    console.warn('Failed to remove location subscription:', error);
  }
};

/**
 * Creates a location update handler with debouncing and error handling
 * Optimized debounce to reduce map re-renders
 */
export const createLocationUpdateHandler = (
  onLocationUpdate: (point: TrackPoint) => void,
  debounceMs: number = 1000 // Reduced to 1 second for better trip recording accuracy
) => {
  let lastUpdate = 0;
  
  return (position: Location.LocationObject) => {
    const now = Date.now();
    if (!gpsSimulator.isRunning() && now - lastUpdate < debounceMs) return;
    lastUpdate = now;
    
    try {
      const point: TrackPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: position.timestamp ?? Date.now(),
        altitude: position.coords.altitude ?? undefined,
      };
      onLocationUpdate(point);
    } catch (error) {
      console.warn('[LocationWatcher] Error processing location update:', error);
    }
  };
};

/**
 * Creates a web geolocation watcher
 */
export const createWebLocationWatcher = (
  onLocationUpdate: (point: TrackPoint) => void,
  onError?: (error: GeolocationPositionError) => void
): number => {
  if (typeof navigator === 'undefined' || typeof navigator.geolocation === 'undefined') {
    throw new Error('Geolocation not available');
  }
  
  const handler = createLocationUpdateHandler(onLocationUpdate);
  
  return navigator.geolocation.watchPosition(
    handler,
    onError || (() => {}),
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 5000,
    }
  );
};

/**
 * Creates a native location watcher with optimized settings
 */
export const createNativeLocationWatcher = async (
  onLocationUpdate: (point: TrackPoint) => void
): Promise<LocationSubscription> => {
  const handler = createLocationUpdateHandler(onLocationUpdate, 1000); // Reduced debounce to 1 second for better trip recording
  
  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High, // High accuracy (better battery than BestForNavigation)
      timeInterval: 2000, // Update every 2 seconds (balanced for accuracy and battery)
      distanceInterval: 10, // Update every 10 meters (still accurate, less battery)
    },
    handler
  );
};

/**
 * Creates a platform-appropriate location watcher.
 * In development, also listens to the GPS simulator so a desk test can drive the same path.
 */
export const createLocationWatcher = async (
  onLocationUpdate: (point: TrackPoint) => void,
  onError?: (error: GeolocationPositionError) => void
): Promise<LocationSubscription | number> => {
  const handler = createLocationUpdateHandler(onLocationUpdate, 1000);
  const simSub = gpsSimulator.subscribe((location) => handler(location));

  let platformSub: LocationSubscription | number | null = null;
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.geolocation !== 'undefined') {
      platformSub = navigator.geolocation.watchPosition(
        (position) => {
          if (gpsSimulator.isRunning()) return;
          handler(position as unknown as Location.LocationObject);
        },
        onError || (() => {}),
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000,
        }
      );
    } else {
      platformSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 10,
        },
        (position) => {
          if (gpsSimulator.isRunning()) return;
          handler(position);
        }
      );
    }
  } catch (error) {
    if (!__DEV__) {
      simSub.remove();
      throw error;
    }
    console.warn('[LocationWatcher] Real GPS unavailable; simulator can still feed updates', error);
  }

  return {
    remove: () => {
      simSub.remove();
      safeRemoveSubscription(platformSub);
    },
  };
};
