# Wikipedia-First Data Strategy

**Effective:** 2026-06-20  
**Status:** Approved as part of Nomad audit + data revamp  
**Audit:** [AUDIT_REPORT.md](./AUDIT_REPORT.md)

---

## Principles

1. **Freeze legacy expansion** — No new Census geocode batches, no `scripts/geocode-*.js` runs, no growing `data/us-states/` TS monoliths.
2. **Keep existing assets read-only** — Texas exits, per-state JSON, highway files stay until Wikipedia layer proves parity.
3. **Wikipedia for new content** — Place summaries, highway exit lists (MediaWiki list articles).
4. **GPS + reverse geocode for "where am I"** — Wikipedia does not replace coordinate → admin area. Keep minimal Google/MapKit geocoding for visit detection only.
5. **User travel fills gaps** — Dynamic node creation in `services/explorer.ts` when geocode returns unknown city/county.
6. **Accuracy rules** — Every stat cites a source. Show **"N discovered"** instead of wrong completion %.

---

## What Wikipedia replaces

| Need | Wikipedia approach | Replaces |
|------|-------------------|----------|
| City/county blurb on visit | REST `/page/summary/{title}` | Google Places descriptions |
| Highway exit list | Parse/list articles per interstate; cache locally | New state exit scrapes |
| Entity lookup | Search API → canonical title; store on Explorer node | Census `knownFor` tags |
| Offline context | AsyncStorage cache on first visit | Shipping more static cities |

## What Wikipedia does NOT replace

- Turn-by-turn routing (Google Directions)
- Live reverse geocoding for GPS pings
- Pathfinder reasoning (Gemini)

---

## Implementation

### Service: `services/wikipedia.ts`

| Feature | Detail |
|---------|--------|
| Summary fetch | `getSummary(title)`, `getPlaceSummary(name, state, kind)` |
| Search fallback | MediaWiki search when exact title 404 |
| Rate limit | 200ms between requests |
| Cache | AsyncStorage, 7-day TTL, key `@nomad_wikipedia_*` |
| Attribution | `From Wikipedia: {title}` in Explorer UI |

### Explorer integration

On GPS visit (`recordVisit`):

1. Reverse geocode → update hierarchy
2. Async fetch Wikipedia summary for city, county, state (if missing)
3. Store `wikiTitle`, `wikiExtract`, `wikiPageUrl` on node
4. UI shows excerpt when city row expanded

### Highway exit pilot: I-95 Connecticut

- **File:** `data/i95-connecticut-exits-wikipedia.ts`
- **Source:** [Interstate 95 in Connecticut](https://en.wikipedia.org/wiki/Interstate_95_in_Connecticut)
- **Wiring:** `initializeAllCTHighways()` attaches exits to `interstate-95`
- **Validation:** Compare exit numbers/descriptions against Wikipedia before expanding to other corridors

### Frozen: Google Places auto-discovery

`services/location-auto-discovery.ts` — `enabled = false`. GPS visits + Wikipedia fill gaps going forward.

---

## Legacy retirement (Phase 5)

| Action | Status |
|--------|--------|
| Remove `us-cities-census.ts` from runtime imports | Done |
| Archive census + backup TS → `data/archive/` | Done |
| Document frozen scripts → `scripts/LEGACY_SCRIPTS.md` | Done |
| Stop importing census in `location-database.ts` | Done — tourist destinations only |
| Mass-delete highway/city files | **Not yet** — after Wikipedia pilots validate |

---

## Accuracy requirements

1. **Completion %** — Only show when `totalLocations > 0` (`completionPercentKnown`).
2. **Exit progress** — Only for highways with sourced exit lists (TX mapping, I-95 CT pilot).
3. **Wikipedia text** — Display with attribution; cache timestamp for staleness awareness.
4. **Unknown totals** — Prefer "discovered: N" over "0% of America".
5. **No inflated stats** — Do not count auto-discovered Places localities (disabled).

---

## Future ETL pattern

```text
MediaWiki API → validate against source URL → typed TS/JSON + sourceArticle + fetchedAt
```

Scripts belong in `scripts/` with names like `fetch-wikipedia-exits-{corridor}.js`. Add to active list in LEGACY_SCRIPTS.md when created.

---

## Regenerate city index (legacy JSON path)

```bash
node scripts/rebuild-us-states-index.js
```

Produces `data/us-cities-index.ts` from `data/us-states-json/*-cities.json`.

---

## Related docs

- [AUDIT_REPORT.md](./AUDIT_REPORT.md)
- [PRIORITY_BUCKETS.md](./PRIORITY_BUCKETS.md)
- [STATE_OF_UNION.md](./STATE_OF_UNION.md)
- [data/archive/README.md](../data/archive/README.md)
