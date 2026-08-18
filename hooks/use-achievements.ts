/**
 * Achievement Hook
 * Manages achievement tracking and updates
 */

import { useCallback, useState } from 'react';
import { achievementsService } from '../services/achievements';
import { explorerService } from '../services/explorer';
import type { Achievement } from '../types/achievements';

export function useAchievements() {
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  /**
   * Check for achievement unlocks
   */
  const checkAchievements = useCallback(async () => {
    try {
      // Get current stats from explorer
      const stats = explorerService.getStats();
      
      // Check for unlocks
      const unlocked = await achievementsService.checkAchievements({
        citiesVisited: stats.citiesVisited,
        countiesVisited: stats.countiesVisited || 0,
        statesVisited: stats.statesVisited,
      });

      if (unlocked.length > 0) {
        setNewlyUnlocked(unlocked);
        // Achievement unlock animations are handled by RPGNavigationOverlay component
        console.log('[Achievements] Unlocked:', unlocked.map(a => a.name).join(', '));
      }
    } catch (error) {
      console.error('[Achievements] Error checking achievements:', error);
    }
  }, []);

  /**
   * Record navigation completion
   */
  const recordNavigationComplete = useCallback(async () => {
    const unlocked: Achievement[] = [];
    for (const id of ['navigator-10', 'navigator-50', 'navigator-100', 'navigator-500']) {
      const result = await achievementsService.incrementProgress(id, 1);
      if (result) unlocked.push(result);
    }
    if (unlocked.length > 0) {
      setNewlyUnlocked(unlocked);
    }
  }, []);

  const recordAITripPlanned = useCallback(async () => {
    const unlocked: Achievement[] = [];
    for (const id of ['ai-planner-1', 'ai-planner-10', 'ai-planner-50']) {
      const result = await achievementsService.incrementProgress(id, 1);
      if (result) unlocked.push(result);
    }
    if (unlocked.length > 0) {
      setNewlyUnlocked(unlocked);
    }
  }, []);

  /**
   * Clear newly unlocked achievements
   */
  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
  }, []);

  return {
    newlyUnlocked,
    clearNewlyUnlocked,
    checkAchievements,
    recordNavigationComplete,
    recordAITripPlanned,
  };
}

