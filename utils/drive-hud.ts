export type DriveAttentionKind = 'camera' | 'rec' | 'achievement' | null;

export type DetourPreset = 'this-exit' | 'few-minutes' | 'worth-the-dip';

export const DETOUR_PRESETS: Record<
  DetourPreset,
  { meters: number; seconds: number; label: string; description: string }
> = {
  'this-exit': {
    meters: 1609,
    seconds: 120,
    label: 'This exit',
    description: 'On the highway or the next exit only',
  },
  'few-minutes': {
    meters: 8047,
    seconds: 480,
    label: 'A few minutes',
    description: 'About 5 miles / 8 minutes off the road',
  },
  'worth-the-dip': {
    meters: 24140,
    seconds: 1200,
    label: 'Worth the dip',
    description: 'County or town poke off the interstate',
  },
};

export const REC_COOLDOWN_MS = 10 * 60 * 1000;
export const QUALITY_MIN_RATING = 4.2;
export const QUALITY_MIN_REVIEWS = 40;

/**
 * One attention slot besides the turn banner and posted speed-limit sign.
 * Cameras always win; recs next; achievement toast last.
 */
export function pickDriveAttentionSlot(options: {
  hasCamera: boolean;
  hasRec: boolean;
  hasAchievement: boolean;
}): DriveAttentionKind {
  if (options.hasCamera) return 'camera';
  if (options.hasRec) return 'rec';
  if (options.hasAchievement) return 'achievement';
  return null;
}

export function detourMeters(preset: DetourPreset | undefined): number {
  return DETOUR_PRESETS[preset ?? 'few-minutes'].meters;
}

export function roundCoordCell(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function cameraCacheKey(latitude: number, longitude: number): string {
  return `${roundCoordCell(latitude, 2)},${roundCoordCell(longitude, 2)}`;
}

export function isHeadingAhead(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  heading: number
): boolean {
  if (!Number.isFinite(heading) || heading < 0) {
    return true;
  }
  const bearing = bearingDegrees(from, to);
  const diff = Math.abs(bearing - heading) % 360;
  const headingDiff = diff > 180 ? 360 - diff : diff;
  return headingDiff <= 90;
}

export function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const R = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function bearingDegrees(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
