import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocationSubscription, TrackPoint, Trip } from '../types';
import { calculateDistance } from '../utils/calculations';
import { createLocationUpdateHandler, createLocationWatcher, safeRemoveSubscription } from '../utils/location';
import { addTrip } from '../utils/storage';
import { formatTripName } from '../utils/trip-names';

const MAX_PATH_POINTS = 50000;

function enqueueExclusive(chainRef: { current: Promise<void> }, operation: () => Promise<void>): Promise<void> {
  const run = chainRef.current.then(operation, operation);
  chainRef.current = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function useTripTracking() {
  const mapRef = useRef<any>(null);
  const watchSubRef = useRef<LocationSubscription | number | null>(null);
  const idleWatchRef = useRef<LocationSubscription | number | null>(null);
  const sessionIdRef = useRef(0);
  const opChainRef = useRef(Promise.resolve());
  const pathRef = useRef<TrackPoint[]>([]);
  const metersRef = useRef(0);
  const startTsRef = useRef<number | null>(null);
  const pausedSinceRef = useRef<number | null>(null);
  const pausedAccumRef = useRef(0);
  const pausedRef = useRef(false);
  const trackingRef = useRef(false);

  const [hasPerm, setHasPerm] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [loc, setLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [path, setPath] = useState<TrackPoint[]>([]);
  const [meters, setMeters] = useState(0);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [pausedSince, setPausedSince] = useState<number | null>(null);
  const [pausedAccum, setPausedAccum] = useState(0);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const clearTrackingSubscription = useCallback(() => {
    if (watchSubRef.current) {
      safeRemoveSubscription(watchSubRef.current);
      watchSubRef.current = null;
    }
  }, []);

  const resetRecordingState = useCallback((finishedAtMs: number | null) => {
    pathRef.current = [];
    metersRef.current = 0;
    startTsRef.current = null;
    pausedSinceRef.current = null;
    pausedAccumRef.current = 0;
    pausedRef.current = false;
    trackingRef.current = false;
    setPath([]);
    setMeters(0);
    setStartTs(null);
    setPaused(false);
    setPausedSince(null);
    setPausedAccum(0);
    setFinishedAt(finishedAtMs);
    setTracking(false);
    setCurrentTime(Date.now());
  }, []);

  const requestLocationPermission = useCallback(async () => {
    let granted = false;
    try {
      setPermissionError(null);
      const existing = await Location.getForegroundPermissionsAsync();
      granted = existing.granted;

      if (!granted && existing.canAskAgain) {
        const requested = await Location.requestForegroundPermissionsAsync();
        granted = requested.granted;
      }

      if (!granted) {
        setHasPerm(false);
        setPermissionStatus('denied');
        setPermissionError('Location permission is required to record trips. Enable it in your device settings.');
        return false;
      }

      setHasPerm(true);
      setPermissionStatus('granted');

      try {
        const currentPosition = await Location.getCurrentPositionAsync({});
        setLoc({
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        });
      } catch (positionError) {
        console.warn('Failed to get current position:', positionError);
        setPermissionError('Unable to get your location right now. Check GPS signal and try again.');
      }

      return true;
    } catch (error) {
      console.warn('Failed to initialize location:', error);
      if (granted) {
        setHasPerm(true);
        setPermissionStatus('granted');
        setPermissionError('Unable to get your location right now. Check GPS signal and try again.');
        return true;
      }
      setHasPerm(false);
      setPermissionStatus('denied');
      setPermissionError('Unable to access location right now. Please try again.');
      return false;
    }
  }, []);

  useEffect(() => {
    requestLocationPermission();

    return () => {
      sessionIdRef.current += 1;
      if (watchSubRef.current) {
        safeRemoveSubscription(watchSubRef.current);
      }
      if (idleWatchRef.current) {
        safeRemoveSubscription(idleWatchRef.current);
      }
    };
  }, [requestLocationPermission]);

  const handleLocationUpdate = useCallback((point: TrackPoint) => {
    setLoc({ latitude: point.latitude, longitude: point.longitude });

    const prevPath = pathRef.current;
    let nextMeters = metersRef.current;
    if (prevPath.length > 0) {
      const lastPoint = prevPath[prevPath.length - 1];
      const distanceIncrement = calculateDistance(
        { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
        { latitude: point.latitude, longitude: point.longitude }
      );
      if (Number.isFinite(distanceIncrement) && distanceIncrement > 0) {
        nextMeters += distanceIncrement;
      }
    }

    const newPath = [...prevPath, point];
    const trimmedPath = newPath.length > MAX_PATH_POINTS
      ? newPath.slice(-MAX_PATH_POINTS)
      : newPath;

    pathRef.current = trimmedPath;
    metersRef.current = nextMeters;
    setPath(trimmedPath);
    setMeters(nextMeters);

    if (__DEV__ && trimmedPath.length !== newPath.length) {
      console.debug(`[TripTracking] Path trimmed from ${newPath.length} to ${trimmedPath.length} points to prevent memory issues`);
    }

    if (__DEV__ && trimmedPath.length % 100 === 0) {
      console.debug(`[TripTracking] Location recorded: ${trimmedPath.length} points, ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);
    }
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

  const start = useCallback(() => {
    return enqueueExclusive(opChainRef, async () => {
      if (!hasPerm) {
        const granted = await requestLocationPermission();
        if (!granted) return;
      }

      const session = ++sessionIdRef.current;

      pathRef.current = [];
      metersRef.current = 0;
      startTsRef.current = Date.now();
      pausedSinceRef.current = null;
      pausedAccumRef.current = 0;

      setPath([]);
      setMeters(0);
      setStartTs(startTsRef.current);
      pausedRef.current = false;
      trackingRef.current = false;
      setPaused(false);
      setPausedSince(null);
      setPausedAccum(0);
      setFinishedAt(null);
      setTracking(false);

      try {
        if (idleWatchRef.current) {
          safeRemoveSubscription(idleWatchRef.current);
          idleWatchRef.current = null;
        }
        clearTrackingSubscription();
        const subscription = await createLocationWatcher(handleLocationUpdate);
        if (sessionIdRef.current !== session) {
          safeRemoveSubscription(subscription);
          return;
        }
        watchSubRef.current = subscription;
        trackingRef.current = true;
        setTracking(true);
      } catch (error) {
        console.warn('Failed to start location tracking:', error);
        if (sessionIdRef.current === session) {
          setPermissionError('Failed to start recording. Check location services and try again.');
          trackingRef.current = false;
          setTracking(false);
        }
      }
    });
  }, [hasPerm, handleLocationUpdate, requestLocationPermission, clearTrackingSubscription]);

  const stop = useCallback((options?: { name?: string }) => {
    return enqueueExclusive(opChainRef, async () => {
      if (__DEV__) {
        console.debug('Stop button pressed - saving trip and resetting');
      }

      sessionIdRef.current += 1;
      clearTrackingSubscription();
      trackingRef.current = false;
      pausedRef.current = false;
      setTracking(false);
      setPaused(false);

      const now = Date.now();
      const snapshotPath = pathRef.current;
      const snapshotMeters = metersRef.current;
      const snapshotStartTs = startTsRef.current;
      const snapshotPausedAccum =
        pausedAccumRef.current + (pausedSinceRef.current ? now - pausedSinceRef.current : 0);

      const willSave = snapshotPath.length > 0 && snapshotMeters > 0 && Boolean(snapshotStartTs);
      const tripName = options?.name ? formatTripName(options.name) : undefined;

      resetRecordingState(now);

      if (willSave && snapshotStartTs) {
        const trip: Trip = {
          id: `${now}`,
          path: snapshotPath,
          meters: snapshotMeters,
          startTs: snapshotStartTs,
          endTs: now,
          pausedAccum: snapshotPausedAccum,
          ...(tripName ? { name: tripName } : {}),
        };
        if (__DEV__) {
          console.debug(`[TripTracking] Saving trip: ${snapshotPath.length} points, ${snapshotMeters.toFixed(0)}m, ${((now - snapshotStartTs) / 1000).toFixed(0)}s`);
        }
        try {
          await addTrip(trip);
          if (__DEV__) {
            console.debug('[TripTracking] Trip saved successfully');
          }
        } catch (error) {
          console.warn('[TripTracking] Failed to save trip:', error);
        }
      } else {
        console.warn(`[TripTracking] Trip not saved - insufficient data: ${snapshotPath.length} points, ${snapshotMeters}m, startTs: ${snapshotStartTs ? 'yes' : 'no'}`);
      }
    });
  }, [clearTrackingSubscription, resetRecordingState]);

  const pause = useCallback(() => {
    return enqueueExclusive(opChainRef, async () => {
      if (!trackingRef.current) return;

      clearTrackingSubscription();
      trackingRef.current = false;
      pausedRef.current = true;
      setTracking(false);
      setPaused(true);
      const now = Date.now();
      pausedSinceRef.current = now;
      setPausedSince(now);
    });
  }, [clearTrackingSubscription]);

  const resume = useCallback(() => {
    return enqueueExclusive(opChainRef, async () => {
      if (!pausedRef.current) return;
      if (!hasPerm) {
        const granted = await requestLocationPermission();
        if (!granted) return;
      }

      const session = ++sessionIdRef.current;
      if (pausedSinceRef.current) {
        pausedAccumRef.current += Date.now() - pausedSinceRef.current;
        setPausedAccum(pausedAccumRef.current);
      }
      pausedSinceRef.current = null;
      pausedRef.current = false;
      setPausedSince(null);
      setPaused(false);

      try {
        clearTrackingSubscription();
        const subscription = await createLocationWatcher(handleLocationUpdate);
        if (sessionIdRef.current !== session) {
          safeRemoveSubscription(subscription);
          return;
        }
        watchSubRef.current = subscription;
        trackingRef.current = true;
        setTracking(true);
      } catch (error) {
        console.warn('Failed to resume location tracking:', error);
        if (sessionIdRef.current === session) {
          setPermissionError('Failed to resume recording. Check location services and try again.');
        }
      }
    });
  }, [hasPerm, handleLocationUpdate, requestLocationPermission, clearTrackingSubscription]);

  const reset = useCallback(() => {
    return enqueueExclusive(opChainRef, async () => {
      sessionIdRef.current += 1;
      clearTrackingSubscription();
      resetRecordingState(null);
    });
  }, [clearTrackingSubscription, resetRecordingState]);

  useEffect(() => {
    if (__DEV__) {
      console.debug('Timer effect - tracking:', tracking, 'paused:', paused);
    }
    if (!tracking && !paused) {
      if (__DEV__) {
        console.debug('Stopping timer - not tracking and not paused');
      }
      return;
    }

    if (__DEV__) {
      console.debug('Starting timer - tracking or paused');
    }
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [tracking, paused]);

  const elapsedMs = useMemo(() => {
    if (!startTs) return 0;

    if (finishedAt) {
      return Math.max(0, finishedAt - startTs - pausedAccum);
    }

    if (tracking || paused) {
      const totalPaused = pausedAccum + (pausedSince ? currentTime - pausedSince : 0);
      return Math.max(0, currentTime - startTs - totalPaused);
    }

    return 0;
  }, [startTs, finishedAt, pausedAccum, pausedSince, currentTime, tracking, paused]);

  return {
    mapRef,
    hasPerm,
    permissionStatus,
    permissionError,
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
    requestLocationPermission,
  };
}

export default useTripTracking;
