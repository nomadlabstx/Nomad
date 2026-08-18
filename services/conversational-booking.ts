/**
 * Conversational Booking Service
 * Parses booking intent from AI chat messages
 * Extracts booking details and generates affiliate links
 */

import type { BookingContext, BookingOption, BookingType } from '../types/booking';
import { bookingContextManager } from './booking-context';
import { expediaAffiliateService } from './expedia-affiliate';
import type { Coordinates } from './navigation';

interface BookingIntent {
  type: BookingType | null;
  confidence: number;
  details: {
    destination?: string;
    origin?: string;
    location?: Coordinates;
    checkIn?: Date;
    checkOut?: Date;
    departure?: Date;
    return?: Date;
    guests?: number;
    passengers?: number;
    budget?: { min: number; max: number };
  };
}

class ConversationalBookingService {
  /**
   * Parse booking intent from user message
   */
  parseBookingIntent(message: string, context?: { location?: Coordinates; currentDate?: Date }): BookingIntent {
    const lowerMessage = message.toLowerCase();
    const intent: BookingIntent = {
      type: null,
      confidence: 0,
      details: {},
    };

    // Detect booking type
    const hotelKeywords = ['hotel', 'accommodation', 'stay', 'lodging', 'room', 'book a room', 'reserve'];
    const flightKeywords = ['flight', 'fly', 'airplane', 'airline', 'ticket', 'book a flight'];
    const carKeywords = ['car rental', 'rent a car', 'vehicle', 'car hire'];
    const activityKeywords = ['tour', 'activity', 'excursion', 'experience', 'book a tour'];

    if (hotelKeywords.some(keyword => lowerMessage.includes(keyword))) {
      intent.type = 'hotel';
      intent.confidence = 0.8;
    } else if (flightKeywords.some(keyword => lowerMessage.includes(keyword))) {
      intent.type = 'flight';
      intent.confidence = 0.8;
    } else if (carKeywords.some(keyword => lowerMessage.includes(keyword))) {
      intent.type = 'car-rental';
      intent.confidence = 0.8;
    } else if (activityKeywords.some(keyword => lowerMessage.includes(keyword))) {
      intent.type = 'activity';
      intent.confidence = 0.8;
    }

    // Extract dates
    const datePatterns = [
      /(?:check in|check-in|arrive|arrival).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:check out|check-out|depart|departure).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}).*?(?:to|until|through).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            if (pattern.source.includes('check in') || pattern.source.includes('arrive')) {
              intent.details.checkIn = date;
            } else if (pattern.source.includes('check out') || pattern.source.includes('depart')) {
              intent.details.checkOut = date;
            } else if (match[2]) {
              intent.details.checkIn = new Date(match[1]);
              intent.details.checkOut = new Date(match[2]);
            }
          }
        } catch (e) {
          // Invalid date format
        }
      }
    }

    // Extract guest/passenger count
    const guestMatch = message.match(/(\d+)\s*(?:guests?|people|adults?|persons?)/i);
    if (guestMatch) {
      const count = parseInt(guestMatch[1], 10);
      if (intent.type === 'flight') {
        intent.details.passengers = count;
      } else {
        intent.details.guests = count;
      }
    }

    // Extract destination
    const fromToMatch = message.match(
      /\bfrom\s+([A-Za-z][A-Za-z.\s]{1,40}?)\s+to\s+([A-Za-z][A-Za-z.\s]{1,40}?)(?:\s|$|,|\.)/i
    );
    if (fromToMatch) {
      intent.details.origin = fromToMatch[1].trim();
      intent.details.destination = fromToMatch[2].trim();
    }

    const destinationPatterns = [
      /(?:in|at|to|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s+(?:hotel|flight|car|tour)/i,
    ];

    if (!intent.details.destination) {
      for (const pattern of destinationPatterns) {
        const matches = [...message.matchAll(pattern)];
        if (matches.length > 0) {
          const destination = matches[matches.length - 1][1];
          if (destination && destination.length > 2 && destination.length < 50) {
            intent.details.destination = destination;
          }
        }
      }
    }

    // Extract budget
    const budgetMatch = message.match(/(?:budget|price|cost).*?(\$?\d+).*?(?:to|-|and).*?(\$?\d+)/i);
    if (budgetMatch) {
      const min = parseInt(budgetMatch[1].replace('$', ''), 10);
      const max = parseInt(budgetMatch[2].replace('$', ''), 10);
      if (!isNaN(min) && !isNaN(max)) {
        intent.details.budget = { min, max };
      }
    }

    return intent;
  }

  /**
   * Generate booking options with affiliate links
   */
  async generateBookingOptions(
    type: BookingType,
    details: BookingIntent['details']
  ): Promise<BookingOption[]> {
    const options: BookingOption[] = [];

    // Generate affiliate links for different providers
    const brands: Array<'expedia' | 'hotels.com' | 'vrbo' | 'travelocity' | 'orbitz'> = 
      ['expedia', 'hotels.com', 'travelocity'];

    for (const brand of brands) {
      let affiliateLink = '';

      if (type === 'hotel') {
        affiliateLink = expediaAffiliateService.generateHotelLink({
          brand,
          destination: details.destination,
          checkIn: details.checkIn?.toISOString().split('T')[0],
          checkOut: details.checkOut?.toISOString().split('T')[0],
          adults: details.guests || 2,
          latitude: details.location?.latitude,
          longitude: details.location?.longitude,
        });
      } else if (type === 'flight') {
        affiliateLink = expediaAffiliateService.generateFlightLink({
          brand,
          origin: details.origin,
          destinationAirport: details.destination,
          departureDate: details.departure?.toISOString().split('T')[0],
          returnDate: details.return?.toISOString().split('T')[0],
          adults: details.passengers || 1,
        });
      } else if (type === 'car-rental') {
        affiliateLink = expediaAffiliateService.generateCarRentalLink({
          brand,
          carPickupLocation: details.destination,
          carPickupDate: details.checkIn?.toISOString().split('T')[0],
          carDropoffDate: details.checkOut?.toISOString().split('T')[0],
          latitude: details.location?.latitude,
          longitude: details.location?.longitude,
        });
      } else if (type === 'activity') {
        affiliateLink = expediaAffiliateService.generateActivityLink({
          brand,
          destination: details.destination,
          latitude: details.location?.latitude,
          longitude: details.location?.longitude,
        });
      }

      if (affiliateLink) {
        options.push({
          id: `${brand}-${type}-${Date.now()}`,
          type,
          provider: brand,
          title: `${brand.charAt(0).toUpperCase() + brand.slice(1)} ${type}`,
          description: `Search ${type} options on ${brand}`,
          price: 0, // Will be populated from search results
          currency: 'USD',
          affiliateLink,
          available: true,
        });
      }
    }

    return options;
  }

  /**
   * Process booking intent and update context
   */
  async processBookingIntent(intent: BookingIntent): Promise<BookingContext | null> {
    if (!intent.type || intent.confidence < 0.5) {
      return null;
    }

    // Start or update booking context
    let context = bookingContextManager.getContext();
    if (!context || context.status === 'completed' || context.status === 'cancelled') {
      context = await bookingContextManager.startBooking(intent.type);
    } else {
      await bookingContextManager.updateContext({ type: intent.type });
    }

    // Update context with extracted details
    if (intent.details.destination) {
      await bookingContextManager.setDestination(
        intent.details.destination,
        intent.details.location || { latitude: 0, longitude: 0 }
      );
    }

    if (intent.details.checkIn || intent.details.checkOut) {
      await bookingContextManager.setDates({
        checkIn: intent.details.checkIn?.getTime(),
        checkOut: intent.details.checkOut?.getTime(),
        departure: intent.details.departure?.getTime(),
        return: intent.details.return?.getTime(),
      });
    }

    if (intent.details.budget || intent.details.guests || intent.details.passengers) {
      await bookingContextManager.setPreferences({
        budget: intent.details.budget,
        guests: intent.details.guests,
        passengers: intent.details.passengers,
      });
    }

    // Generate booking options
    const options = await this.generateBookingOptions(intent.type, intent.details);
    await bookingContextManager.setOptions(options);

    return bookingContextManager.getContext();
  }

  /**
   * Format booking suggestion message for AI
   */
  formatBookingSuggestion(context: BookingContext): string {
    if (!context.type || !context.options || context.options.length === 0) {
      return '';
    }

    const typeName = context.type.replace('-', ' ');
    const optionsText = context.options
      .map((opt, idx) => `${idx + 1}. ${opt.title} - ${opt.description}`)
      .join('\n');

    return `I found some ${typeName} options for you:\n\n${optionsText}\n\nWould you like me to show you more details about any of these?`;
  }
}

export const conversationalBookingService = new ConversationalBookingService();
export default conversationalBookingService;

