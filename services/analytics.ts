/**
 * Advanced Analytics Service
 * Provides detailed travel statistics and insights
 */

import { getTrips } from '../utils/storage';
import type { Trip } from '../types';
import { explorerService } from './explorer';
import { reverseGeocodingService } from './reverse-geocoding';
import type { Coordinates } from '../types/navigation';

export interface TravelStatistics {
  // Overall Stats
  totalTrips: number;
  totalDistance: number; // meters
  totalTime: number; // seconds
  averageSpeed: number; // m/s
  averageTripDistance: number; // meters
  averageTripDuration: number; // seconds
  
  // Time-based Stats
  tripsByDay: { [date: string]: number };
  tripsByWeek: { [week: string]: number };
  tripsByMonth: { [month: string]: number };
  distanceByDay: { [date: string]: number };
  distanceByMonth: { [month: string]: number };
  
  // Location Stats
  mostVisitedStates: Array<{ state: string; visitCount: number; distance: number }>;
  mostVisitedCounties: Array<{ county: string; state: string; visitCount: number; distance: number }>;
  mostVisitedCities: Array<{ city: string; state: string; visitCount: number; distance: number }>;
  
  // Trip Patterns
  longestTrip: Trip | null;
  shortestTrip: Trip | null;
  fastestTrip: Trip | null; // highest average speed
  slowestTrip: Trip | null; // lowest average speed
  
  // Time Analysis
  busiestDay: string | null; // day of week
  busiestHour: number | null; // hour of day (0-23)
  busiestMonth: string | null;
  
  // Location Insights
  uniqueStatesVisited: number;
  uniqueCountiesVisited: number;
  uniqueCitiesVisited: number;
  
  // Explorer Integration
  explorerStats: {
    statesVisited: number;
    countiesVisited: number;
    citiesVisited: number;
    highwaysTraveled: number;
  };
}

