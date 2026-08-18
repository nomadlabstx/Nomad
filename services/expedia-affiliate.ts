/**
 * Expedia Group Affiliate Service
 * Generates affiliate links for Expedia Group brands
 * Supports: Expedia, Hotels.com, Vrbo, Travelocity, Orbitz
 */

const EXPEDIA_AFFILIATE_ID = process.env.EXPO_PUBLIC_EXPEDIA_AFFILIATE_ID || '';
const EXPEDIA_PARTNER_ID = process.env.EXPO_PUBLIC_EXPEDIA_PARTNER_ID || '';

export type ExpediaBrand = 'expedia' | 'hotels.com' | 'vrbo' | 'travelocity' | 'orbitz';

export interface AffiliateLinkParams {
  brand?: ExpediaBrand;
  destination?: string;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
  rooms?: number;
  departureDate?: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  origin?: string; // Airport code or city
  destinationAirport?: string; // Airport code
  latitude?: number;
  longitude?: number;
  activityId?: string;
  carPickupDate?: string;
  carDropoffDate?: string;
  carPickupLocation?: string;
  carDropoffLocation?: string;
}

class ExpediaAffiliateService {
  private baseUrls: Record<ExpediaBrand, string> = {
    expedia: 'https://www.expedia.com',
    'hotels.com': 'https://www.hotels.com',
    vrbo: 'https://www.vrbo.com',
    travelocity: 'https://www.travelocity.com',
    orbitz: 'https://www.orbitz.com',
  };

  /**
   * Generate hotel booking affiliate link
   */
  generateHotelLink(params: AffiliateLinkParams): string {
    const brand = params.brand || 'expedia';
    const baseUrl = this.baseUrls[brand];
    
    const urlParams = new URLSearchParams();
    
    if (params.destination) {
      urlParams.append('destination', params.destination);
    }
    
    if (params.checkIn) {
      urlParams.append('checkIn', params.checkIn);
    }
    
    if (params.checkOut) {
      urlParams.append('checkOut', params.checkOut);
    }
    
    if (params.adults) {
      urlParams.append('adults', params.adults.toString());
    }
    
    if (params.children) {
      urlParams.append('children', params.children.toString());
    }
    
    if (params.rooms) {
      urlParams.append('rooms', params.rooms.toString());
    }
    
    if (params.latitude && params.longitude) {
      urlParams.append('latlong', `${params.latitude},${params.longitude}`);
    }
    
    // Add affiliate tracking
    if (EXPEDIA_AFFILIATE_ID) {
      urlParams.append('affcid', EXPEDIA_AFFILIATE_ID);
    }
    
    if (EXPEDIA_PARTNER_ID) {
      urlParams.append('pid', EXPEDIA_PARTNER_ID);
    }
    
    // Add tracking parameters
    urlParams.append('wa', '1'); // Web affiliate
    urlParams.append('mc', 'us.en.usd'); // Market code
    
    const queryString = urlParams.toString();
    return queryString ? `${baseUrl}/Hotel-Search?${queryString}` : baseUrl;
  }

  /**
   * Generate flight booking affiliate link
   */
  generateFlightLink(params: AffiliateLinkParams): string {
    const brand = params.brand || 'expedia';
    const baseUrl = this.baseUrls[brand];
    
    const urlParams = new URLSearchParams();
    
    if (params.origin) {
      urlParams.append('origin', params.origin);
    }
    
    if (params.destinationAirport) {
      urlParams.append('destination', params.destinationAirport);
    }
    
    if (params.departureDate) {
      urlParams.append('departureDate', params.departureDate);
    }
    
    if (params.returnDate) {
      urlParams.append('returnDate', params.returnDate);
    }
    
    if (params.adults) {
      urlParams.append('adults', params.adults.toString());
    }
    
    if (params.children) {
      urlParams.append('children', params.children.toString());
    }
    
    // Add affiliate tracking
    if (EXPEDIA_AFFILIATE_ID) {
      urlParams.append('affcid', EXPEDIA_AFFILIATE_ID);
    }
    
    if (EXPEDIA_PARTNER_ID) {
      urlParams.append('pid', EXPEDIA_PARTNER_ID);
    }
    
    urlParams.append('wa', '1');
    urlParams.append('mc', 'us.en.usd');
    
    const queryString = urlParams.toString();
    return queryString ? `${baseUrl}/Flights-Search?${queryString}` : baseUrl;
  }

