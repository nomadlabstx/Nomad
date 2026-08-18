import { Colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { AppColors, ColorContextType } from '../types';
import { getAppColors, saveAppColors } from '../utils/storage';

const DARK_MODE_KEY = 'darkModePreference';

type DarkModePreference = 'light' | 'dark' | 'auto';

// Tint is now always based on theme, not customizable
const getDefaultTint = (isDark: boolean) => isDark ? Colors.dark.tint : Colors.light.tint;

const DEFAULTS: AppColors = {
  tint: Colors.light.tint, // Will be overridden based on dark mode
  hudBackground: 'rgba(255,255,255,0.95)',
  buttonAccent: Colors.light.tint,
};

interface ExtendedColorContextType extends ColorContextType {
  isDarkMode: boolean;
  darkModePreference: DarkModePreference;
  setDarkModePreference: (pref: DarkModePreference) => void;
}

const ColorContext = createContext<ExtendedColorContextType>({
  colors: DEFAULTS,
  setColor: () => {},
  setColors: () => {},
  isDarkMode: false,
  darkModePreference: 'auto',
  setDarkModePreference: () => {},
});

export const ColorProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  const [darkModePreference, setDarkModePref] = useState<DarkModePreference>('auto');
  const systemColorScheme = useColorScheme();

  // Determine if dark mode should be active
  const isDarkMode = useMemo(() => {
    if (darkModePreference === 'auto') {
      return systemColorScheme === 'dark';
    }
    return darkModePreference === 'dark';
  }, [darkModePreference, systemColorScheme]);

  // Colors are now always based on theme - no customization
  const colors = useMemo<AppColors>(() => ({
    tint: getDefaultTint(isDarkMode),
    hudBackground: isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
    buttonAccent: getDefaultTint(isDarkMode),
  }), [isDarkMode]);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedDarkMode = await AsyncStorage.getItem(DARK_MODE_KEY);
        if (savedDarkMode) {
          setDarkModePref(savedDarkMode as DarkModePreference);
        }
      } catch (error) {
        console.warn('Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Color customization removed - colors are now theme-based only
  const setColor = useCallback((key: keyof AppColors, value: string) => {
    // No-op: colors are now always theme-based
    console.warn('Color customization is disabled. Colors are now theme-based only.');
  }, []);

  const setColors = useCallback((newColors: Partial<AppColors>) => {
    // No-op: colors are now always theme-based
    console.warn('Color customization is disabled. Colors are now theme-based only.');
  }, []);

  const setDarkModePreference = useCallback((pref: DarkModePreference) => {
    setDarkModePref(pref);
    AsyncStorage.setItem(DARK_MODE_KEY, pref).catch((error) => {
      console.warn('Failed to save dark mode preference:', error);
    });
  }, []);

  const contextValue = useMemo(() => ({
    colors,
    setColor,
    setColors,
    isDarkMode,
    darkModePreference,
    setDarkModePreference,
  }), [colors, setColor, setColors, isDarkMode, darkModePreference, setDarkModePreference]);

  return (
    <ColorContext.Provider value={contextValue}>
      {children}
    </ColorContext.Provider>
  );
});

ColorProvider.displayName = 'ColorProvider';

export function useAppTint() {
  const ctx = useContext(ColorContext);
  return { tint: ctx.colors.tint, setTint: (v: string) => ctx.setColor('tint', v) };
}

export function useAppColors() {
  return useContext(ColorContext);
}

export function useDarkMode() {
  const ctx = useContext(ColorContext);
  return {
    isDarkMode: ctx.isDarkMode,
    darkModePreference: ctx.darkModePreference,
    setDarkModePreference: ctx.setDarkModePreference,
  };
}

export default ColorContext;
