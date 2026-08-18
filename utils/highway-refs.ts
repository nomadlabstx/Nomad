/**
 * Parse US highway / interstate / state-route references from turn-by-turn text
 * so the UI can render MUTCD-style shields (Apple Maps / Google Maps style).
 */

export type HighwayKind = 'interstate' | 'us' | 'state';

export interface HighwayRef {
  kind: HighwayKind;
  number: string;
  state?: string;
  direction?: string;
  raw: string;
  start: number;
  end: number;
}

export type InstructionPart =
  | { type: 'text'; value: string }
  | { type: 'shield'; ref: HighwayRef };

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI',
  'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN',
  'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA',
  'WI', 'WV', 'WY',
]);

const STATE_ALTS = [...US_STATES].join('|');

const DIRECTION_RE = String.raw`(?:\s+(North|South|East|West|[NSEW])\b)?`;

/** Interstate 95, I-95, I 91, I-295A */
const INTERSTATE_RE = new RegExp(
  String.raw`\b(?:I[-\s]|Interstate\s+)(\d{1,3}[A-Z]?)\b${DIRECTION_RE}`,
  'gi'
);

/** US-1, U.S. 1, US 44 */
const US_ROUTE_RE = new RegExp(
  String.raw`\bU\.?S\.?\s*-?\s*(\d{1,3}[A-Z]?)\b${DIRECTION_RE}`,
  'gi'
);

/** CT-67, NY-17, CA-1 — hyphen required so "in 5 miles" does not match IN */
const STATE_ROUTE_RE = new RegExp(
  String.raw`\b(${STATE_ALTS})-(\d{1,3}[A-Z]?)\b${DIRECTION_RE}`,
  'gi'
);

/** Route 8, SR 15, Hwy 1 — generic numbered route with no state */
const GENERIC_ROUTE_RE = new RegExp(
  String.raw`\b(?:State\s+)?(?:Route|Hwy|SR)\s+(\d{1,3}[A-Z]?)\b${DIRECTION_RE}`,
  'gi'
);

const DIRECTION_WORDS: Record<string, string> = {
  N: 'North',
  S: 'South',
  E: 'East',
  W: 'West',
};

export function directionWord(direction?: string): string {
  if (!direction) {
    return '';
  }
  const upper = direction.toUpperCase();
  if (DIRECTION_WORDS[upper]) {
    return DIRECTION_WORDS[upper];
  }
  return direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase();
}

function pushMatch(
  matches: HighwayRef[],
  kind: HighwayKind,
  raw: string,
  start: number,
  number: string,
  direction?: string,
  state?: string
): void {
  const end = start + raw.length;
  if (matches.some((m) => start < m.end && end > m.start)) {
    return;
  }
  matches.push({
    kind,
    number: number.toUpperCase(),
    state: state?.toUpperCase(),
    direction: direction || undefined,
    raw,
    start,
    end,
  });
}

function collectMatches(re: RegExp, text: string): RegExpMatchArray[] {
  const copy = new RegExp(re.source, re.flags);
  return [...text.matchAll(copy)];
}

export function parseHighwayRefs(text: string): HighwayRef[] {
  if (!text) {
    return [];
  }

  const matches: HighwayRef[] = [];

  for (const match of collectMatches(INTERSTATE_RE, text)) {
    if (match.index == null || match[1] == null) continue;
    pushMatch(matches, 'interstate', match[0], match.index, match[1], match[2]);
  }

  for (const match of collectMatches(US_ROUTE_RE, text)) {
    if (match.index == null || match[1] == null) continue;
    pushMatch(matches, 'us', match[0], match.index, match[1], match[2]);
  }

  for (const match of collectMatches(STATE_ROUTE_RE, text)) {
    if (match.index == null || match[1] == null || match[2] == null) continue;
    pushMatch(matches, 'state', match[0], match.index, match[2], match[3], match[1]);
  }

  for (const match of collectMatches(GENERIC_ROUTE_RE, text)) {
    if (match.index == null || match[1] == null) continue;
    pushMatch(matches, 'state', match[0], match.index, match[1], match[2]);
  }

  return matches.sort((a, b) => a.start - b.start);
}

const HIGHWAY_WORD_RE = /\b(highway|freeway|interstate|motorway|thruway|expressway)\b/i;
const RAMP_MERGE_RE = /ramp|merge|fork/i;

/** True when a Directions step is a limited-access highway, US route, or ramp/merge. */
export function instructionIndicatesHighway(instruction: string, maneuver?: string): boolean {
  const text = instruction ?? '';
  if (HIGHWAY_WORD_RE.test(text)) {
    return true;
  }
  if (maneuver && RAMP_MERGE_RE.test(maneuver)) {
    return true;
  }
  return parseHighwayRefs(text).some((ref) => ref.kind === 'interstate' || ref.kind === 'us');
}

export function tokenizeInstruction(text: string): InstructionPart[] {
  const refs = parseHighwayRefs(text);
  if (refs.length === 0) {
    return [{ type: 'text', value: text }];
  }

  const parts: InstructionPart[] = [];
  let cursor = 0;

  for (const ref of refs) {
    if (ref.start > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, ref.start) });
    }
    parts.push({ type: 'shield', ref });
    cursor = ref.end;
  }

  if (cursor < text.length) {
    let rest = text.slice(cursor);
    if (rest.startsWith('/')) {
      rest = ` / ${rest.slice(1).trimStart()}`;
    }
    parts.push({ type: 'text', value: rest });
  }

  return parts;
}
