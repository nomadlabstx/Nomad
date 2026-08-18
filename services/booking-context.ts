/**
 * Booking Context Manager
 * Maintains booking context during conversation
 * Tracks active booking sessions and preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BookingContext, BookingType } from '../types/booking';

const BOOKING_CONTEXT_KEY = '@nomad_booking_context';

class BookingContextManager {
  private currentContext: BookingContext | null = null;

  /**
   * Initialize booking context from storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(BOOKING_CONTEXT_KEY);
      if (stored) {
        this.currentContext = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[BookingContext] Failed to initialize:', error);
      this.currentContext = null;
    }
  }

  /**
   * Get current booking context
   */
  getContext(): BookingContext | null {
    return this.currentContext;
  }

  /**
   * Start a new booking context
   */
  async startBooking(type: BookingType): Promise<BookingContext> {
    this.currentContext = {
      type,
      status: 'searching',
    };
    await this.save();
    return this.currentContext;
  }

  /**
   * Update booking context
   */
  async updateContext(updates: Partial<BookingContext>): Promise<BookingContext> {
    if (!this.currentContext) {
      // Start new context if none exists
      if (updates.type) {
        await this.startBooking(updates.type);
      } else {
        throw new Error('Cannot update context without type');
      }
    }

    this.currentContext = {
      ...this.currentContext!,
      ...updates,
    };
    await this.save();
    return this.currentContext;
  }

  /**
   * Set destination in context
   */
  async setDestination(name: string, location: { latitude: number; longitude: number }): Promise<void> {
    await this.updateContext({
      destination: {
        name,
        location,
      },
    });
  }

  /**
   * Set dates in context
   */
  async setDates(dates: BookingContext['dates']): Promise<void> {
    await this.updateContext({ dates });
  }

  /**
   * Set preferences in context
   */
  async setPreferences(preferences: BookingContext['preferences']): Promise<void> {
    await this.updateContext({ preferences });
  }

  /**
   * Set booking options
   */
  async setOptions(options: BookingContext['options']): Promise<void> {
    await this.updateContext({ options, status: 'reviewing' });
  }

  /**
   * Select a booking option
   */
  async selectOption(optionId: string): Promise<void> {
    if (!this.currentContext || !this.currentContext.options) {
      throw new Error('No options available to select');
    }

    const selectedOption = this.currentContext.options.find(opt => opt.id === optionId);
    if (!selectedOption) {
      throw new Error('Option not found');
    }

    await this.updateContext({
      selectedOption,
      status: 'confirming',
    });
  }

  /**
   * Complete booking context
   */
  async complete(): Promise<void> {
    if (this.currentContext) {
      await this.updateContext({ status: 'completed' });
      // Clear context after a delay to allow for review
      setTimeout(() => {
        this.clear();
      }, 5000);
    }
  }

  /**
   * Cancel booking context
   */
  async cancel(): Promise<void> {
    if (this.currentContext) {
      await this.updateContext({ status: 'cancelled' });
      this.clear();
    }
  }

  /**
   * Clear booking context
   */
  async clear(): Promise<void> {
    this.currentContext = null;
    try {
      await AsyncStorage.removeItem(BOOKING_CONTEXT_KEY);
    } catch (error) {
      console.error('[BookingContext] Failed to clear:', error);
    }
  }

  /**
   * Save context to storage
   */
  private async save(): Promise<void> {
    if (!this.currentContext) return;

    try {
      await AsyncStorage.setItem(BOOKING_CONTEXT_KEY, JSON.stringify(this.currentContext));
    } catch (error) {
      console.error('[BookingContext] Failed to save:', error);
    }
  }

  /**
   * Link booking context to a planned trip
   */
  async linkToTrip(tripId: string): Promise<void> {
    await this.updateContext({});
    // Store tripId separately for reference
    if (this.currentContext) {
      // Note: tripId will be stored in the booking itself, not the context
      // This is just for tracking during the booking flow
    }
  }
}

export const bookingContextManager = new BookingContextManager();
export default bookingContextManager;

