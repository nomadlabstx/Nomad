import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AI_PLAN_MAX_STOPS,
  capNamedLocations,
  dedupeNamedLocations,
  extractLocationNames,
  inferPlanRegion,
} from '../trip-plan-extract.ts';

describe('extractLocationNames', () => {
  it('reads Pathfinder asterisk-bold bullets and City, ST titles', () => {
    const plan = `Great choice! Mystic is perfect for a summer weekend. Here's a possible plan for your trip: **Mystic, CT Weekend Plan**.

* **Morning:** Depart from Seymour. Check into lodging near downtown or the Seaport.
* **Late Morning/Afternoon:** Visit the Mystic Seaport Museum.
* **Evening:** Dinner in Downtown Mystic (e.g., The Oyster Club).`;

    const names = extractLocationNames(plan);
    assert.ok(names.some((n) => /Mystic Seaport Museum/i.test(n)), `missing museum in ${JSON.stringify(names)}`);
    assert.ok(names.some((n) => /Oyster Club|Downtown Mystic/i.test(n)), `missing dinner stop in ${JSON.stringify(names)}`);
    assert.ok(!names.some((n) => /^morning$/i.test(n)));
    assert.ok(names.length <= AI_PLAN_MAX_STOPS);
  });

  it('reads unnumbered destination ideas', () => {
    const plan = `Here are a few weekend ideas within a 3-hour drive:
* **Newport, RI:** Historic mansions, scenic Cliff Walk.
* **The Berkshires, MA:** Arts and culture, hiking trails.`;

    const names = extractLocationNames(plan);
    assert.ok(names.some((n) => /Newport,\s*RI/i.test(n)), `missing Newport in ${JSON.stringify(names)}`);
    assert.ok(names.some((n) => /Berkshires,\s*MA/i.test(n)), `missing Berkshires in ${JSON.stringify(names)}`);
  });

  it('reads a Destinations numbered block', () => {
    const plan = `Saturday plan in Mystic.

Destinations:
1. Mystic Seaport Museum, Mystic, CT
2. The Oyster Club, Mystic, CT`;

    const names = extractLocationNames(plan);
    assert.ok(names.some((n) => /Seaport|Oyster/i.test(n)), JSON.stringify(names));
    assert.equal(names.length, 2, JSON.stringify(names));
  });

  it('ignores extra City/ST fragments when a Destinations block exists', () => {
    const extra = Array.from({ length: 20 }, (_, i) => `Also see Place ${i}, RI`).join('\n');
    const plan = `Long Newport itinerary with filler.

Destinations:
1. Cliff Walk, Newport, RI
2. The Breakers, Newport, RI

${extra}
Visit downtown. See the harbor. Dinner in Newport, RI. Stay in Seymour, CT.`;

    const names = extractLocationNames(plan, 'Seymour');
    assert.ok(names.length <= 2, JSON.stringify(names));
    assert.ok(names.some((n) => /Cliff Walk/i.test(n)));
    assert.ok(!names.some((n) => /Seymour/i.test(n)));
  });

  it('caps unstructured extracts at AI_PLAN_MAX_STOPS', () => {
    const bullets = Array.from(
      { length: 20 },
      (_, i) => `* **Stop ${i + 1} Museum, Newport, RI:** details`
    ).join('\n');
    const names = extractLocationNames(`Weekend in Newport\n${bullets}`, 'Seymour');
    assert.equal(names.length, AI_PLAN_MAX_STOPS);
  });
});

describe('inferPlanRegion', () => {
  it('prefers the plan city over the user origin', () => {
    const region = inferPlanRegion(
      '**Mystic, CT Weekend Plan** from Seymour, CT',
      'Seymour',
      'CT'
    );
    assert.equal(region.city, 'Mystic');
    assert.equal(region.state, 'CT');
  });
});

describe('dedupeNamedLocations and capNamedLocations', () => {
  it('drops nearby duplicate coordinates', () => {
    const stops = [
      { name: 'Cliff Walk', location: { latitude: 41.453, longitude: -71.31 } },
      { name: 'Cliff Walk Entrance', location: { latitude: 41.4531, longitude: -71.3101 } },
      { name: 'The Breakers', location: { latitude: 41.47, longitude: -71.298 } },
    ];
    const deduped = dedupeNamedLocations(stops);
    assert.equal(deduped.length, 2);
    assert.equal(deduped[1].name, 'The Breakers');
  });

  it('keeps the final destination when capping a long list', () => {
    const stops = Array.from({ length: 20 }, (_, i) => ({
      name: `Stop ${i}`,
      location: { latitude: 41.4 + i * 0.02, longitude: -71.3 },
    }));
    const capped = capNamedLocations(stops, AI_PLAN_MAX_STOPS);
    assert.equal(capped.length, AI_PLAN_MAX_STOPS);
    assert.equal(capped[capped.length - 1].name, 'Stop 19');
  });
});
