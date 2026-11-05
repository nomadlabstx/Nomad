/**
 * Achievement Hook
 * Checks unlocks while driving and after a trip. UI is a small toast, not RPG chrome.
 */

import { useCallback, useState } from 'react';
import { achievementsService } from '../services/achievements';
import { explorerService } from '../services/explorer';
import type { Achievement } from '../types/achievements';

export function useAchievements() {
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  const checkAchievements = useCallback(async () => {
    try {
      const stats = explorerService.getStats();
      const unlocked = await achievementsService.checkAchievements({
        citiesVisited: stats.citiesVisited,
        countiesVisited: stats.countiesVisited || 0,
        statesVisited: stats.statesVisited,
      });

      if (unlocked.length > 0) {
        setNewlyUnlocked((previous) => {
          const seen = new Set(previous.map((item) => item.id));
          const next = unlocked.filter((item) => !seen.has(item.id));
          return next.length > 0 ? [...previous, ...next] : previous;
        });
      }
    } catch (error) {
      console.error('[Achievements] Error checking achievements:', error);
    }
  }, []);

  const recordNavigationComplete = useCallback(async () => {
    const unlocked: Achievement[] = [];
    for (const id of ['navigator-10', 'navigator-50', 'navigator-100', 'navigator-500']) {
      const result = await achievementsService.incrementProgress(id, 1);
      if (result) unlocked.push(result);
    }
    if (unlocked.length > 0) {
      setNewlyUnlocked((previous) => [...previous, ...unlocked]);
    }
  }, []);

  const recordAITripPlanned = useCallback(async () => {
    const unlocked: Achievement[] = [];
    for (const id of ['ai-planner-1', 'ai-planner-10', 'ai-planner-50']) {
      const result = await achievementsService.incrementProgress(id, 1);
      if (result) unlocked.push(result);
    }
    if (unlocked.length > 0) {
      setNewlyUnlocked((previous) => [...previous, ...unlocked]);
    }
  }, []);

  const consumeNextUnlock = useCallback((): Achievement | null => {
    let next: Achievement | null = null;
    setNewlyUnlocked((previous) => {
      if (previous.length === 0) return previous;
      next = previous[0];
      return previous.slice(1);
    });
    return next;
  }, []);

  const dismissCurrentUnlock = useCallback(() => {
    setNewlyUnlocked((previous) => previous.slice(1));
  }, []);

  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
  }, []);

  return {
    newlyUnlocked,
    clearNewlyUnlocked,
    consumeNextUnlock,
    dismissCurrentUnlock,
    checkAchievements,
    recordNavigationComplete,
    recordAITripPlanned,
  };
}
