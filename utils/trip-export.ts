import type { Trip } from '../types';
import { escapeXml } from './xml';

export function tripExportName(trip: Trip): string {
  return trip.name || `Trip ${trip.id}`;
}

export function tripToGpx(trip: Trip): string {
  if (!trip.path || !Array.isArray(trip.path) || trip.path.length === 0) {
    throw new Error('Trip has no path data');
  }
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Nomad" xmlns="http://www.topografix.com/GPX/1/1">\n`;
  const footer = `\n</gpx>`;
  const trk = `  <trk>\n    <name>${escapeXml(tripExportName(trip))}</name>\n    <trkseg>\n${trip.path
    .map((p) => {
      const time = p.timestamp ? new Date(p.timestamp).toISOString() : '';
      const ele = p.altitude != null ? `<ele>${p.altitude}</ele>` : '';
      return `      <trkpt lat="${p.latitude}" lon="${p.longitude}">` + ele + (time ? `<time>${time}</time>` : '') + `</trkpt>`;
    })
    .join('\n')}
    </trkseg>\n  </trk>`;
  return header + trk + footer;
}

export function tripToKml(trip: Trip): string {
  if (!trip.path || !Array.isArray(trip.path) || trip.path.length === 0) {
    throw new Error('Trip has no path data');
  }
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n`;
  const footer = `\n</Document>\n</kml>`;
  const coords = trip.path.map((p) => `${p.longitude},${p.latitude},${p.altitude ?? 0}`).join(' ');
  const placemark = `<Placemark><name>${escapeXml(tripExportName(trip))}</name><LineString><coordinates>${coords}</coordinates></LineString></Placemark>`;
  return header + placemark + footer;
}
