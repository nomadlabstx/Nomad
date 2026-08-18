/**
 * Main Booking Service
 * Manages bookings, links them to trips, and provides booking management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking, BookingType } from '../types/booking';

const BOOKINGS_KEY = '@nomad_bookings';

interface BookingsData {
  bookings: Booking[];
  lastUpdated: number;
}

class BookingService {
  private bookings: Booking[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize bookings from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        const stored = await AsyncStorage.getItem(BOOKINGS_KEY);
        if (stored) {
          const data: BookingsData = JSON.parse(stored);
          this.bookings = data.bookings || [];
        } else {
          this.bookings = [];
          await this.save();
        }
      } catch (error) {
        console.error('[BookingService] Failed to initialize:', error);
        this.bookings = [];
      } finally {
        this.initialized = true;
      }
    })();

    await this.initPromise;
  }

  /**
   * Save bookings to storage
   */
  private async save(): Promise<void> {
    try {
      const data: BookingsData = {
        bookings: this.bookings,
        lastUpdated: Date.now(),
      };
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[BookingService] Failed to save:', error);
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
    if (!this.initialized) await this.initialize();
    const newBooking: Booking = {
      ...booking,
      id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.bookings.unshift(newBooking);
    await this.save();

    return newBooking;
  }

  /**
   * Get all bookings
   */
  async getAllBookings(): Promise<Booking[]> {
    if (!this.initialized) await this.initialize();
    return [...this.bookings];
  }

  /**
   * Get bookings by type
   */
  async getBookingsByType(type: BookingType): Promise<Booking[]> {
    if (!this.initialized) await this.initialize();
    return this.bookings.filter(b => b.type === type);
  }

  /**
   * Get bookings by status
   */
  async getBookingsByStatus(status: Booking['status']): Promise<Booking[]> {
    if (!this.initialized) await this.initialize();
    return this.bookings.filter(b => b.status === status);
  }

  /**
   * Get bookings for a trip
   */
  async getBookingsForTrip(tripId: string): Promise<Booking[]> {
    if (!this.initialized) await this.initialize();
    return this.bookings.filter(b => b.tripId === tripId);
  }

  /**
   * Get booking by ID
   */
  async getBooking(id: string): Promise<Booking | null> {
    if (!this.initialized) await this.initialize();
    return this.bookings.find(b => b.id === id) || null;
  }

  /**
   * Update booking
   */
  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    if (!this.initialized) await this.initialize();
    const index = this.bookings.findIndex(b => b.id === id);
    if (index === -1) return null;

    this.bookings[index] = {
      ...this.bookings[index],
      ...updates,
      updatedAt: Date.now(),
    };
    await this.save();

    return this.bookings[index];
  }

  /**
   * Cancel booking
   */
  async cancelBooking(id: string): Promise<boolean> {
    const booking = await this.getBooking(id);
    if (!booking) return false;

    await this.updateBooking(id, { status: 'cancelled' });
    return true;
  }

  /**
   * Delete booking
   */
  async deleteBooking(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    const index = this.bookings.findIndex(b => b.id === id);
    if (index === -1) return false;

    this.bookings.splice(index, 1);
    await this.save();
    return true;
  }

  /**
   * Link booking to trip
   */
  async linkBookingToTrip(bookingId: string, tripId: string): Promise<boolean> {
    return (await this.updateBooking(bookingId, { tripId })) !== null;
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(): Promise<Booking[]> {
    if (!this.initialized) await this.initialize();
    const now = Date.now();
    return this.bookings
      .filter(b => {
        if (b.status === 'cancelled' || b.status === 'completed') return false;
        const checkIn = b.checkInDate || (b as any).departure?.date;
        return checkIn && checkIn > now;
      })
      .sort((a, b) => {
        const dateA = a.checkInDate || (a as any).departure?.date || 0;
        const dateB = b.checkInDate || (b as any).departure?.date || 0;
        return dateA - dateB;
      });
  }

  /**
   * Get past bookings
   */
  async getPastBookings(): Promise<Booking[]> {
    if (!this.initialized) await this.initialize();
    const now = Date.now();
    return this.bookings
      .filter(b => {
        const checkOut = b.checkOutDate || (b as any).arrival?.date;
        return checkOut && checkOut < now;
      })
      .sort((a, b) => {
        const dateA = a.checkOutDate || (a as any).arrival?.date || 0;
        const dateB = b.checkOutDate || (b as any).arrival?.date || 0;
        return dateB - dateA;
      });
  }
}

export const bookingService = new BookingService();
export default bookingService;

