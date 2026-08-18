import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Trip } from '../types';

const TRIPS_KEY = 'trips';
const COLORS_KEY = 'appColors';

let tripMutationQueue: Promise<unknown> = Promise.resolve();

function enqueueTripMutation<T>(operation: () => Promise<T>): Promise<T> {
  const run = tripMutationQueue.then(operation, operation);
  tripMutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Safely retrieves trips from AsyncStorage with error handling
 */
export const getTrips = async (): Promise<Trip[]> => {
  try {
    const raw = await AsyncStorage.getItem(TRIPS_KEY);
    if (!raw) {
      console.log('No trips found in storage');
      return [];
    }
    
    const trips = JSON.parse(raw) as Trip[];
    console.log(`Loaded ${trips.length} trips from storage`);
    
    // Validate trip structure
    const validTrips = trips.filter(trip => 
      trip && 
      typeof trip.id === 'string' && 
      typeof trip.meters === 'number' &&
      Array.isArray(trip.path)
    );
    
    console.log(`${validTrips.length} valid trips after filtering`);
    return validTrips;
  } catch (error) {
    console.warn('Failed to load trips from storage:', error);
    return [];
  }
};

/**
 * Writes the trip list without taking the mutation lock.
 */
const persistTrips = async (trips: Trip[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    return true;
  } catch (error) {
    console.warn('Failed to save trips to storage:', error);
    return false;
  }
};

/**
 * Safely saves trips to AsyncStorage with error handling
 */
export const saveTrips = async (trips: Trip[]): Promise<boolean> => {
  return enqueueTripMutation(() => persistTrips(trips));
};

/**
 * Adds a new trip to storage
 */
export const addTrip = async (trip: Trip): Promise<boolean> => {
  return enqueueTripMutation(async () => {
    try {
      const existingTrips = await getTrips();
      return await persistTrips([...existingTrips, trip]);
    } catch (error) {
      console.warn('Failed to add trip to storage:', error);
      return false;
    }
  });
};

/**
 * Delete a specific trip by ID
 */
export const deleteTrip = async (tripId: string): Promise<boolean> => {
  return enqueueTripMutation(async () => {
    try {
      const trips = await getTrips();
      const filteredTrips = trips.filter(trip => trip.id !== tripId);
      return await persistTrips(filteredTrips);
    } catch (error) {
      console.warn('Failed to delete trip from storage:', error);
      return false;
    }
  });
};

/**
 * Clears all trips from storage
 */
export const clearAllTrips = async (): Promise<boolean> => {
  return enqueueTripMutation(async () => {
  try {
    console.log('Clearing all trips from storage...');
    
    if (Platform.OS === 'web') {
      // On web, clear from both localStorage and AsyncStorage
      try {
        localStorage.removeItem(TRIPS_KEY);
        console.log('Cleared from localStorage');
      } catch (localError) {
        console.warn('Failed to clear from localStorage:', localError);
      }
      
      // Also try to save an empty array to AsyncStorage
      try {
        await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify([]));
        console.log('Set empty array in AsyncStorage');
      } catch (asyncError) {
        console.warn('Failed to set empty array in AsyncStorage:', asyncError);
      }
    }
    
    await AsyncStorage.removeItem(TRIPS_KEY);
    console.log('Successfully cleared trips from AsyncStorage');
    
    // Double-check by trying to read back
    const remainingTrips = await getTrips();
    console.log(`After clear, ${remainingTrips.length} trips remain`);
    
    return remainingTrips.length === 0;
  } catch (error) {
    console.warn('Failed to clear trips from storage:', error);
    return false;
  }
  });
};

/**
 * Safely retrieves app colors from AsyncStorage
 */
export const getAppColors = async (): Promise<Record<string, any> | null> => {
  try {
    const raw = await AsyncStorage.getItem(COLORS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to load app colors from storage:', error);
    return null;
  }
};

/**
 * Safely saves app colors to AsyncStorage
 */
export const saveAppColors = async (colors: Record<string, any>): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(COLORS_KEY, JSON.stringify(colors));
    return true;
  } catch (error) {
    console.warn('Failed to save app colors to storage:', error);
    return false;
  }
};