  /**
   * Generate car rental affiliate link
   */
  generateCarRentalLink(params: AffiliateLinkParams): string {
    const brand = params.brand || 'expedia';
    const baseUrl = this.baseUrls[brand];
    
    const urlParams = new URLSearchParams();
    
    if (params.carPickupLocation) {
      urlParams.append('pickupLocation', params.carPickupLocation);
    }
    
    if (params.carPickupDate) {
      urlParams.append('pickupDate', params.carPickupDate);
    }
    
    if (params.carDropoffDate) {
      urlParams.append('dropoffDate', params.carDropoffDate);
    }
    
    if (params.carDropoffLocation) {
      urlParams.append('dropoffLocation', params.carDropoffLocation);
    }
    
    if (params.latitude && params.longitude) {
      urlParams.append('latlong', `${params.latitude},${params.longitude}`);
    }
    
    // Add affiliate tracking
    if (EXPEDIA_AFFILIATE_ID) {
      urlParams.append('affcid', EXPEDIA_AFFILIATE_ID);
    }
    
    if (EXPEDIA_PARTNER_ID) {
      urlParams.append('pid', EXPEDIA_PARTNER_ID);
    }
    
    urlParams.append('wa', '1');
    urlParams.append('mc', 'us.en.usd');
    
    const queryString = urlParams.toString();
    return queryString ? `${baseUrl}/Cars?${queryString}` : baseUrl;
  }

  /**
   * Generate activity/tour affiliate link
   */
  generateActivityLink(params: AffiliateLinkParams): string {
    const brand = params.brand || 'expedia';
    const baseUrl = this.baseUrls[brand];
    
    const urlParams = new URLSearchParams();
    
    if (params.destination) {
      urlParams.append('destination', params.destination);
    }
    
    if (params.activityId) {
      urlParams.append('activityId', params.activityId);
    }
    
    if (params.latitude && params.longitude) {
      urlParams.append('latlong', `${params.latitude},${params.longitude}`);
    }
    
    // Add affiliate tracking
    if (EXPEDIA_AFFILIATE_ID) {
      urlParams.append('affcid', EXPEDIA_AFFILIATE_ID);
    }
    
    if (EXPEDIA_PARTNER_ID) {
      urlParams.append('pid', EXPEDIA_PARTNER_ID);
    }
    
    urlParams.append('wa', '1');
    urlParams.append('mc', 'us.en.usd');
    
    const queryString = urlParams.toString();
    return queryString ? `${baseUrl}/Activities?${queryString}` : baseUrl;
  }

  /**
   * Track affiliate click
   */
  trackClick(bookingType: 'hotel' | 'flight' | 'car-rental' | 'activity', link: string): void {
    // Track affiliate clicks for analytics
    console.log(`[ExpediaAffiliate] Click tracked: ${bookingType} - ${link}`);
    // In production, send to analytics service
  }

  /**
   * Track booking completion
   */
  trackBooking(bookingId: string, bookingType: string, revenue?: number): void {
    // Track completed bookings for commission tracking
    console.log(`[ExpediaAffiliate] Booking tracked: ${bookingId} - ${bookingType} - Revenue: ${revenue || 'N/A'}`);
    // In production, send to affiliate tracking service
  }
}

export const expediaAffiliateService = new ExpediaAffiliateService();
export default expediaAffiliateService;

