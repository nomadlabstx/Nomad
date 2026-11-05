import { useCallback, useEffect, useRef, useState } from 'react';
import { interstateRecsService } from '../services/interstate-recs';
import { userPreferencesService } from '../services/user-preferences';
import type { Route } from '../types/navigation';
import type { Coordinates } from '../types/navigation';
import type { PlaceIdentity } from '../utils/place-identity';
import { REC_COOLDOWN_MS } from '../utils/drive-hud';
import { hasPassedPlace, recsAreEnabled, type InterstateRecPlace } from '../utils/interstate-recs';

interface UseInterstateRecsOptions {
  location: Coordinates | null;
  heading?: number;
  identity: PlaceIdentity | null;
  route?: Route | null;
  preferredHighways?: string[];
  cameraActive: boolean;
}

export function useInterstateRecs({
  location,
  heading,
  identity,
  route,
  preferredHighways,
  cameraActive,
}: UseInterstateRecsOptions) {
  const [suggestion, setSuggestion] = useState<InterstateRecPlace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const dismissedIdsRef = useRef(new Set<string>());
  const cooldownUntilRef = useRef(0);
  const mutedRef = useRef(false);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
    setSheetOpen(false);
  }, []);

  const dismiss = useCallback((placeId?: string) => {
    if (placeId) {
      dismissedIdsRef.current.add(placeId);
    }
    cooldownUntilRef.current = Date.now() + REC_COOLDOWN_MS;
    clearSuggestion();
  }, [clearSuggestion]);

  const muteRecs = useCallback(async () => {
    mutedRef.current = true;
    clearSuggestion();
    try {
      await userPreferencesService.updateAISettings({ proactiveSuggestions: false });
    } catch (error) {
      console.warn('[InterstateRecs] Failed to mute suggestions:', error);
    }
  }, [clearSuggestion]);

  useEffect(() => {
    if (!location) {
      return;
    }

    if (cameraActive || mutedRef.current || Date.now() < cooldownUntilRef.current) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const prefs = await userPreferencesService.getPreferences();
          if (cancelled) return;
          if (!recsAreEnabled(prefs.proactiveSuggestions, {
            recommendEat: prefs.travel.recommendEat !== false,
            recommendDrink: prefs.travel.recommendDrink !== false,
            recommendDo: prefs.travel.recommendDo !== false,
          })) {
            if (!cancelled) setSuggestion(null);
            return;
          }
          const next = await interstateRecsService.findSuggestion({
            location,
            heading,
            identity,
            route,
            preferredHighways,
            prefs,
            dismissedIds: dismissedIdsRef.current,
          });
          if (!cancelled) {
            setSuggestion(next);
          }
        } catch {
          if (!cancelled) {
            setSuggestion(null);
          }
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location, heading, identity, route, preferredHighways, cameraActive]);

  useEffect(() => {
    if (!location || !suggestion) return;
    if (hasPassedPlace(location, suggestion, heading)) {
      dismiss(suggestion.placeId);
    }
  }, [location, heading, suggestion, dismiss]);

  return {
    suggestion: cameraActive ? null : suggestion,
    sheetOpen,
    setSheetOpen,
    dismiss,
    muteRecs,
  };
}
