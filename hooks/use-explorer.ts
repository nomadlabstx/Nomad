/**
 * useExplorer Hook
 * Manages explorer system state and automatic location tracking
 */

import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { achievementsService } from '../services/achievements';
import explorerService from '../services/explorer';
import type { ExplorerData } from '../types/explorer';

const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds
const LOCATION_DISTANCE_FILTER = 100; // 100 meters

interface UseExplorerReturn {
  explorerData: ExplorerData | null;
  isTracking: boolean;
  stats: {
    totalLocations: number;
    visitedLocations: number;
    completionPercent: number;
    completionPercentKnown: boolean;
    countriesVisited: number;
    statesVisited: number;
    countiesVisited: number;
    citiesVisited: number;
  };
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
  setVisibilityMode: (mode: 'all' | 'discovered' | 'undiscovered') => Promise<void>;
}

export function useExplorer(): UseExplorerReturn {
  const [explorerData, setExplorerData] = useState<ExplorerData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [stats, setStats] = useState({
    totalLocations: 0,
    visitedLocations: 0,
    completionPercent: 0,
    completionPercentKnown: false,
    countriesVisited: 0,
    statesVisited: 0,
    countiesVisited: 0,
    citiesVisited: 0,
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  /**
   * Initialize explorer service on mount
   */
  useEffect(() => {
    const init = async () => {
      console.log('[useExplorer] Starting initialization...');
      await explorerService.initialize();
      console.log('[useExplorer] Initialization complete, refreshing...');
      await refresh();
      console.log('[useExplorer] Refresh complete');
    };

    init();
  }, []);

  /**
   * Refresh explorer data and stats
   */
  const refresh = useCallback(async () => {
    // Force reload from storage
    await explorerService.initialize();
    const data = explorerService.getData();
    setExplorerData(data);

    const newStats = explorerService.getStats();
    setStats(newStats);
  }, []);

  /**
   * Start automatic location tracking
   */
  const startTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }

      // Start watching location
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: LOCATION_DISTANCE_FILTER,
        },
        async (location) => {
          // Record visit
          const success = await explorerService.recordVisit(
            location.coords.latitude,
            location.coords.longitude
          );

          if (success) {
            // Refresh data after recording
            await refresh();
            
            // Check for achievement unlocks
            const newStats = explorerService.getStats();
            await achievementsService.checkAchievements({
              citiesVisited: newStats.citiesVisited,
              statesVisited: newStats.statesVisited,
            });
          }
        }
      );

      setIsTracking(true);
    } catch (error) {
      console.error('Failed to start explorer tracking:', error);
    }
  }, [refresh]);

  /**
   * Stop automatic location tracking
   */
  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  }, []);

  /**
   * Clear all explorer data
   */
  const clearAll = useCallback(async () => {
    await explorerService.clearAll();
    await refresh();
  }, [refresh]);

  /**
   * Set visibility mode filter
   */
  const setVisibilityMode = useCallback(async (mode: 'all' | 'discovered' | 'undiscovered') => {
    await explorerService.updateFilters({
      display: {
        visibilityMode: mode,
        showVisitCounts: explorerData?.filters?.display.showVisitCounts ?? true,
        groupByCategory: explorerData?.filters?.display.groupByCategory ?? true,
        sortBy: explorerData?.filters?.display.sortBy ?? 'name',
      },
    });
    await refresh();
  }, [explorerData, refresh]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  return {
    explorerData,
    isTracking,
    stats,
    startTracking,
    stopTracking,
    clearAll,
    refresh,
    setVisibilityMode,
  };
}

export default useExplorer;

