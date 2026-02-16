import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocationSubscription, TrackPoint, Trip } from '../types';
import { calculateDistance } from '../utils/calculations';
import { createLocationUpdateHandler, createLocationWatcher, safeRemoveSubscription } from '../utils/location';
import { addTrip } from '../utils/storage';

export function useTripTracking() {
  const mapRef = useRef<any>(null);
  const watchSubRef = useRef<LocationSubscription | number | null>(null);
  const idleWatchRef = useRef<LocationSubscription | number | null>(null);
  const [hasPerm, setHasPerm] = useState(false);
  const [loc, setLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [watchSub, setWatchSub] = useState<LocationSubscription | number | null>(null);
  const [path, setPath] = useState<TrackPoint[]>([]);
  const [meters, setMeters] = useState(0);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [pausedSince, setPausedSince] = useState<number | null>(null);
  const [pausedAccum, setPausedAccum] = useState(0);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Sync ref with state for cleanup
  useEffect(() => {
    watchSubRef.current = watchSub;
  }, [watchSub]);

  // Initialize location permissions and get current position
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHasPerm(false);
          return;
        }
        setHasPerm(true);
        const currentPosition = await Location.getCurrentPositionAsync({});
        setLoc({ 
          latitude: currentPosition.coords.latitude, 
          longitude: currentPosition.coords.longitude 
        });
      } catch (error) {
        console.warn('Failed to initialize location:', error);
        setHasPerm(false);
      }
    };

    initializeLocation();

    // Cleanup: remove any active subscription on unmount
    return () => {
      if (watchSubRef.current) {
        safeRemoveSubscription(watchSubRef.current);
      }
      if (idleWatchRef.current) {
        safeRemoveSubscription(idleWatchRef.current);
      }
    };
  }, []); // Only run once on mount

  // Memoized location update handler with path size limit to prevent memory issues
  const handleLocationUpdate = useCallback((point: TrackPoint) => {
    setLoc({ latitude: point.latitude, longitude: point.longitude });
    setPath((prevPath) => {
      if (prevPath.length > 0) {
        const lastPoint = prevPath[prevPath.length - 1];
        const distanceIncrement = calculateDistance(
          { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
          { latitude: point.latitude, longitude: point.longitude }
        );
        setMeters((currentMeters) => currentMeters + distanceIncrement);
      }
      
      // Limit path size to prevent memory issues on very long trips (keep last 50,000 points)
      // This is roughly 27 hours of tracking at 2-second intervals
      const MAX_PATH_POINTS = 50000;
      const newPath = [...prevPath, point];
      const trimmedPath = newPath.length > MAX_PATH_POINTS 
        ? newPath.slice(-MAX_PATH_POINTS) // Keep only the most recent points
        : newPath;
      
      if (__DEV__ && trimmedPath.length !== newPath.length) {
        console.debug(`[TripTracking] Path trimmed from ${newPath.length} to ${trimmedPath.length} points to prevent memory issues`);
      }
      
      if (__DEV__ && trimmedPath.length % 100 === 0) {
        console.debug(`[TripTracking] Location recorded: ${trimmedPath.length} points, ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);
      }
      
      return trimmedPath;
    });
  }, []);

  const startIdleWatcher = useCallback(async () => {
    if (!hasPerm || idleWatchRef.current) return;

    try {
      const handler = createLocationUpdateHandler((point: TrackPoint) => {
        setLoc({ latitude: point.latitude, longitude: point.longitude });
      }, 2000);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 50,
        },
        handler
      );

      idleWatchRef.current = subscription;
    } catch (error) {
      console.warn('[TripTracking] Failed to start idle watcher:', error);
    }
  }, [hasPerm]);

  useEffect(() => {
    if (!hasPerm) return;

    if (tracking) {
      if (idleWatchRef.current) {
        safeRemoveSubscription(idleWatchRef.current);
        idleWatchRef.current = null;
      }
      return;
    }

    startIdleWatcher();
  }, [hasPerm, tracking, startIdleWatcher]);

  const start = useCallback(async () => {
    if (!hasPerm) return;
    
    // Reset state
    setPath([]);
    setMeters(0);
    setStartTs(Date.now());
    setPaused(false);
    setPausedSince(null);
    setPausedAccum(0);
    setFinishedAt(null);

    try {
      if (idleWatchRef.current) {
        safeRemoveSubscription(idleWatchRef.current);
        idleWatchRef.current = null;
      }
      const subscription = await createLocationWatcher(handleLocationUpdate);
      setWatchSub(subscription);
      setTracking(true);
    } catch (error) {
      console.warn('Failed to start location tracking:', error);
    }
  }, [hasPerm, handleLocationUpdate]);

  const stop = useCallback(() => {
    if (__DEV__) {
      console.debug('Stop button pressed - saving trip and resetting');
    }
    safeRemoveSubscription(watchSub);
    setWatchSub(null);
    setTracking(false);
    setPaused(false);
    setPausedSince(null);
    const now = Date.now();

    // Save trip asynchronously BEFORE resetting state
    const saveTrip = async () => {
      try {
        // Only save if there's meaningful data
        if (path.length > 0 && meters > 0 && startTs) {
          const trip: Trip = {
            id: `${Date.now()}`,
            path,
            meters,
            startTs,
            endTs: now,
            pausedAccum,
          };
          if (__DEV__) {
            console.debug(`[TripTracking] Saving trip: ${path.length} points, ${meters.toFixed(0)}m, ${((now - startTs) / 1000).toFixed(0)}s`);
          }
          await addTrip(trip);
          if (__DEV__) {
            console.debug('[TripTracking] Trip saved successfully');
          }
        } else {
          console.warn(`[TripTracking] Trip not saved - insufficient data: ${path.length} points, ${meters}m, startTs: ${startTs ? 'yes' : 'no'}`);
        }
      } catch (error) {
        console.warn('[TripTracking] Failed to save trip:', error);
      }
      
      // Reset everything after saving
      setPath([]);
      setMeters(0);
      setStartTs(null);
      setPausedAccum(0);
      setFinishedAt(null);
      setCurrentTime(Date.now());
    };
    
    saveTrip();
  }, [watchSub, path, meters, startTs, pausedAccum]);

  const pause = useCallback(() => {
    if (!tracking) return;
    
    safeRemoveSubscription(watchSub);
    setWatchSub(null);
    setTracking(false);
    setPaused(true);
    setPausedSince(Date.now());
  }, [tracking, watchSub]);

  const resume = useCallback(async () => {
    if (!hasPerm || !paused) return;
    
    if (pausedSince) {
      setPausedAccum((accumulated) => accumulated + (Date.now() - pausedSince));
    }
    setPausedSince(null);
    setPaused(false);

    try {
      const subscription = await createLocationWatcher(handleLocationUpdate);
      setWatchSub(subscription);
      setTracking(true);
    } catch (error) {
      console.warn('Failed to resume location tracking:', error);
    }
  }, [hasPerm, paused, pausedSince, handleLocationUpdate]);

  const reset = useCallback(() => {
    safeRemoveSubscription(watchSub);
    setWatchSub(null);
    setTracking(false);
    setPath([]);
    setMeters(0);
    setStartTs(null);
    setPaused(false);
    setPausedSince(null);
    setPausedAccum(0);
    setFinishedAt(null);
    setCurrentTime(Date.now()); // Reset current time
  }, [watchSub]);

  // Real-time timer for smooth updates
  useEffect(() => {
    if (__DEV__) {
      console.debug('Timer effect - tracking:', tracking, 'paused:', paused);
    }
    // Only run timer when actively tracking or paused (not when stopped)
    if (!tracking && !paused) {
      if (__DEV__) {
        console.debug('Stopping timer - not tracking and not paused');
      }
      return; // Stop timer if not tracking and not paused
    }

    if (__DEV__) {
      console.debug('Starting timer - tracking or paused');
    }
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [tracking, paused]);

  // Memoized elapsed time calculation with real-time updates
  const elapsedMs = useMemo(() => {
    if (!startTs) return 0;
    
    // If trip is finished (stopped), use finishedAt time - this is static
    if (finishedAt) {
      return Math.max(0, finishedAt - startTs - pausedAccum);
    }
    
    // If actively tracking or paused, use current time for smooth updates
    if (tracking || paused) {
      const totalPaused = pausedAccum + (pausedSince ? currentTime - pausedSince : 0);
      return Math.max(0, currentTime - startTs - totalPaused);
    }
    
    // If not tracking, not paused, and not finished, return 0
    return 0;
  }, [startTs, finishedAt, pausedAccum, pausedSince, currentTime, tracking, paused]);

  return {
    mapRef,
    hasPerm,
    loc,
    tracking,
    paused,
    path,
    meters,
    startTs,
    finishedAt,
    elapsedMs,
    start,
    stop,
    pause,
    resume,
    reset,
  };
}

export default useTripTracking;
