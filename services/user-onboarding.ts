/**
 * User Onboarding Service
 * Detects new users and conversationally collects preferences
 * No forms - everything through natural conversation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { userPreferencesService } from './user-preferences';
import type { UserPreferences } from '../types/user-preferences';

const USER_ONBOARDING_KEY = '@nomad_user_onboarding';
const FIRST_MESSAGE_KEY = '@nomad_first_message';

interface OnboardingState {
  isNewUser: boolean;
  onboardingComplete: boolean;
  questionsAsked: string[];
  preferencesCollected: Partial<UserPreferences>;
  lastQuestionTime?: number;
}

class UserOnboardingService {
  private onboardingState: OnboardingState | null = null;

  /**
   * Initialize onboarding service
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(USER_ONBOARDING_KEY);
      if (stored) {
        this.onboardingState = JSON.parse(stored);
      } else {
        // Check if this is first message
        const hasFirstMessage = await AsyncStorage.getItem(FIRST_MESSAGE_KEY);
        this.onboardingState = {
          isNewUser: !hasFirstMessage,
          onboardingComplete: false,
          questionsAsked: [],
          preferencesCollected: {},
        };
        await this.save();
      }
    } catch (error) {
      console.error('[UserOnboarding] Failed to initialize:', error);
      this.onboardingState = {
        isNewUser: true,
        onboardingComplete: false,
        questionsAsked: [],
        preferencesCollected: {},
      };
    }
  }

  /**
   * Check if user is new
   */
  isNewUser(): boolean {
    return this.onboardingState?.isNewUser ?? true;
  }

  /**
   * Mark first message as sent
   */
  async markFirstMessage(): Promise<void> {
    try {
      await AsyncStorage.setItem(FIRST_MESSAGE_KEY, 'true');
      if (this.onboardingState) {
        this.onboardingState.isNewUser = false;
        await this.save();
      }
    } catch (error) {
      console.error('[UserOnboarding] Failed to mark first message:', error);
    }
  }

  /**
   * Get next onboarding question based on context
   */
  getNextQuestion(context: {
    messageCount: number;
    conversationTopic?: string;
    hasTripHistory?: boolean;
  }): string | null {
    if (!this.onboardingState || this.onboardingState.onboardingComplete) {
      return null;
    }

    const { questionsAsked, preferencesCollected } = this.onboardingState;
    const { messageCount, conversationTopic, hasTripHistory } = context;

    // Don't ask too many questions at once - space them out
    const timeSinceLastQuestion = this.onboardingState.lastQuestionTime
      ? Date.now() - this.onboardingState.lastQuestionTime
      : Infinity;
    
    if (timeSinceLastQuestion < 30000) { // 30 seconds
      return null; // Too soon to ask another question
    }

    // First question: Ask about travel style if planning a trip
    if (questionsAsked.length === 0 && conversationTopic?.toLowerCase().includes('trip')) {
      return "I'd love to help you plan! Are you more into fast-paced adventures or relaxed, scenic drives?";
    }

    // Second question: Ask about budget if not mentioned
    if (questionsAsked.length === 1 && !preferencesCollected.accommodation?.budgetPerNight) {
      return "What's your typical budget for accommodations? Are you looking for budget-friendly options, mid-range, or something more upscale?";
    }

    // Third question: Ask about food preferences if planning a trip
    if (questionsAsked.length === 2 && conversationTopic?.toLowerCase().includes('trip')) {
      return "Any favorite cuisines or dietary preferences I should know about? I can suggest great local spots!";
    }

    // Fourth question: Ask about activities/interests
    if (questionsAsked.length === 3 && !preferencesCollected.activities?.interests?.length) {
      return "What kind of activities do you enjoy? Museums, hiking, shopping, sports, or something else?";
    }

    // Mark onboarding as complete after 4 questions
    if (questionsAsked.length >= 4) {
      this.onboardingState.onboardingComplete = true;
      this.save();
      return null;
    }

    return null;
  }

  /**
   * Record that a question was asked
   */
  async recordQuestion(question: string): Promise<void> {
    if (!this.onboardingState) await this.initialize();
    
    if (this.onboardingState) {
      this.onboardingState.questionsAsked.push(question);
      this.onboardingState.lastQuestionTime = Date.now();
      await this.save();
    }
  }

  /**
   * Extract preferences from user message
   */
  async extractPreferences(message: string): Promise<Partial<UserPreferences>> {
    const extracted: Partial<UserPreferences> = {};

    // Extract budget preferences
    const budgetMatch = message.match(/(budget|cheap|affordable|inexpensive|moderate|mid-range|upscale|luxury|expensive)/i);
    if (budgetMatch) {
      const budget = budgetMatch[0].toLowerCase();
      if (budget.includes('budget') || budget.includes('cheap') || budget.includes('affordable')) {
        extracted.accommodation = {
          ...extracted.accommodation,
          budgetPerNight: { min: 50, max: 100 },
        };
      } else if (budget.includes('moderate') || budget.includes('mid')) {
        extracted.accommodation = {
          ...extracted.accommodation,
          budgetPerNight: { min: 100, max: 200 },
        };
      } else if (budget.includes('upscale') || budget.includes('luxury')) {
        extracted.accommodation = {
          ...extracted.accommodation,
          budgetPerNight: { min: 200, max: 500 },
        };
      }
    }

    // Extract travel style
    if (message.match(/(fast|quick|direct|shortest)/i)) {
      extracted.travel = {
        ...extracted.travel,
        avoidTolls: false,
        avoidHighways: false,
      };
    } else if (message.match(/(scenic|beautiful|picturesque|relaxed)/i)) {
      extracted.travel = {
        ...extracted.travel,
        scenicRoutes: true,
      };
    }

    // Extract cuisine preferences
    const cuisines = ['mexican', 'italian', 'chinese', 'japanese', 'indian', 'bbq', 'seafood', 'vegetarian', 'vegan'];
    const foundCuisines = cuisines.filter(cuisine => 
      message.toLowerCase().includes(cuisine)
    );
    if (foundCuisines.length > 0) {
      extracted.food = {
        ...extracted.food,
        cuisines: foundCuisines,
      };
    }

    // Extract activity interests
    const activities = ['museums', 'hiking', 'shopping', 'sports', 'beaches', 'parks', 'nightlife'];
    const foundActivities = activities.filter(activity =>
      message.toLowerCase().includes(activity)
    );
    if (foundActivities.length > 0) {
      extracted.activities = {
        ...extracted.activities,
        interests: foundActivities,
      };
    }

    // Save extracted preferences
    if (Object.keys(extracted).length > 0) {
      await this.savePreferences(extracted);
    }

    return extracted;
  }

  /**
   * Save extracted preferences to user preferences
   */
  private async savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const currentPrefs = await userPreferencesService.getPreferences();
      
      // Merge preferences
      if (preferences.accommodation) {
        await userPreferencesService.updateAccommodationPreferences(preferences.accommodation);
      }
      if (preferences.travel) {
        await userPreferencesService.updateTravelPreferences(preferences.travel);
      }
      if (preferences.food) {
        await userPreferencesService.updateFoodPreferences(preferences.food);
      }
      if (preferences.activities) {
        await userPreferencesService.updateActivityPreferences(preferences.activities);
      }

      // Update onboarding state
      if (this.onboardingState) {
        this.onboardingState.preferencesCollected = {
          ...this.onboardingState.preferencesCollected,
          ...preferences,
        };
        await this.save();
      }
    } catch (error) {
      console.error('[UserOnboarding] Failed to save preferences:', error);
    }
  }

  /**
   * Check if onboarding is complete
   */
  isOnboardingComplete(): boolean {
    return this.onboardingState?.onboardingComplete ?? false;
  }

  /**
   * Save onboarding state
   */
  private async save(): Promise<void> {
    if (!this.onboardingState) return;

    try {
      await AsyncStorage.setItem(USER_ONBOARDING_KEY, JSON.stringify(this.onboardingState));
    } catch (error) {
      console.error('[UserOnboarding] Failed to save:', error);
    }
  }

  /**
   * Reset onboarding (for testing)
   */
  async reset(): Promise<void> {
    this.onboardingState = {
      isNewUser: true,
      onboardingComplete: false,
      questionsAsked: [],
      preferencesCollected: {},
    };
    await AsyncStorage.removeItem(USER_ONBOARDING_KEY);
    await AsyncStorage.removeItem(FIRST_MESSAGE_KEY);
  }
}

export const userOnboardingService = new UserOnboardingService();
export default userOnboardingService;