class AnalyticsService {
  /**
   * Calculate comprehensive travel statistics
   */
  async calculateStatistics(): Promise<TravelStatistics> {
    // Ensure explorer service is initialized before getting stats
    try {
      await explorerService.initialize();
    } catch (error) {
      console.warn('[Analytics] Failed to initialize explorer service:', error);
    }
    
    const trips = await getTrips();
    const explorerStats = explorerService.getStats();

    if (trips.length === 0) {
      return this.getEmptyStatistics(explorerStats);
    }

    // Calculate basic stats
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.meters || 0), 0);
    const totalTime = trips.reduce((sum, trip) => {
      if (trip.startTs && trip.endTs) {
        const duration = (trip.endTs - trip.startTs) / 1000; // Convert to seconds
        const paused = trip.pausedAccum || 0;
        return sum + (duration - paused / 1000);
      }
      return sum;
    }, 0);

    const averageSpeed = totalTime > 0 ? totalDistance / totalTime : 0;
    const averageTripDistance = totalDistance / trips.length;
    const averageTripDuration = totalTime / trips.length;

    // Time-based analysis
    const tripsByDay = this.calculateTripsByDay(trips);
    const tripsByWeek = this.calculateTripsByWeek(trips);
    const tripsByMonth = this.calculateTripsByMonth(trips);
    const distanceByDay = this.calculateDistanceByDay(trips);
    const distanceByMonth = this.calculateDistanceByMonth(trips);

    // Location analysis
    const locationStats = await this.calculateLocationStats(trips);

    // Trip patterns
    const { longestTrip, shortestTrip, fastestTrip, slowestTrip } = this.findTripPatterns(trips);

    // Time analysis
    const busiestDay = this.findBusiestDay(trips);
    const busiestHour = this.findBusiestHour(trips);
    const busiestMonth = this.findBusiestMonth(trips);

    // Unique locations
    const uniqueLocations = await this.calculateUniqueLocations(trips);

    return {
      totalTrips: trips.length,
      totalDistance,
      totalTime,
      averageSpeed,
      averageTripDistance,
      averageTripDuration,
      tripsByDay,
      tripsByWeek,
      tripsByMonth,
      distanceByDay,
      distanceByMonth,
      mostVisitedStates: locationStats.states,
      mostVisitedCounties: locationStats.counties,
      mostVisitedCities: locationStats.cities,
      longestTrip,
      shortestTrip,
      fastestTrip,
      slowestTrip,
      busiestDay,
      busiestHour,
      busiestMonth,
      uniqueStatesVisited: uniqueLocations.states,
      uniqueCountiesVisited: uniqueLocations.counties,
      uniqueCitiesVisited: uniqueLocations.cities,
      explorerStats: {
        statesVisited: explorerStats.statesVisited,
        countiesVisited: explorerStats.countiesVisited,
        citiesVisited: explorerStats.citiesVisited,
        highwaysTraveled: explorerStats.highwaysVisited || 0,
      },
    };
  }

  /**
   * Calculate trips grouped by day
   */
  private calculateTripsByDay(trips: Trip[]): { [date: string]: number } {
    const byDay: { [date: string]: number } = {};
    
    trips.forEach(trip => {
      if (trip.startTs) {
        const date = new Date(trip.startTs).toISOString().split('T')[0];
        byDay[date] = (byDay[date] || 0) + 1;
      }
    });

    return byDay;
  }

  /**
   * Calculate trips grouped by week
   */
  private calculateTripsByWeek(trips: Trip[]): { [week: string]: number } {
    const byWeek: { [week: string]: number } = {};
    
    trips.forEach(trip => {
      if (trip.startTs) {
        const date = new Date(trip.startTs);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
      }
    });

    return byWeek;
  }

  /**
   * Calculate trips grouped by month
   */
  private calculateTripsByMonth(trips: Trip[]): { [month: string]: number } {
    const byMonth: { [month: string]: number } = {};
    
    trips.forEach(trip => {
      if (trip.startTs) {
        const date = new Date(trip.startTs);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
      }
    });

    return byMonth;
  }

  /**
   * Calculate distance by day
   */
  private calculateDistanceByDay(trips: Trip[]): { [date: string]: number } {
    const byDay: { [date: string]: number } = {};
    
    trips.forEach(trip => {
      if (trip.startTs && trip.meters) {
        const date = new Date(trip.startTs).toISOString().split('T')[0];
        byDay[date] = (byDay[date] || 0) + trip.meters;
      }
    });

    return byDay;
  }

  /**
   * Calculate distance by month
   */
  private calculateDistanceByMonth(trips: Trip[]): { [month: string]: number } {
    const byMonth: { [month: string]: number } = {};
    
    trips.forEach(trip => {
      if (trip.startTs && trip.meters) {
        const date = new Date(trip.startTs);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + trip.meters;
      }
    });

    return byMonth;
  }

  /**
   * Calculate location statistics
   */
  private async calculateLocationStats(trips: Trip[]): Promise<{
    states: Array<{ state: string; visitCount: number; distance: number }>;
    counties: Array<{ county: string; state: string; visitCount: number; distance: number }>;
    cities: Array<{ city: string; state: string; visitCount: number; distance: number }>;
  }> {
    const stateMap = new Map<string, { visitCount: number; distance: number }>();
    const countyMap = new Map<string, { county: string; state: string; visitCount: number; distance: number }>();
    const cityMap = new Map<string, { city: string; state: string; visitCount: number; distance: number }>();

    // Sample trips to avoid too many geocoding calls (use start and end points)
    const sampleSize = Math.min(trips.length, 100); // Limit to 100 trips for performance
    const sampledTrips = trips.slice(0, sampleSize);

    for (const trip of sampledTrips) {
      if (!trip.path || trip.path.length === 0) continue;

      // Get start and end locations
      const startPoint = trip.path[0];
      const endPoint = trip.path[trip.path.length - 1];

      try {
        // Geocode start point
        const startInfo = await reverseGeocodingService.getLocationInfo({
          latitude: startPoint.latitude,
          longitude: startPoint.longitude,
        });

        if (startInfo.state && startInfo.state !== 'Unknown') {
          const key = startInfo.state;
          const existing = stateMap.get(key) || { visitCount: 0, distance: 0 };
          stateMap.set(key, {
            visitCount: existing.visitCount + 1,
            distance: existing.distance + (trip.meters || 0) / 2, // Split distance between start/end
          });
        }

        if (startInfo.state && startInfo.city && startInfo.city !== 'Unknown') {
          const key = `${startInfo.city}, ${startInfo.stateCode}`;
          const existing = cityMap.get(key) || { city: startInfo.city, state: startInfo.stateCode, visitCount: 0, distance: 0 };
          cityMap.set(key, {
            ...existing,
            visitCount: existing.visitCount + 1,
            distance: existing.distance + (trip.meters || 0) / 2,
          });
        }

        // Geocode end point
        const endInfo = await reverseGeocodingService.getLocationInfo({
          latitude: endPoint.latitude,
          longitude: endPoint.longitude,
        });

        if (endInfo.state && endInfo.state !== 'Unknown') {
          const key = endInfo.state;
          const existing = stateMap.get(key) || { visitCount: 0, distance: 0 };
          stateMap.set(key, {
            visitCount: existing.visitCount + 1,
            distance: existing.distance + (trip.meters || 0) / 2,
          });
        }

        if (endInfo.state && endInfo.city && endInfo.city !== 'Unknown') {
          const key = `${endInfo.city}, ${endInfo.stateCode}`;
          const existing = cityMap.get(key) || { city: endInfo.city, state: endInfo.stateCode, visitCount: 0, distance: 0 };
          cityMap.set(key, {
            ...existing,
            visitCount: existing.visitCount + 1,
            distance: existing.distance + (trip.meters || 0) / 2,
          });
        }
      } catch (error) {
        console.warn('[Analytics] Failed to geocode trip location:', error);
      }
    }

    // Convert to arrays and sort
    const states = Array.from(stateMap.entries())
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);

    const counties = Array.from(countyMap.values())
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);

    const cities = Array.from(cityMap.values())
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 10);

    return { states, counties, cities };
  }

  /**
   * Find trip patterns (longest, shortest, fastest, slowest)
   */
  private findTripPatterns(trips: Trip[]): {
    longestTrip: Trip | null;
    shortestTrip: Trip | null;
    fastestTrip: Trip | null;
    slowestTrip: Trip | null;
  } {
    if (trips.length === 0) {
      return { longestTrip: null, shortestTrip: null, fastestTrip: null, slowestTrip: null };
    }

    let longestTrip = trips[0];
    let shortestTrip = trips[0];
    let fastestTrip: Trip | null = null;
    let slowestTrip: Trip | null = null;
    let maxSpeed = 0;
    let minSpeed = Infinity;

    trips.forEach(trip => {
      // Longest/shortest by distance
      if (trip.meters > (longestTrip.meters || 0)) {
        longestTrip = trip;
      }
      if (trip.meters < (shortestTrip.meters || Infinity)) {
        shortestTrip = trip;
      }

      // Fastest/slowest by average speed
      if (trip.startTs && trip.endTs) {
        const duration = (trip.endTs - trip.startTs) / 1000;
        const paused = (trip.pausedAccum || 0) / 1000;
        const activeTime = duration - paused;
        if (activeTime > 0 && trip.meters) {
          const speed = trip.meters / activeTime;
          if (speed > maxSpeed) {
            maxSpeed = speed;
            fastestTrip = trip;
          }
          if (speed < minSpeed) {
            minSpeed = speed;
            slowestTrip = trip;
          }
        }
      }
    });

    return { longestTrip, shortestTrip, fastestTrip, slowestTrip };
  }

  /**
   * Find busiest day of week
   */
  private findBusiestDay(trips: Trip[]): string | null {
    const dayCounts: { [day: string]: number } = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    trips.forEach(trip => {
      if (trip.startTs) {
        const day = new Date(trip.startTs).toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    const busiest = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    return busiest && busiest[1] > 0 ? busiest[0] : null;
  }

  /**
   * Find busiest hour of day
   */
  private findBusiestHour(trips: Trip[]): number | null {
    const hourCounts: { [hour: number]: number } = {};

    trips.forEach(trip => {
      if (trip.startTs) {
        const hour = new Date(trip.startTs).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const busiest = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    return busiest ? parseInt(busiest[0]) : null;
  }

  /**
   * Find busiest month
   */
  private findBusiestMonth(trips: Trip[]): string | null {
    const monthCounts: { [month: string]: number } = {};

    trips.forEach(trip => {
      if (trip.startTs) {
        const date = new Date(trip.startTs);
        const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      }
    });

    const busiest = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
    return busiest && busiest[1] > 0 ? busiest[0] : null;
  }

  /**
   * Calculate unique locations visited
   * Uses explorer stats for accurate counts (faster and more accurate)
   */
  private async calculateUniqueLocations(trips: Trip[]): Promise<{
    states: number;
    counties: number;
    cities: number;
  }> {
    // Use explorer stats for accurate counts instead of geocoding
    // This is faster and more accurate since explorer tracks all visits
    const explorerStats = explorerService.getStats();
    
    return {
      states: explorerStats.statesVisited,
      counties: explorerStats.countiesVisited,
      cities: explorerStats.citiesVisited,
    };
  }

  /**
   * Get empty statistics structure
   */
  private getEmptyStatistics(explorerStats: any): TravelStatistics {
    return {
      totalTrips: 0,
      totalDistance: 0,
      totalTime: 0,
      averageSpeed: 0,
      averageTripDistance: 0,
      averageTripDuration: 0,
      tripsByDay: {},
      tripsByWeek: {},
      tripsByMonth: {},
      distanceByDay: {},
      distanceByMonth: {},
      mostVisitedStates: [],
      mostVisitedCounties: [],
      mostVisitedCities: [],
      longestTrip: null,
      shortestTrip: null,
      fastestTrip: null,
      slowestTrip: null,
      busiestDay: null,
      busiestHour: null,
      busiestMonth: null,
      uniqueStatesVisited: 0,
      uniqueCountiesVisited: 0,
      uniqueCitiesVisited: 0,
      explorerStats: {
        statesVisited: explorerStats.statesVisited || 0,
        countiesVisited: explorerStats.countiesVisited || 0,
        citiesVisited: explorerStats.citiesVisited || 0,
        highwaysTraveled: explorerStats.highwaysVisited || 0,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();

