/**
 * Planned Trips Service
 * Manages saved trip plans from AI
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlannedTrip, PlannedTripsData } from '../types/planned-trips';

const PLANNED_TRIPS_KEY = '@nomad_planned_trips';

class PlannedTripsService {
  private data: PlannedTripsData | null = null;

  /**
   * Initialize planned trips from storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PLANNED_TRIPS_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      } else {
        this.data = {
          trips: [],
          lastUpdated: Date.now(),
        };
      }
    } catch (error) {
      console.error('[PlannedTrips] Failed to initialize:', error);
      this.data = {
        trips: [],
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Save planned trips to storage
   */
  private async save(): Promise<void> {
    if (!this.data) return;

    try {
      this.data.lastUpdated = Date.now();
      await AsyncStorage.setItem(PLANNED_TRIPS_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('[PlannedTrips] Failed to save:', error);
    }
  }

  /**
   * Add a new planned trip
   */
  async addTrip(trip: Omit<PlannedTrip, 'id' | 'createdAt' | 'status'>): Promise<PlannedTrip> {
    if (!this.data) await this.initialize();

    const newTrip: PlannedTrip = {
      ...trip,
      id: `trip-${Date.now()}`,
      createdAt: Date.now(),
      status: 'planned',
    };

    this.data!.trips.unshift(newTrip); // Add to beginning
    await this.save();

    return newTrip;
  }

  /**
   * Get all planned trips
   */
  async getAllTrips(): Promise<PlannedTrip[]> {
    if (!this.data) await this.initialize();
    return this.data?.trips || [];
  }

  /**
   * Get trip by ID
   */
  async getTrip(id: string): Promise<PlannedTrip | null> {
    if (!this.data) await this.initialize();
    return this.data?.trips.find(t => t.id === id) || null;
  }

  /**
   * Update trip status
   */
  async updateTripStatus(id: string, status: PlannedTrip['status']): Promise<void> {
    if (!this.data) await this.initialize();
    
    const trip = this.data?.trips.find(t => t.id === id);
    if (trip) {
      trip.status = status;
      await this.save();
    }
  }

  /**
   * Delete a planned trip
   */
  async deleteTrip(id: string): Promise<void> {
    if (!this.data) await this.initialize();
    
    if (this.data) {
      this.data.trips = this.data.trips.filter(t => t.id !== id);
      await this.save();
    }
  }

  /**
   * Get trips by status
   */
  async getTripsByStatus(status: PlannedTrip['status']): Promise<PlannedTrip[]> {
    if (!this.data) await this.initialize();
    return this.data?.trips.filter(t => t.status === status) || [];
  }

  /**
   * Clear all trips
   */
  async clearAll(): Promise<void> {
    this.data = {
      trips: [],
      lastUpdated: Date.now(),
    };
    await this.save();
  }
}

export const plannedTripsService = new PlannedTripsService();
export default plannedTripsService;

