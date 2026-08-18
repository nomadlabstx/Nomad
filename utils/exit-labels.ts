/**
 * Canonical highway-exit labels: "Exit 30", "Exit 30A".
 * Use these anywhere an exit number is shown so spacing/casing stay consistent.
 */

const EXIT_WORD_RE = /^exits?\s+/i;

export function normalizeExitNumber(raw: string): string {
  let value = raw.trim().replace(EXIT_WORD_RE, '').replace(/^#\s*/, '');

  const dual = value.match(/^(\d+)\s*([A-Za-z])\s*[-–/]\s*([A-Za-z])$/);
  if (dual) {
    return `${dual[1]}${dual[2].toUpperCase()}-${dual[3].toUpperCase()}`;
  }

  const gluedDual = value.match(/^(\d+)([A-Za-z])\s*[-–/]\s*([A-Za-z])$/);
  if (gluedDual) {
    return `${gluedDual[1]}${gluedDual[2].toUpperCase()}-${gluedDual[3].toUpperCase()}`;
  }

  const spaced = value.match(/^(\d+)\s+([A-Za-z])$/);
  if (spaced) {
    return `${spaced[1]}${spaced[2].toUpperCase()}`;
  }

  const hyphen = value.match(/^(\d+)\s*[-–]\s*([A-Za-z])$/);
  if (hyphen) {
    return `${hyphen[1]}${hyphen[2].toUpperCase()}`;
  }

  const glued = value.match(/^(\d+)([A-Za-z])$/);
  if (glued) {
    return `${glued[1]}${glued[2].toUpperCase()}`;
  }

  const num = value.match(/^(\d+)$/);
  if (num) {
    return num[1];
  }

  return value.replace(/\s+/g, '');
}

export function formatExitLabel(rawNumber: string): string {
  return `Exit ${normalizeExitNumber(rawNumber)}`;
}

/**
 * Explorer/list line. Drops a description that is only a repeat of "Exit 20A".
 */
export function formatExitListLine(exitNumber: string, description?: string): string {
  const label = formatExitLabel(exitNumber);
  const number = normalizeExitNumber(exitNumber);
  let desc = (description || '').trim();
  if (!desc) {
    return label;
  }

  const descNumber = normalizeExitNumber(desc);
  if (descNumber === number) {
    return label;
  }

  desc = desc.replace(
    new RegExp(`^exits?\\s+${escapeRegExp(number)}\\s*[-–:]\\s*`, 'i'),
    ''
  );
  desc = desc.replace(/^exits?\s+\d+\s*[A-Za-z]?(?:\s*[-–/]\s*[A-Za-z])?\s*[-–:]\s*/i, '');
  desc = desc.trim();
  return desc ? `${label} – ${desc}` : label;
}

export function polishExitWording(text: string): string {
  return text
    .replace(/\bthe\s+(\d+(?:\s*[A-Za-z])?)\s+exit\b/gi, (_, raw) => formatExitLabel(raw))
    .replace(
      /\bexits?\s+(\d+)\s*([A-Za-z])(?:\s*[-–/]\s*([A-Za-z]))?\b/gi,
      (_, n, letter, extra) => formatExitLabel(extra ? `${n}${letter}-${extra}` : `${n}${letter}`)
    )
    .replace(/\bexits?\s+(\d+)\b/gi, (_, n) => formatExitLabel(n))
    .replace(/\bexits\b/gi, 'Exits')
    .replace(/\bexit\b/gi, 'Exit');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
