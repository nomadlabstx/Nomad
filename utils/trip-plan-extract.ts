export const AI_PLAN_MAX_STOPS = 8;
export const GOOGLE_MAX_WAYPOINTS = 25;
export const DEDUPE_METERS = 250;

const SKIP_LABELS =
  /^(early\s+)?(morning|afternoon|evening|night|late\s+morning.*|saturday|sunday|monday|tuesday|wednesday|thursday|friday|travel time|overview|itinerary|day\s+\d+|weekend plan)$/i;

const SKIP_PREFIX = /^(depart from|drive from|check into lodging|travel time)\b/i;

const SKIP_GENERIC =
  /^(the\s+)?(seaport|downtown|area|region|lodging|hotel|museum|park|beach|harbor|attractions?|activities)$/i;

type LatLng = { latitude: number; longitude: number };

export type NamedLocation = {
  name: string;
  location: LatLng;
};

function looksLikePlaceName(name: string): boolean {
  const trimmed = name.replace(/[:.\s]+$/g, '').trim();
  if (trimmed.length < 3 || trimmed.length > 80) return false;
  if (SKIP_LABELS.test(trimmed)) return false;
  if (SKIP_PREFIX.test(trimmed)) return false;
  if (SKIP_GENERIC.test(trimmed)) return false;
  return true;
}

function stripDecorations(raw: string): string {
  return raw
    .replace(/\*\*/g, '')
    .replace(/^[-*•]+\s+/, '')
    .replace(/^\d+[\.)]\s+/, '')
    .replace(/\s+weekend plan$/i, '')
    .replace(/[:.\s]+$/g, '')
    .trim();
}

function addName(names: Set<string>, raw?: string, currentCity?: string): void {
  if (!raw) return;
  let name = stripDecorations(raw);
  const colon = name.indexOf(':');
  if (colon > 0 && colon < 48) {
    const before = name.slice(0, colon).trim();
    const after = name.slice(colon + 1).trim();
    if (SKIP_LABELS.test(before)) {
      extractFromProse(after, names, currentCity);
      return;
    }
    name = before;
  }
  if (currentCity && isUserOriginName(name, currentCity)) return;
  if (looksLikePlaceName(name)) {
    names.add(name);
  }
}

function isUserOriginName(name: string, currentCity: string): boolean {
  const lower = name.toLowerCase();
  const city = currentCity.toLowerCase();
  if (lower === city) return true;
  return lower.startsWith(`${city},`) || lower.startsWith(`${city} `);
}

function extractFromProse(text: string, names: Set<string>, currentCity?: string): void {
  const patterns = [
    /\b(?:Visit|Stop at|Head to|Explore|See)\s+(?:the\s+)?([^.\n(]+)/gi,
    /\b(?:Dinner|Lunch|Breakfast|Brunch)\s+(?:at|in)\s+(?:the\s+)?([^.\n(]+)/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      addName(names, match[1], currentCity);
    }
  }
}

function parseStructuredLines(text: string, names: Set<string>, currentCity?: string): void {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const numbered = trimmed.match(/^\d+[\.)]\s+(?:\*\*)?(.+?)(?:\*\*)?$/);
    if (numbered) {
      addName(names, numbered[1], currentCity);
      continue;
    }

    const boldBullet = trimmed.match(/^[-*•]\s+\*\*([^*]+)\*\*/);
    if (boldBullet) {
      addName(names, boldBullet[1], currentCity);
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      addName(names, bullet[1], currentCity);
      continue;
    }

    const standaloneBold = trimmed.match(/^\*\*([^*]+)\*\*/);
    if (standaloneBold) {
      addName(names, standaloneBold[1], currentCity);
    }
  }
}

export function inferPlanRegion(
  planText: string,
  currentCity?: string,
  currentState?: string
): { city?: string; state?: string } {
  const matches = Array.from(
    planText.matchAll(/\b([A-Z][a-zA-Z.]+(?:[\s-][A-Z][a-zA-Z.]+)*),\s*([A-Z]{2})\b/g)
  );
  const current = `${currentCity || ''}`.toLowerCase();
  const preferred = matches.find((m) => m[1].toLowerCase() !== current);
  const chosen = preferred || matches[0];
  if (!chosen) {
    return { city: currentCity, state: currentState };
  }
  return { city: chosen[1], state: chosen[2] };
}

export function extractLocationNames(planText: string, currentCity?: string): string[] {
  const locationNames = new Set<string>();

  const destinationsBlock = planText.match(/Destinations:\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (destinationsBlock?.[1]?.trim()) {
    parseStructuredLines(destinationsBlock[1], locationNames, currentCity);
    return Array.from(locationNames).slice(0, AI_PLAN_MAX_STOPS);
  }

  parseStructuredLines(planText, locationNames, currentCity);

  if (locationNames.size < 2) {
    extractFromProse(planText, locationNames, currentCity);
  }

  if (locationNames.size === 0) {
    for (const match of planText.matchAll(/\b([A-Z][a-zA-Z.]+(?:[\s-][A-Z][a-zA-Z.]+)*),\s*([A-Z]{2})\b/g)) {
      addName(locationNames, `${match[1]}, ${match[2]}`, currentCity);
    }
  }

  return Array.from(locationNames).slice(0, AI_PLAN_MAX_STOPS);
}

export function normalizePlaceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function dedupeNamedLocations<T extends NamedLocation>(stops: T[]): T[] {
  const result: T[] = [];
  for (const stop of stops) {
    const duplicate = result.find(
      (existing) =>
        normalizePlaceName(existing.name) === normalizePlaceName(stop.name) ||
        haversineMeters(existing.location, stop.location) < DEDUPE_METERS
    );
    if (!duplicate) {
      result.push(stop);
    }
  }
  return result;
}

export function capNamedLocations<T extends NamedLocation>(stops: T[], maxTotal: number): T[] {
  if (stops.length <= maxTotal) return stops;
  if (maxTotal <= 1) return stops.slice(-1);
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).slice(0, maxTotal - 1);
  const lastKept = waypoints[waypoints.length - 1];
  if (
    lastKept &&
    (normalizePlaceName(lastKept.name) === normalizePlaceName(destination.name) ||
      haversineMeters(lastKept.location, destination.location) < DEDUPE_METERS)
  ) {
    waypoints.pop();
  }
  return [...waypoints, destination];
}
