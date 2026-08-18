/**
 * User Preferences Types
 * For agentic AI personalization
 */

export interface FoodPreferences {
  cuisines: string[]; // e.g., ["Mexican", "BBQ", "Italian"]
  dietaryRestrictions: string[]; // e.g., ["Vegetarian", "Gluten-free"]
  favoriteRestaurants: string[];
  avoidChains: boolean;
  priceRange: 'budget' | 'moderate' | 'upscale' | 'any';
}

export interface ActivityPreferences {
  interests: string[]; // e.g., ["Museums", "Hiking", "Shopping", "Sports"]
  outdoorVsIndoor: 'outdoor' | 'indoor' | 'both';
  familyFriendly: boolean;
  adventureLevel: 'relaxed' | 'moderate' | 'adventurous';
}

export interface TravelPreferences {
  avoidTolls: boolean;
  avoidHighways: boolean;
  scenicRoutes: boolean;
  preferredStops: string[]; // e.g., ["Buc-ee's", "Rest stops", "Scenic overlooks"]
  maxDrivingHours: number; // Preferred max hours per day
}

export interface AccommodationPreferences {
  hotelChains: string[]; // Preferred hotel brands
  budgetPerNight: { min: number; max: number };
  amenities: string[]; // e.g., ["Pool", "Gym", "Free breakfast"]
}

export interface FlightPreferences {
  preferredAirlines?: string[];
  preferredClass?: 'economy' | 'premium-economy' | 'business' | 'first';
  maxStops?: number;
  seatPreference?: 'window' | 'aisle' | 'middle';
}

export interface CarRentalPreferences {
  preferredCompanies?: string[];
  vehicleType?: 'economy' | 'compact' | 'mid-size' | 'full-size' | 'suv' | 'luxury';
  insurance?: boolean;
}

export interface RPGOverlaySettings {
  mode: 'everything' | 'major-only';
  showCities: boolean;
  showCounties: boolean;
  showStates: boolean;
  showHighways: boolean;
  showAchievements: boolean;
  showProgressBars: boolean;
  showStatsCard: boolean;
  showXPNotifications: boolean;
}

export interface UserPreferences {
  userId?: string;
  food: FoodPreferences;
  activities: ActivityPreferences;
  travel: TravelPreferences;
  accommodation: AccommodationPreferences;
  flight?: FlightPreferences;
  carRental?: CarRentalPreferences;
  aiPersonality: 'professional' | 'friendly' | 'casual' | 'enthusiastic';
  rememberPastTrips: boolean;
  proactiveSuggestions: boolean;
  rpgOverlay?: RPGOverlaySettings;
  lastUpdated: number;
}

export const DEFAULT_RPG_OVERLAY_SETTINGS: RPGOverlaySettings = {
  mode: 'everything',
  showCities: true,
  showCounties: true,
  showStates: true,
  showHighways: true,
  showAchievements: true,
  showProgressBars: true,
  showStatsCard: true,
  showXPNotifications: true,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  food: {
    cuisines: [],
    dietaryRestrictions: [],
    favoriteRestaurants: [],
    avoidChains: false,
    priceRange: 'any',
  },
  activities: {
    interests: [],
    outdoorVsIndoor: 'both',
    familyFriendly: false,
    adventureLevel: 'moderate',
  },
  travel: {
    avoidTolls: false,
    avoidHighways: false,
    scenicRoutes: false,
    preferredStops: [],
    maxDrivingHours: 8,
  },
  accommodation: {
    hotelChains: [],
    budgetPerNight: { min: 50, max: 200 },
    amenities: [],
  },
  aiPersonality: 'friendly',
  rememberPastTrips: true,
  proactiveSuggestions: true,
  rpgOverlay: DEFAULT_RPG_OVERLAY_SETTINGS,
  lastUpdated: Date.now(),
};

