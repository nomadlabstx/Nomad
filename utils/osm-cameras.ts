export function parseMaxspeedMph(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (/km/.test(value.toLowerCase())) {
    return Math.round(amount / 1.60934);
  }
  return Math.round(amount);
}

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export interface ParsedOsmCamera {
  id: string;
  type: 'speed' | 'red_light';
  coordinates: { latitude: number; longitude: number };
  speedLimit: number;
  road: string;
}

export function parseOverpassCameras(payload: { elements?: OverpassElement[] }): ParsedOsmCamera[] {
  const elements = payload.elements ?? [];
  const cameras: ParsedOsmCamera[] = [];

  for (const element of elements) {
    if (element.type !== 'node' || element.lat == null || element.lon == null || element.id == null) {
      continue;
    }
    const tags = element.tags ?? {};
    if (tags.highway !== 'speed_camera' && tags.enforcement !== 'maxspeed') {
      continue;
    }
    cameras.push({
      id: `osm-${element.id}`,
      type: tags.enforcement === 'traffic_signals' ? 'red_light' : 'speed',
      coordinates: { latitude: element.lat, longitude: element.lon },
      speedLimit: parseMaxspeedMph(tags.maxspeed),
      road: tags.road || tags.street || tags.name || '',
    });
  }

  return cameras;
}
