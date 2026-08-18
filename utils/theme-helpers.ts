/**
 * Contrast-safe accent colors.
 * Dark-mode tint used to be white, so buttons with white labels disappeared.
 */

const ACCENT_FALLBACK = '#0a7ea4';
const ON_LIGHT = '#11181C';
const ON_DARK = '#FFFFFF';

function parseHex(color: string): { r: number; g: number; b: number } | null {
  const hex = color.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex;
  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

export function relativeLuminance(color: string): number {
  const rgb = parseHex(color);
  if (!rgb) {
    return 0;
  }
  const toLinear = (channel: number) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

/** Text/icon color that stays readable on an accent fill. */
export function getOnAccentColor(background: string): string {
  return relativeLuminance(background) > 0.45 ? ON_LIGHT : ON_DARK;
}

/**
 * Fill color for buttons, chips, and selected states.
 * Near-white tints are replaced so white labels stay visible.
 */
export function getAccentFill(tint: string, isDarkMode = false): string {
  if (relativeLuminance(tint) > 0.65) {
    return ACCENT_FALLBACK;
  }
  return tint;
}

export function getSelectedBackgroundColor(tint: string, isDarkMode: boolean): string {
  return getAccentFill(tint, isDarkMode);
}

export function useSelectedBackgroundColor(tint: string): string {
  // Lazy import avoids pulling React Native into pure unit tests.
  const { useThemeColors } = require('../hooks/use-theme-colors') as typeof import('../hooks/use-theme-colors');
  const theme = useThemeColors();
  return getSelectedBackgroundColor(tint, theme.isDarkMode);
}
