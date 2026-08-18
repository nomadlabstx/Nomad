/**
 * Achievement System Service
 * Tracks user progress and unlocks achievements
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Achievement, AchievementProgress, AchievementsData } from '../types/achievements';

const ACHIEVEMENTS_KEY = '@nomad_achievements';

// Define all achievements
const ALL_ACHIEVEMENTS: Omit<Achievement, 'currentProgress' | 'unlocked' | 'unlockedAt'>[] = [
  // EXPLORER CATEGORY
  { id: 'city-explorer-10', name: 'City Explorer', description: 'Visit 10 different cities', category: 'explorer', tier: 'bronze', icon: '🏙️', requirement: 10, points: 10 },
  { id: 'city-explorer-50', name: 'Urban Wanderer', description: 'Visit 50 different cities', category: 'explorer', tier: 'silver', icon: '🏙️', requirement: 50, points: 25 },
  { id: 'city-explorer-100', name: 'Metropolitan Master', description: 'Visit 100 different cities', category: 'explorer', tier: 'gold', icon: '🏙️', requirement: 100, points: 50 },
  { id: 'city-explorer-500', name: 'City Conqueror', description: 'Visit 500 different cities', category: 'explorer', tier: 'platinum', icon: '🏙️', requirement: 500, points: 150 },
  { id: 'city-explorer-1000', name: 'Urban Legend', description: 'Visit 1,000 different cities', category: 'explorer', tier: 'diamond', icon: '🏙️', requirement: 1000, points: 300 },
  
  { id: 'county-collector-5', name: 'County Hopper', description: 'Visit 5 different counties', category: 'explorer', tier: 'bronze', icon: '📍', requirement: 5, points: 10 },
  { id: 'county-collector-25', name: 'Regional Explorer', description: 'Visit 25 different counties', category: 'explorer', tier: 'silver', icon: '📍', requirement: 25, points: 25 },
  { id: 'county-collector-100', name: 'County Master', description: 'Visit 100 different counties', category: 'explorer', tier: 'gold', icon: '📍', requirement: 100, points: 75 },
  { id: 'county-collector-500', name: 'County Legend', description: 'Visit 500 different counties', category: 'explorer', tier: 'platinum', icon: '📍', requirement: 500, points: 200 },
  
  { id: 'state-hopper-5', name: 'State Hopper', description: 'Visit 5 different states', category: 'explorer', tier: 'bronze', icon: '🗺️', requirement: 5, points: 15 },
  { id: 'state-hopper-10', name: 'State Traveler', description: 'Visit 10 different states', category: 'explorer', tier: 'silver', icon: '🗺️', requirement: 10, points: 30 },
  { id: 'state-hopper-25', name: 'State Master', description: 'Visit 25 different states', category: 'explorer', tier: 'gold', icon: '🗺️', requirement: 25, points: 100 },
  { id: 'state-hopper-50', name: 'American Explorer', description: 'Visit all 50 states', category: 'explorer', tier: 'legendary', icon: '🇺🇸', requirement: 50, points: 500 },
  
  // NAVIGATOR CATEGORY
  { id: 'navigator-10', name: 'Getting Started', description: 'Complete 10 GPS navigations', category: 'navigator', tier: 'bronze', icon: '🧭', requirement: 10, points: 5 },
  { id: 'navigator-50', name: 'Road Warrior', description: 'Complete 50 GPS navigations', category: 'navigator', tier: 'silver', icon: '🧭', requirement: 50, points: 20 },
  { id: 'navigator-100', name: 'Navigation Pro', description: 'Complete 100 GPS navigations', category: 'navigator', tier: 'gold', icon: '🧭', requirement: 100, points: 50 },
  { id: 'navigator-500', name: 'Master Navigator', description: 'Complete 500 GPS navigations', category: 'navigator', tier: 'platinum', icon: '🧭', requirement: 500, points: 150 },
  
  { id: 'ai-planner-1', name: 'AI Pioneer', description: 'Use AI trip planning for the first time', category: 'navigator', tier: 'bronze', icon: '🤖', requirement: 1, points: 10 },
  { id: 'ai-planner-10', name: 'AI Enthusiast', description: 'Plan 10 trips with AI', category: 'navigator', tier: 'silver', icon: '🤖', requirement: 10, points: 25 },
  { id: 'ai-planner-50', name: 'AI Expert', description: 'Plan 50 trips with AI', category: 'navigator', tier: 'gold', icon: '🤖', requirement: 50, points: 75 },
  
  { id: 'multi-stop-10', name: 'Multi-Stop Explorer', description: 'Complete 10 multi-stop routes', category: 'navigator', tier: 'silver', icon: '🗺️', requirement: 10, points: 20 },
  
  // HIGHWAYS CATEGORY
  { id: 'highway-10', name: 'Highway Traveler', description: 'Travel on 10 different highways', category: 'highways', tier: 'bronze', icon: '🛣️', requirement: 10, points: 10 },
  { id: 'highway-50', name: 'Interstate Explorer', description: 'Travel on 50 different highways', category: 'highways', tier: 'silver', icon: '🛣️', requirement: 50, points: 40 },
  { id: 'highway-100', name: 'Highway Master', description: 'Travel on 100 different highways', category: 'highways', tier: 'gold', icon: '🛣️', requirement: 100, points: 100 },
  
  { id: 'exit-explorer-25', name: 'Exit Explorer', description: 'Visit 25 highway exits', category: 'highways', tier: 'bronze', icon: '🚗', requirement: 25, points: 15 },
  { id: 'exit-explorer-100', name: 'Exit Hunter', description: 'Visit 100 highway exits', category: 'highways', tier: 'silver', icon: '🚗', requirement: 100, points: 50 },
  { id: 'exit-explorer-500', name: 'Exit Legend', description: 'Visit 500 highway exits', category: 'highways', tier: 'gold', icon: '🚗', requirement: 500, points: 150 },
  
  // DISTANCE CATEGORY
  { id: 'distance-100', name: 'First Century', description: 'Travel 100 miles', category: 'distance', tier: 'bronze', icon: '🚙', requirement: 100, points: 5 },
  { id: 'distance-1000', name: 'Thousand Miles', description: 'Travel 1,000 miles', category: 'distance', tier: 'silver', icon: '🚙', requirement: 1000, points: 20 },
  { id: 'distance-10000', name: 'Ten Thousand Miles', description: 'Travel 10,000 miles', category: 'distance', tier: 'gold', icon: '🚙', requirement: 10000, points: 100 },
  { id: 'distance-50000', name: 'Road Warrior', description: 'Travel 50,000 miles', category: 'distance', tier: 'platinum', icon: '🚙', requirement: 50000, points: 300 },
  { id: 'distance-100000', name: 'Century Traveler', description: 'Travel 100,000 miles', category: 'distance', tier: 'diamond', icon: '🚙', requirement: 100000, points: 500 },
  
  // SOCIAL CATEGORY
  { id: 'first-share', name: 'First Share', description: 'Share your first trip', category: 'social', tier: 'bronze', icon: '📤', requirement: 1, points: 5 },
  { id: 'social-butterfly', name: 'Social Butterfly', description: 'Share 25 trips', category: 'social', tier: 'silver', icon: '📤', requirement: 25, points: 25 },
  
  // SPECIAL CATEGORY
  { id: 'first-trip', name: 'First Journey', description: 'Complete your first recorded trip', category: 'special', tier: 'bronze', icon: '✨', requirement: 1, points: 10 },
  { id: 'texas-complete', name: 'Texas Ranger', description: 'Visit all 254 Texas counties', category: 'special', tier: 'legendary', icon: '🤠', requirement: 254, points: 1000, hidden: true },
  { id: 'usa-complete', name: 'American Explorer', description: 'Visit all 50 US states', category: 'special', tier: 'legendary', icon: '🇺🇸', requirement: 50, points: 2000, hidden: true },
];

class AchievementsService {
  private data: AchievementsData | null = null;

  /**
   * Initialize achievements from storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
      
      if (stored) {
        this.data = JSON.parse(stored);
        // Merge with any new achievements that were added
        this.mergeNewAchievements();
      } else {
        // Create fresh achievement data
        this.data = {
          achievements: ALL_ACHIEVEMENTS.map(a => ({
            ...a,
            currentProgress: 0,
            unlocked: false,
          })),
          progress: {
            totalAchievements: ALL_ACHIEVEMENTS.length,
            unlockedAchievements: 0,
            completionPercent: 0,
            totalPoints: ALL_ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0),
            currentPoints: 0,
            level: 1,
            nextLevelPoints: 100,
          },
          lastUpdated: Date.now(),
        };
        await this.save();
      }
    } catch (error) {
      console.error('[Achievements] Failed to initialize:', error);
    }
  }

  /**
   * Merge new achievements with existing data
   */
  private mergeNewAchievements(): void {
    if (!this.data) return;

    for (const template of ALL_ACHIEVEMENTS) {
      const exists = this.data.achievements.find(a => a.id === template.id);
      if (!exists) {
        this.data.achievements.push({
          ...template,
          currentProgress: 0,
          unlocked: false,
        });
      }
    }

    this.recalculateProgress();
  }

  /**
   * Save achievements to storage
   */
  private async save(): Promise<void> {
    if (!this.data) return;

    try {
      this.data.lastUpdated = Date.now();
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('[Achievements] Failed to save:', error);
    }
  }

  /**
   * Update achievement progress
   */
  async updateProgress(achievementId: string, newProgress: number): Promise<Achievement | null> {
    if (!this.data) await this.initialize();
    if (!this.data) return null;

    const achievement = this.data.achievements.find(a => a.id === achievementId);
    if (!achievement) return null;

    const oldProgress = achievement.currentProgress;
    achievement.currentProgress = newProgress;

    // Check if achievement should be unlocked
    if (!achievement.unlocked && newProgress >= achievement.requirement) {
      achievement.unlocked = true;
      achievement.unlockedAt = Date.now();
      this.recalculateProgress();
      await this.save();
      return achievement; // Return newly unlocked achievement
    }

    if (oldProgress !== newProgress) {
      await this.save();
    }

    return null; // Not unlocked
  }

  /**
   * Add to existing progress instead of replacing it.
   */
  async incrementProgress(achievementId: string, amount: number = 1): Promise<Achievement | null> {
    if (!this.data) await this.initialize();
    if (!this.data) return null;

    const achievement = this.data.achievements.find(a => a.id === achievementId);
    const current = achievement?.currentProgress ?? 0;
    return this.updateProgress(achievementId, current + amount);
  }

  /**
   * Recalculate overall progress
   */
  private recalculateProgress(): void {
    if (!this.data) return;

    const unlocked = this.data.achievements.filter(a => a.unlocked);
    const currentPoints = unlocked.reduce((sum, a) => sum + a.points, 0);
    const level = Math.floor(currentPoints / 100) + 1;
    const nextLevelPoints = level * 100;

    this.data.progress = {
      totalAchievements: this.data.achievements.length,
      unlockedAchievements: unlocked.length,
      completionPercent: Math.round((unlocked.length / this.data.achievements.length) * 100),
      totalPoints: this.data.achievements.reduce((sum, a) => sum + a.points, 0),
      currentPoints,
      level,
      nextLevelPoints,
    };
  }

  /**
   * Get all achievements
   */
  async getAllAchievements(): Promise<Achievement[]> {
    if (!this.data) await this.initialize();
    return this.data?.achievements || [];
  }

  /**
   * Get achievements by category
   */
  async getAchievementsByCategory(category: Achievement['category']): Promise<Achievement[]> {
    if (!this.data) await this.initialize();
    return this.data?.achievements.filter(a => a.category === category) || [];
  }

  /**
   * Get progress summary
   */
  async getProgress(): Promise<AchievementProgress> {
    if (!this.data) await this.initialize();
    return this.data?.progress || {
      totalAchievements: 0,
      unlockedAchievements: 0,
      completionPercent: 0,
      totalPoints: 0,
      currentPoints: 0,
      level: 1,
      nextLevelPoints: 100,
    };
  }

  /**
   * Get recently unlocked achievements
   */
  async getRecentlyUnlocked(limit: number = 5): Promise<Achievement[]> {
    if (!this.data) await this.initialize();
    
    return this.data?.achievements
      .filter(a => a.unlocked && a.unlockedAt)
      .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))
      .slice(0, limit) || [];
  }

  /**
   * Check for achievement unlocks based on stats
   */
  async checkAchievements(stats: {
    citiesVisited?: number;
    countiesVisited?: number;
    statesVisited?: number;
    highwaysVisited?: number;
    exitsVisited?: number;
    totalDistance?: number;
    completedNavigations?: number;
    aiTripsPlanned?: number;
    multiStopRoutes?: number;
  }): Promise<Achievement[]> {
    if (!this.data) await this.initialize();
    
    const newlyUnlocked: Achievement[] = [];

    // Update progress for all relevant achievements
    if (stats.citiesVisited !== undefined) {
      for (const id of ['city-explorer-10', 'city-explorer-50', 'city-explorer-100', 'city-explorer-500', 'city-explorer-1000']) {
        const unlocked = await this.updateProgress(id, stats.citiesVisited!);
        if (unlocked) newlyUnlocked.push(unlocked);
      }
    }

    if (stats.countiesVisited !== undefined) {
      for (const id of ['county-collector-5', 'county-collector-25', 'county-collector-100', 'county-collector-500']) {
        const unlocked = await this.updateProgress(id, stats.countiesVisited!);
        if (unlocked) newlyUnlocked.push(unlocked);
      }
    }

    if (stats.statesVisited !== undefined) {
      for (const id of ['state-hopper-5', 'state-hopper-10', 'state-hopper-25', 'state-hopper-50']) {
        const unlocked = await this.updateProgress(id, stats.statesVisited!);
        if (unlocked) newlyUnlocked.push(unlocked);
      }
    }

    if (stats.highwaysVisited !== undefined) {
      for (const id of ['highway-10', 'highway-50', 'highway-100']) {
        const unlocked = await this.updateProgress(id, stats.highwaysVisited!);
        if (unlocked) newlyUnlocked.push(unlocked);
      }
    }

    if (stats.completedNavigations !== undefined) {
      for (const id of ['navigator-10', 'navigator-50', 'navigator-100', 'navigator-500']) {
        const unlocked = await this.updateProgress(id, stats.completedNavigations!);
        if (unlocked) newlyUnlocked.push(unlocked);
      }
    }

    if (stats.aiTripsPlanned !== undefined) {
      for (const id of ['ai-planner-1', 'ai-planner-10', 'ai-planner-50']) {
        const unlocked = await this.updateProgress(id, stats.aiTripsPlanned!);
        if (unlocked) newlyUnlocked.push(unlocked);
      }
    }

    return newlyUnlocked;
  }
}

export const achievementsService = new AchievementsService();
export default achievementsService;

