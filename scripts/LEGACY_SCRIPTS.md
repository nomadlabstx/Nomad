# Legacy ETL Scripts (Frozen)

As of 2026-06-20, Census/Google bulk expansion is **frozen**. Do not run geocode or Places discovery scripts without explicit approval.

## Frozen — do not run

| Script | Was used for |
|--------|----------------|
| `geocode-all-us-cities.js` | Census batch geocoding ($) |
| `geocode-*.js` | Per-state Google geocode batches |
| `parse-census-data.js` | Build `us-cities-census.ts` |
| `discover-missing-cities.js` | Census gap fill |
| `verify-census-coverage.js` | Census validation |
| `verify-counts-carefully.js` | Census validation |
| `comprehensive-missing-check.js` | Census validation |
| `find-missing-from-census.js` | Census gap fill |

## Active maintenance

| Script | Purpose |
|--------|---------|
| `rebuild-us-states-index.js` | Regenerate `us-cities-index.ts` from JSON |
| `automated-smoke-test.js` | Static import / syntax gate |
| `test-gemini-connection.js` | Pathfinder API smoke test |

## Wikipedia ETL (future)

Add scripts here when expanding beyond the I-95 CT pilot. Pattern: fetch MediaWiki → validate → write typed TS/JSON with source URL.
