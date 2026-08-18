import { LocationCoordinates, TrackPoint } from '../types';

/**
 * Converts degrees to radians
 */
export const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Calculates the distance between two coordinates using the Haversine formula
 */
export const calculateDistance = (
  point1: LocationCoordinates,
  point2: LocationCoordinates
): number => {
  if (
    !Number.isFinite(point1.latitude) ||
    !Number.isFinite(point1.longitude) ||
    !Number.isFinite(point2.latitude) ||
    !Number.isFinite(point2.longitude)
  ) {
    return 0;
  }

  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);
  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);

  const a = Math.min(
    1,
    Math.max(
      0,
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    )
  );
  const meters = 2 * R * Math.asin(Math.sqrt(a));
  return Number.isFinite(meters) ? meters : 0;
};

/**
 * Formats elapsed time in milliseconds to HH:MM:SS or MM:SS format
 */
export const formatElapsedTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Formats distance in meters to kilometers and miles
 */
export const formatDistance = (meters: number): { km: string; miles: string } => {
  const km = (meters / 1000).toFixed(2);
  const miles = (meters / 1609.34).toFixed(2);
  return { km, miles };
};

/**
 * Formats distance with unit preference
 */
export const formatDistanceWithUnit = (meters: number, unit: 'miles' | 'km'): string => {
  if (unit === 'miles') {
    return (meters / 1609.344).toFixed(2) + ' mi';
  }
  return (meters / 1000).toFixed(2) + ' km';
};

/**
 * Calculates total distance from a path of track points
 */
export const calculatePathDistance = (path: TrackPoint[]): number => {
  if (path.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    const increment = calculateDistance(
      { latitude: path[i - 1].latitude, longitude: path[i - 1].longitude },
      { latitude: path[i].latitude, longitude: path[i].longitude }
    );
    if (Number.isFinite(increment) && increment > 0) {
      totalDistance += increment;
    }
  }
  return totalDistance;
};

/**
 * Calculates elapsed time considering pauses
 */
export const calculateElapsedTime = (
  startTs: number | null,
  endTs: number | null,
  pausedAccum: number = 0
): number => {
  if (!startTs) return 0;
  
  const now = Date.now();
  const finishTime = endTs ?? now;
  return Math.max(0, finishTime - startTs - pausedAccum);
};
