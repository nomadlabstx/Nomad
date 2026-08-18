/**
 * Theme Colors Hook
 * Provides dynamic colors based on dark mode setting
 */

import { Colors } from '@/constants/theme';
import { useDarkMode } from '../components/color-context';

export function useThemeColors() {
  const { isDarkMode } = useDarkMode();

  return {
    // Backgrounds
    background: isDarkMode ? Colors.dark.background : Colors.light.background,
    cardBackground: isDarkMode ? '#1e1e1e' : '#fff',
    secondaryBackground: isDarkMode ? '#2a2a2a' : '#f9f9f9',
    
    // Text
    text: isDarkMode ? Colors.dark.text : Colors.light.text,
    secondaryText: isDarkMode ? '#B4BCC4' : '#888',
    tertiaryText: isDarkMode ? '#8B949E' : '#999',
    
    // Borders
    border: isDarkMode ? '#333' : '#e5e5e5',
    divider: isDarkMode ? '#2a2a2a' : '#f0f0f0',
    
    // Interactive
    icon: isDarkMode ? Colors.dark.icon : Colors.light.icon,
    tint: isDarkMode ? Colors.dark.tint : Colors.light.tint,
    
    // States
    inactive: isDarkMode ? '#444' : '#f5f5f5',
    
    // Special
    success: isDarkMode ? '#10b981' : '#10b981',
    error: isDarkMode ? '#ef4444' : '#ef4444',
    warning: isDarkMode ? '#f59e0b' : '#f59e0b',
    
    isDarkMode,
  };
}

