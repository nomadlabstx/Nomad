/**
 * Human-readable trip / saved-route titles.
 * "McDonald's, 900 W Main St, Branford, CT" → "Trip to McDonald's"
 */

const COORDINATE_NAME_RE = /route from\s+-?\d+\.\d+/i;
const LAT_LNG_RE = /^-?\d+\.\d+(\s*,\s*-?\d+\.\d+)?/;
const STREET_ADDRESS_RE = /^\d+\s+\S+/;

function stripTripPrefix(raw: string): string {
  return raw.replace(/^trip to\s+/i, '').trim();
}

export function cleanDestinationLabel(raw?: string | null): string {
  if (!raw) {
    return '';
  }

  const first = raw.split(',')[0].replace(/\s+/g, ' ').trim();
  if (!first || LAT_LNG_RE.test(first) || COORDINATE_NAME_RE.test(first)) {
    return '';
  }

  return first;
}

export function formatTripName(destination?: string | null): string {
  const label = cleanDestinationLabel(destination);
  if (!label) {
    return 'Trip';
  }
  if (/^trip to\s/i.test(label)) {
    return label;
  }
  return `Trip to ${label}`;
}

export function isCoordinateRouteName(name?: string | null): boolean {
  return Boolean(name && COORDINATE_NAME_RE.test(name));
}

/** "900 W Main St" / "Trip to 900 W Main St" — not a place name. */
export function isStreetAddressName(name?: string | null): boolean {
  if (!name) {
    return false;
  }
  const first = stripTripPrefix(name).split(',')[0].replace(/\s+/g, ' ').trim();
  return STREET_ADDRESS_RE.test(first);
}

export function isWeakRouteName(name?: string | null): boolean {
  return !name || isCoordinateRouteName(name) || isStreetAddressName(name);
}

export function displayRouteName(name: string, fallbackDestination?: string | null): string {
  if (isCoordinateRouteName(name) || !cleanDestinationLabel(name)) {
    return formatTripName(fallbackDestination);
  }
  if (isStreetAddressName(name) && fallbackDestination && !isStreetAddressName(fallbackDestination)) {
    return formatTripName(fallbackDestination);
  }
  return name;
}
