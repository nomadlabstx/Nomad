/**
 * Parse Google Directions API html_instructions into display-ready text.
 *
 * Naive tag stripping breaks words when tags sit between characters or when
 * adjacent tags omit spaces (e.g. </b><b>, </b>Destination, CT-67 N</b><br/><b>Pass).
 */

import { parseHighwayRefs } from './highway-refs';
import { polishExitWording } from './exit-labels';

export { polishExitWording } from './exit-labels';

export interface FormattedDirection {
  primary: string;
  secondary?: string;
}

const BLOCK_BREAK_RE = /<br\s*\/?>/gi;
const BLOCK_TAG_RE = /<\/?(?:div|p|li|tr|h[1-6])[^>]*>/gi;

/** Phrases that start a secondary hint line (Apple Maps style). */
const SECONDARY_PHRASE_RE =
  /(?:^|\s)((?:Pass by\b.+|Destination will be\b.+|Continue to follow\b.+))$/i;

/** Known secondary starters merged onto prior text without a tag break. */
const SECONDARY_JOIN_RE =
  /([0-9A-Za-z])(?=(?:Pass by|Destination will be|Continue to follow)\b)/g;

/**
 * Decode common HTML entities from Google Directions instructions.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Insert spaces where tag removal would glue words together.
 */
function fixWordBoundaries(text: string): string {
  let result = text;

  // Closing tag immediately followed by a new word: </b>Destination, </b>Pass
  result = result.replace(/(<\/[^>]+>)([A-Z])/g, '$1 $2');

  // camelCase-style joins from stripped inline tags: leftDestination, RdContinue
  result = result.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Route suffix glued to next phrase: NPass, 67Pass
  result = result.replace(SECONDARY_JOIN_RE, '$1 ');

  // Letter/digit: "Rd3" → "Rd 3". Keep single-letter suffixes glued ("30A", "8N").
  result = result.replace(/([a-zA-Z])(\d)/g, '$1 $2');
  result = result.replace(/(\d)([A-Za-z]{2,})/g, '$1 $2');

  return result;
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

function parseHtmlToLines(html: string): string[] {
  let working = html;

  // Block breaks become line separators before tag stripping
  working = working.replace(BLOCK_BREAK_RE, '\n');
  working = working.replace(BLOCK_TAG_RE, '\n');

  // Space between adjacent tags so </b><b> does not glue words
  working = working.replace(/>\s*</g, '> <');

  working = fixWordBoundaries(working);
  working = stripHtmlTags(working);
  working = decodeHtmlEntities(working);

  return working
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean);
}

function splitPrimarySecondaryFromLine(line: string): FormattedDirection {
  const secondaryMatch = line.match(SECONDARY_PHRASE_RE);
  if (!secondaryMatch) {
    return { primary: line };
  }

  const secondary = normalizeLine(secondaryMatch[1]);
  const primary = normalizeLine(line.slice(0, line.length - secondaryMatch[0].length));
  return primary ? { primary, secondary } : { primary: secondary };
}

/**
 * Drop the local street alias when Google dual-names a numbered route.
 * "Turn right onto CT-67 N/New Haven Rd" → "Turn right onto CT-67 N"
 */
export function shortenPrimaryInstruction(primary: string): string {
  const slash = primary.indexOf('/');
  let text = primary;
  if (slash !== -1) {
    const left = primary.slice(0, slash).trim();
    if (parseHighwayRefs(left).length > 0) {
      text = left;
    }
  }

  // Entry hints — the banner only needs the road, not the ramp destination.
  text = text.replace(/\s+via the ramp(?:\s+to\b.*)?$/i, '');
  text = text.replace(/\s+on the (?:left|right)$/i, '');
  return polishExitWording(text.trim());
}

function withShortPrimary(result: FormattedDirection): FormattedDirection {
  return {
    primary: shortenPrimaryInstruction(result.primary),
    secondary: result.secondary ? polishExitWording(result.secondary) : undefined,
  };
}

/**
 * Convert Google Directions html_instructions to primary + optional secondary text.
 */
export function formatDirectionInstruction(html: string): FormattedDirection {
  if (!html) {
    return { primary: '' };
  }

  const lines = parseHtmlToLines(html);
  if (lines.length === 0) {
    return { primary: '' };
  }

  if (lines.length === 1) {
    return withShortPrimary(splitPrimarySecondaryFromLine(lines[0]));
  }

  const [firstLine, ...rest] = lines;
  const singleLineSplit = splitPrimarySecondaryFromLine(firstLine);

  if (singleLineSplit.secondary) {
    return withShortPrimary({
      primary: singleLineSplit.primary,
      secondary: [singleLineSplit.secondary, ...rest].join(' · '),
    });
  }

  return withShortPrimary({
    primary: firstLine,
    secondary: rest.join(' · '),
  });
}

/**
 * Banner + TTS: the turn itself, not Pass by / Continue to follow.
 */
export function formatDirectionInstructionText(html: string): string {
  return formatDirectionInstruction(html).primary;
}

function roadNameFromInstruction(primary: string): string {
  const head = primary.match(/^head\s+\S+\s+on\s+(.+?)(?:\s+toward\b.*)?$/i);
  if (head?.[1]) {
    return head[1].trim();
  }

  const onto = primary.match(/\b(?:onto|on)\s+(.+?)(?:\s+toward\b.*)?$/i);
  if (onto?.[1]) {
    return onto[1].trim();
  }

  const follow = primary.match(/continue(?:\s+to follow)?\s+(.+)/i);
  if (follow?.[1]) {
    return follow[1].trim();
  }

  return primary;
}

/** "Merge onto CT-8 N" → "Continue on CT-8 N" once you're already on that road. */
export function continueOnInstruction(html: string): string {
  const primary = formatDirectionInstructionText(html);
  if (!primary) {
    return 'Continue';
  }
  if (/^continue\b/i.test(primary)) {
    return primary;
  }
  const road = roadNameFromInstruction(primary);
  return road ? `Continue on ${road}` : 'Continue';
}

export function isHighwayStyleManeuver(instruction: string, maneuver?: string): boolean {
  const text = `${maneuver || ''} ${instruction}`.toLowerCase();
  return /exit|merge|ramp|interstate|freeway|expressway|\bi-\d/.test(text);
}

/** Don't show a merge/exit until you're actually approaching it. */
export function shouldRevealUpcomingManeuver(
  remainingMeters: number,
  instruction: string,
  maneuver?: string
): boolean {
  const limit = isHighwayStyleManeuver(instruction, maneuver) ? 3219 : 1200;
  return remainingMeters <= limit;
}
