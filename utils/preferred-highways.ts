import type { Route } from '../types/navigation';
import { parseHighwayRefs, type HighwayKind, type HighwayRef } from './highway-refs';

export interface PreferredHighway {
  kind: HighwayKind;
  number: string;
  raw: string;
}

function formatPreferred(ref: HighwayRef): string {
  if (ref.kind === 'interstate') {
    return `I-${ref.number}`;
  }
  if (ref.kind === 'us') {
    return `US-${ref.number}`;
  }
  if (ref.state) {
    return `${ref.state}-${ref.number}`;
  }
  return `Route ${ref.number}`;
}

export function preferredHighwayFromText(token: string): PreferredHighway | null {
  const refs = parseHighwayRefs(token);
  if (refs.length === 0) {
    return null;
  }
  const ref = refs[0];
  return {
    kind: ref.kind,
    number: ref.number,
    raw: formatPreferred(ref),
  };
}

export function parsePreferredHighwayList(values: string[]): PreferredHighway[] {
  const seen = new Set<string>();
  const result: PreferredHighway[] = [];
  for (const value of values) {
    const parsed = preferredHighwayFromText(value);
    if (!parsed) {
      continue;
    }
    const key = `${parsed.kind}:${parsed.number}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(parsed);
  }
  return result;
}

/**
 * Pull "stay on I-95" constraints out of Pathfinder or user text.
 * Mentions like "get off I-95" are ignored.
 */
export function extractPreferredHighways(text: string): string[] {
  if (!text) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  const addRefsFrom = (chunk: string) => {
    for (const ref of parseHighwayRefs(chunk)) {
      const label = formatPreferred(ref);
      if (seen.has(label)) {
        continue;
      }
      seen.add(label);
      result.push(label);
    }
  };

  for (const match of text.matchAll(/^\s*(?:Stay on|Preferred highway)\s*:\s*(.+)$/gim)) {
    addRefsFrom(match[1] ?? '');
  }

  const constraintRe =
    /(?:stay on|stick to|remain on|keep(?: me)? on|prefer|take)\s+(.{0,48})/gi;
  for (const match of text.matchAll(constraintRe)) {
    const chunk = match[1] ?? '';
    const prefix = text.slice(Math.max(0, (match.index ?? 0) - 24), match.index ?? 0);
    if (/(?:avoid|get off|leave|exit)\s*$/i.test(prefix)) {
      continue;
    }
    if (/^take$/i.test(match[0].trim().split(/\s+/)[0] ?? '') && parseHighwayRefs(chunk).length === 0) {
      continue;
    }
    addRefsFrom(chunk);
  }

  return result;
}

export function highwayRefMatchesPreferred(ref: HighwayRef, preferred: PreferredHighway): boolean {
  if (ref.number !== preferred.number) {
    return false;
  }
  if (preferred.kind === 'state' && preferred.raw.includes('-') && ref.state) {
    return ref.kind === 'state' && preferred.raw.startsWith(`${ref.state}-`);
  }
  return ref.kind === preferred.kind;
}

function routeMentionsHighway(route: Route, preferred: PreferredHighway[]): number {
  let score = 0;
  const summaryRefs = parseHighwayRefs(route.summary || '');
  for (const ref of summaryRefs) {
    if (preferred.some((item) => highwayRefMatchesPreferred(ref, item))) {
      score += 50_000;
    }
  }

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      const refs = parseHighwayRefs(step.instruction || '');
      if (refs.some((ref) => preferred.some((item) => highwayRefMatchesPreferred(ref, item)))) {
        score += step.distance || 0;
      }
    }
  }

  return score;
}

/** Prefer Google alternatives that actually stay on the named highway. */
export function rankRoutesForPreferredHighways(routes: Route[], preferredLabels: string[]): Route[] {
  const preferred = parsePreferredHighwayList(preferredLabels);
  if (preferred.length === 0 || routes.length < 2) {
    return routes;
  }

  return [...routes].sort((a, b) => {
    const diff = routeMentionsHighway(b, preferred) - routeMentionsHighway(a, preferred);
    if (diff !== 0) {
      return diff;
    }
    return a.totalDuration - b.totalDuration;
  });
}
