/**
 * Achievement System Types
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';

export type AchievementCategory = 
  | 'explorer' // Cities, states, counties
  | 'navigator' // GPS usage, routes, navigation
  | 'highways' // Highway and exit tracking
  | 'distance' // Miles traveled
  | 'social' // Sharing, friends
  | 'special'; // Unique one-time achievements

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string; // Emoji or icon name
  requirement: number; // What number to reach
  currentProgress: number; // User's current progress
  unlocked: boolean;
  unlockedAt?: number; // Timestamp when unlocked
  hidden?: boolean; // Don't show until close to unlocking
  points: number; // Achievement points (for total score)
}

export interface AchievementProgress {
  totalAchievements: number;
  unlockedAchievements: number;
  completionPercent: number;
  totalPoints: number;
  currentPoints: number;
  level: number; // User level based on points
  nextLevelPoints: number;
}

export interface AchievementsData {
  achievements: Achievement[];
  progress: AchievementProgress;
  lastUpdated: number;
}

