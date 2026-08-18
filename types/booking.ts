/**
 * Booking Types
 * For travel booking system using Expedia Group affiliate links
 */

import type { Coordinates } from './navigation';

/**
 * Booking status enum
 */
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'failed';

/**
 * Booking type enum
 */
export type BookingType = 'hotel' | 'flight' | 'car-rental' | 'activity';

/**
 * Base booking interface
 */
export interface Booking {
  id: string;
  type: BookingType;
  status: BookingStatus;
  createdAt: number;
  updatedAt: number;
  tripId?: string; // Link to PlannedTrip if applicable
  provider: 'expedia' | 'hotels.com' | 'vrbo' | 'travelocity' | 'orbitz';
  affiliateLink: string;
  confirmationNumber?: string;
  totalPrice?: number;
  currency?: string;
  checkInDate?: number; // Unix timestamp
  checkOutDate?: number; // Unix timestamp
  cancellationDeadline?: number; // Unix timestamp
  notes?: string;
}

/**
 * Hotel booking data
 */
export interface HotelBooking extends Booking {
  type: 'hotel';
  hotelName: string;
  location: Coordinates;
  address: string;
  city: string;
  state?: string;
  country: string;
  roomType?: string;
  guests?: number;
  amenities?: string[];
  rating?: number;
  reviewCount?: number;
}

/**
 * Flight booking data
 */
export interface FlightBooking extends Booking {
  type: 'flight';
  airline: string;
  flightNumber?: string;
  departure: {
    airport: string;
    airportCode: string;
    location: Coordinates;
    date: number; // Unix timestamp
    time: string; // e.g., "14:30"
  };
  arrival: {
    airport: string;
    airportCode: string;
    location: Coordinates;
    date: number; // Unix timestamp
    time: string; // e.g., "16:45"
  };
  passengers: number;
  class: 'economy' | 'premium-economy' | 'business' | 'first';
  stops: number;
  duration?: number; // minutes
}

/**
 * Car rental booking data
 */
export interface CarRentalBooking extends Booking {
  type: 'car-rental';
  rentalCompany: string;
  vehicleType: string;
  pickup: {
    location: Coordinates;
    address: string;
    date: number; // Unix timestamp
    time: string;
  };
  dropoff: {
    location: Coordinates;
    address: string;
    date: number; // Unix timestamp
    time: string;
  };
  insurance?: boolean;
  additionalDrivers?: number;
}

/**
 * Activity/tour booking data
 */
export interface ActivityBooking extends Booking {
  type: 'activity';
  activityName: string;
  location: Coordinates;
  address: string;
  date: number; // Unix timestamp
  time?: string;
  duration?: number; // minutes
  participants: number;
  category?: string; // e.g., "Tour", "Adventure", "Cultural"
}

/**
 * Booking option from search results
 * Used before booking is confirmed
 */
export interface BookingOption {
  id: string;
  type: BookingType;
  provider: Booking['provider'];
  title: string;
  description?: string;
  price: number;
  currency: string;
  affiliateLink: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  location?: Coordinates;
  details?: Record<string, any>; // Provider-specific details
  available: boolean;
}

/**
 * Booking context during conversation
 * Tracks what user is trying to book
 */
export interface BookingContext {
  type?: BookingType;
  destination?: {
    name: string;
    location: Coordinates;
  };
  dates?: {
    checkIn?: number;
    checkOut?: number;
    departure?: number;
    return?: number;
  };
  preferences?: {
    budget?: { min: number; max: number };
    guests?: number;
    passengers?: number;
    roomType?: string;
    vehicleType?: string;
    class?: FlightBooking['class'];
    amenities?: string[];
  };
  options?: BookingOption[];
  selectedOption?: BookingOption;
  status: 'searching' | 'reviewing' | 'confirming' | 'completed' | 'cancelled';
}

/**
 * Payment method (stored securely)
 */
export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple-pay' | 'google-pay';
  last4?: string; // Last 4 digits of card
  brand?: string; // e.g., "Visa", "Mastercard"
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: number;
}

