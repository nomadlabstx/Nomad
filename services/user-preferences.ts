/**
 * User Preferences Service
 * Manages user preferences for agentic AI personalization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserPreferences, RPGOverlaySettings } from '../types/user-preferences';
import { DEFAULT_PREFERENCES, DEFAULT_RPG_OVERLAY_SETTINGS } from '../types/user-preferences';

const PREFERENCES_KEY = '@nomad_user_preferences';

function mergeWithDefaults(stored: Partial<UserPreferences> | null): UserPreferences {
  if (!stored) {
    return { ...DEFAULT_PREFERENCES, lastUpdated: Date.now() };
  }

  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    food: { ...DEFAULT_PREFERENCES.food, ...(stored.food ?? {}) },
    activities: { ...DEFAULT_PREFERENCES.activities, ...(stored.activities ?? {}) },
    travel: { ...DEFAULT_PREFERENCES.travel, ...(stored.travel ?? {}) },
    accommodation: {
      ...DEFAULT_PREFERENCES.accommodation,
      ...(stored.accommodation ?? {}),
      budgetPerNight: {
        ...DEFAULT_PREFERENCES.accommodation.budgetPerNight,
        ...(stored.accommodation?.budgetPerNight ?? {}),
      },
    },
    rpgOverlay: {
      ...DEFAULT_RPG_OVERLAY_SETTINGS,
      ...(stored.rpgOverlay ?? {}),
    },
    lastUpdated: stored.lastUpdated ?? Date.now(),
  };
}

class UserPreferencesService {
  private preferences: UserPreferences | null = null;

  /**
   * Initialize preferences from storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        this.preferences = mergeWithDefaults(JSON.parse(stored));
      } else {
        this.preferences = mergeWithDefaults(null);
        await this.save();
      }
    } catch (error) {
      console.error('[UserPreferences] Failed to initialize:', error);
      this.preferences = mergeWithDefaults(null);
    }
  }

  /**
   * Save preferences to storage
   */
  private async save(): Promise<void> {
    if (!this.preferences) return;

    try {
      this.preferences.lastUpdated = Date.now();
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('[UserPreferences] Failed to save:', error);
    }
  }

  /**
   * Get all preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    if (!this.preferences) await this.initialize();
    return this.preferences ?? mergeWithDefaults(null);
  }

  /**
   * Update food preferences
   */
  async updateFoodPreferences(food: Partial<UserPreferences['food']>): Promise<void> {
    if (!this.preferences) await this.initialize();
    if (!this.preferences) return;

    this.preferences.food = {
      ...this.preferences.food,
      ...food,
    };
    await this.save();
  }

  /**
   * Update activity preferences
   */
  async updateActivityPreferences(activities: Partial<UserPreferences['activities']>): Promise<void> {
    if (!this.preferences) await this.initialize();
    if (!this.preferences) return;

    this.preferences.activities = {
      ...this.preferences.activities,
      ...activities,
    };
    await this.save();
  }

  /**
   * Update travel preferences
   */
  async updateTravelPreferences(travel: Partial<UserPreferences['travel']>): Promise<void> {
    if (!this.preferences) await this.initialize();
    if (!this.preferences) return;

    this.preferences.travel = {
      ...this.preferences.travel,
      ...travel,
    };
    await this.save();
  }

  /**
   * Update accommodation preferences
   */
  async updateAccommodationPreferences(accommodation: Partial<UserPreferences['accommodation']>): Promise<void> {
    if (!this.preferences) await this.initialize();
    if (!this.preferences) return;

    this.preferences.accommodation = {
      ...this.preferences.accommodation,
      ...accommodation,
    };
    await this.save();
  }

  /**
   * Update AI settings
   */
  async updateAISettings(settings: {
    aiPersonality?: UserPreferences['aiPersonality'];
    rememberPastTrips?: boolean;
    proactiveSuggestions?: boolean;
  }): Promise<void> {
    if (!this.preferences) await this.initialize();
    if (!this.preferences) return;

    if (settings.aiPersonality) this.preferences.aiPersonality = settings.aiPersonality;
    if (settings.rememberPastTrips !== undefined) this.preferences.rememberPastTrips = settings.rememberPastTrips;
    if (settings.proactiveSuggestions !== undefined) this.preferences.proactiveSuggestions = settings.proactiveSuggestions;
    
    await this.save();
  }

  /**
   * Get AI context string for prompts
   */
  async getAIContextString(): Promise<string> {
    const prefs = await this.getPreferences();
    
    let context = '\n**USER PREFERENCES (Remember these for all suggestions):**\n\n';

    // Food preferences
    if (prefs.food.cuisines.length > 0) {
      context += `**Favorite Cuisines:** ${prefs.food.cuisines.join(', ')}\n`;
    }
    if (prefs.food.dietaryRestrictions.length > 0) {
      context += `**Dietary Restrictions:** ${prefs.food.dietaryRestrictions.join(', ')}\n`;
    }
    if (prefs.food.favoriteRestaurants.length > 0) {
      context += `**Favorite Restaurants:** ${prefs.food.favoriteRestaurants.join(', ')}\n`;
    }
    if (prefs.food.avoidChains) {
      context += `**Restaurant Preference:** Avoid chain restaurants, prefer local establishments\n`;
    }
    context += `**Price Range:** ${prefs.food.priceRange}\n\n`;

    // Activity preferences
    if (prefs.activities.interests.length > 0) {
      context += `**Interests:** ${prefs.activities.interests.join(', ')}\n`;
    }
    context += `**Activity Style:** ${prefs.activities.outdoorVsIndoor === 'outdoor' ? 'Prefers outdoor activities' : prefs.activities.outdoorVsIndoor === 'indoor' ? 'Prefers indoor activities' : 'Enjoys both indoor and outdoor'}\n`;
    if (prefs.activities.familyFriendly) {
      context += `**Family Travel:** Traveling with family, needs family-friendly options\n`;
    }
    context += `**Adventure Level:** ${prefs.activities.adventureLevel}\n\n`;

    // Travel preferences
    if (prefs.travel.avoidTolls) context += `**Route Preference:** Avoid toll roads\n`;
    if (prefs.travel.avoidHighways) context += `**Route Preference:** Avoid highways when possible\n`;
    if (prefs.travel.scenicRoutes) context += `**Route Preference:** Prefer scenic routes\n`;
    if (prefs.travel.preferredStops.length > 0) {
      context += `**Preferred Stops:** ${prefs.travel.preferredStops.join(', ')}\n`;
    }
    context += `**Max Driving:** ${prefs.travel.maxDrivingHours} hours per day\n\n`;

    // Accommodation preferences
    if (prefs.accommodation.hotelChains.length > 0) {
      context += `**Preferred Hotels:** ${prefs.accommodation.hotelChains.join(', ')}\n`;
    }
    context += `**Hotel Budget:** $${prefs.accommodation.budgetPerNight.min}-${prefs.accommodation.budgetPerNight.max} per night\n`;
    if (prefs.accommodation.amenities.length > 0) {
      context += `**Required Amenities:** ${prefs.accommodation.amenities.join(', ')}\n`;
    }

    context += `\n**IMPORTANT:** Always consider these preferences when making recommendations. If the user hasn't specified preferences in a category, ask or make general suggestions.\n\n`;

    return context;
  }

  /**
   * Update RPG overlay settings
   */
  async updateRPGOverlaySettings(settings: Partial<RPGOverlaySettings>): Promise<void> {
    if (!this.preferences) await this.initialize();
    if (!this.preferences) return;

    this.preferences.rpgOverlay = {
      ...(this.preferences.rpgOverlay || DEFAULT_RPG_OVERLAY_SETTINGS),
      ...settings,
    };
    await this.save();
  }

  /**
   * Get RPG overlay settings
   */
  async getRPGOverlaySettings(): Promise<RPGOverlaySettings> {
    const prefs = await this.getPreferences();
    return prefs.rpgOverlay || DEFAULT_RPG_OVERLAY_SETTINGS;
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    await this.save();
  }
}

export const userPreferencesService = new UserPreferencesService();
export default userPreferencesService;

