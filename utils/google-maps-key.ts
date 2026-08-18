/**
 * Resolve Google Maps Platform API key from env.
 * Valid keys start with AIzaSy (standard Google API key format).
 */

const KEY_ENV_VARS = [
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
  'EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY',
  'EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY',
  'EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY',
] as const;

export function getGoogleMapsApiKey(): string {
  for (const name of KEY_ENV_VARS) {
    const key = process.env[name];
    if (key && isLikelyGoogleMapsApiKey(key)) {
      return key;
    }
  }

  // Return first non-empty value so callers can surface API errors
  for (const name of KEY_ENV_VARS) {
    const key = process.env[name];
    if (key) {
      return key;
    }
  }

  return '';
}

export function isLikelyGoogleMapsApiKey(key: string): boolean {
  return key.startsWith('AIzaSy') && key.length > 20;
}

export function getGoogleMapsKeyProblem(): string | null {
  const key = getGoogleMapsApiKey();
  if (!key) {
    return 'No Google Maps API key found. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env (AIzaSy…) and restart Expo (npm run start).';
  }
  if (!isLikelyGoogleMapsApiKey(key)) {
    return 'Google Maps API key has invalid format (expected AIzaSy…). Check .env / .env.local, then fully restart Expo — reload alone is not enough.';
  }
  return null;
}
