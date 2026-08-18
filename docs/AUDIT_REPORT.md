# Nomad Structured Audit Report

**Date:** 2026-06-20  
**Scope:** Phase 1 audit (modules A–G), bug register, accuracy register  
**Replaces stale claims in:** `docs/CODE_QUALITY_REPORT.md` (do not trust "10/10" score)

**North star:** GPS-driven city/county/highway progression. Wikipedia-first for new content. Legacy `data/` assets frozen, not deleted.

---

## Executive summary

| Area | Status | Blocker? |
|------|--------|----------|
| Core loop (Plan → Navigate → Review) | Partial — web smoke OK; device matrix incomplete | P1 |
| Explorer progression | **Fixed in Phase 3** — index, storage, stats guards | Was P0 |
| Data layer | Overbuilt (~267 files); runtime imports trimmed | P2 bundle |
| Pathfinder AI | **Improved** — multi-turn context; no weather API | P1 quality |
| External APIs | Gemini + Maps required for full experience | Cost awareness |
| Secondary features | Bookings/achievements deferred per consolidation | No |
| Tests | Smoke PASS; manual gate FAIL | P1 |

**Release gate:** Still **FAIL** until device matrix + navigation edge cases verified ([MVP_RELEASE_GATE.md](./MVP_RELEASE_GATE.md)).

---

## Tooling evidence (2026-06-20)

| Check | Result | Notes |
|-------|--------|-------|
| `npm run test:smoke` | **PASS** | Static imports, syntax |
| `npx expo-doctor` | **15/18** | `.expo/` not gitignored; 17 SDK patch mismatches |
| `npx tsc --noEmit` | **Runs** (pre-existing app errors; stack overflow **fixed** via tsconfig excludes) | Exclude `data/us-states/**` monoliths (~6MB each) |
| `npm run lint` | **2 errors, 26 warnings** | Unescaped apostrophes in bookings/data-report-form |

---

## Runtime data import graph

Only these paths pull `data/` into the app bundle at runtime:

| Consumer | Imports | Approx. weight |
|----------|---------|----------------|
| `services/explorer.ts` | 50× `*-highways.ts`, `texas-highways-complete`, `texas-exits-mapping`, `us-cities-index` (50 state JSON) | **Heavy** — primary bundle cost |
| `services/location-database.ts` | `data/us-cities.ts` (tourist list only after Phase 5) | Light |

**Dead weight:** ~200+ files under `data/` and 150+ scripts never imported at runtime. Archived: census monolith + backup TS files → `data/archive/`.

---

## Module audits

### A. Core loop

**Paths:** `app/(tabs)/recorder.tsx`, `hooks/use-navigation.ts`, `hooks/use-trip-tracking.ts`, `app/(tabs)/travel-log.tsx`

| Item | Status |
|------|--------|
| Plan destination → navigate | Implemented |
| GPS recording during trip | Implemented |
| Save trip → Travel Log | Implemented |
| GPX/KML export | On trip detail |
| Route failure fallback UX | **Unverified** |
| Offline / weak network during nav | **Unverified** |
| Background/foreground stability | **Unverified** |

### B. Progression (core vision)

**Paths:** `services/explorer.ts`, `hooks/use-explorer.ts`, `app/(tabs)/explore.tsx`

| Item | Status |
|------|--------|
| Visit recording via GPS + reverse geocode | Works |
| 50-state city/county preload | **Fixed** — index rebuilt from `us-states-json/` |
| Visit persistence | **Fixed** — removed AsyncStorage wipe on mount |
| Completion % accuracy | **Fixed** — `-1` sentinel when total unknown; UI shows "N discovered" |
| Highway detection | TX-biased; CT I-95 exits pilot added |
| Wikipedia on visit | **Added** — summary cached on city/county/state |
| Google Places auto-discovery | **Disabled** |

### C. Data layer

**Paths:** `data/`, `scripts/`, `services/location-database.ts`

| Item | Status |
|------|--------|
| Census 19k cities in bundle | **Removed from runtime** (archived) |
| Per-state JSON index | 50 states, 3,113 counties, 30,546 cities |
| ETL script sprawl | 154 scripts; most frozen ([LEGACY_SCRIPTS.md](../scripts/LEGACY_SCRIPTS.md)) |
| `us-cities-types.ts` | **Fixed** — was syntactically corrupted |

### D. Pathfinder AI

**Paths:** `services/gemini-ai.ts`, `hooks/use-gemini.ts`, `components/ai-chat.tsx`

| Item | Status |
|------|--------|
| Gemini API connection | Works (`gemini-2.5-flash`) |
| Multi-turn context | **Fixed** — last 8 turns in `quickChat` prompt |
| Weather queries | Guesses only — no weather API/tool |
| Booking pipeline | Can slow/fail full pipeline; quickChat fallback exists |
| Location context | Passed from AI chat when GPS available |

### E. External APIs

| Key | Required for | Replaceable by Wikipedia? |
|-----|--------------|---------------------------|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Pathfinder | No |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Directions, reverse geocode | Partial — geocode still needed for visits |
| Google Places | Auto-discovery | **Frozen/disabled** |

### F. Secondary / pause

Per [CONSOLIDATION_PLAN.md](./CONSOLIDATION_PLAN.md): Bookings, achievements expansion, analytics — **keep hidden/deferred**. Explorer + Travel Log remain primary surfaces.

### G. Tests and evidence

| Asset | Status |
|-------|--------|
| `scripts/automated-smoke-test.js` | PASS |
| `docs/MVP_TEST_RUN_LOG.md` | Run #2 logged; #3–5 pending |
| Device matrix (Expo Go phone) | **Not completed in audit session** |

---

## Bug register

### P0 (fixed in Phase 3)

| ID | Bug | Repro | Fix |
|----|-----|-------|-----|
| P0-1 | Empty `US_STATES_WITH_COUNTIES` | Fresh install → Explorer shows 0 states | `scripts/rebuild-us-states-index.js` → 50 states |
| P0-2 | AsyncStorage wipe | Every app open clears `@nomad_explorer_data` | Removed dev block in `hooks/use-explorer.ts` L57–64 |
| P0-3 | Pathfinder loses follow-up context | "What's the weather?" then "Seymour, CT" → generic greeting | `conversationHistory` in `quickChat` prompt |
| P0-4 | Misleading 0% completion | `totalLocations === 0` shows 0% | `globalCompletionPercent = -1`; UI shows discovered count |

### P1 (open)

| ID | Bug | Repro |
|----|-----|-------|
| P1-1 | No live weather in Pathfinder | Ask weather → model guesses |
| P1-2 | Highway visits TX-centric | Non-TX I-95 visit may not attach to CT state highways |
| P1-3 | Navigation edge cases unverified | See MVP gate items |
| P1-4 | Lint errors block CI | `bookings.tsx`, `data-report-form.tsx` apostrophes |

### P2 (open)

| ID | Bug | Notes |
|----|-----|-------|
| P2-1 | Bundle size | 50 state JSON + 50 highway files |
| P2-2 | Doc drift | Old "10/10" quality report |
| P2-3 | expo-doctor SDK patches | 17 packages behind SDK 54 |

---

## Accuracy register

Places completion/stats can mislead:

| Location | Risk | Mitigation |
|----------|------|------------|
| Global completion % | Empty or partial preload | Show "N discovered"; hide % when unknown |
| County % | County created at runtime with 1 city | Denominator = cities in county only |
| Highway exit % | Only TX + I-95 CT have exit lists | Show exit count only where sourced |
| Auto-discovered cities | Wrong county from Places | **Disabled** |
| Pathfinder city facts | Shrunk location DB | Wikipedia + GPS context |
| Census coords in legacy JSON | Stale geocode batch | Frozen; not expanded |

Every displayed stat should cite source: **Wikipedia**, **GPS visit**, or **legacy static** (see DATA_STRATEGY).

---

## Phase 3–5 changes applied

- [x] P0 fixes (index, storage, chat context, stats)
- [x] `services/wikipedia.ts` + `types/wikipedia.ts`
- [x] Explorer Wikipedia excerpt on city expand
- [x] I-95 CT exit pilot (`data/i95-connecticut-exits-wikipedia.ts`)
- [x] Google Places auto-discovery disabled
- [x] Census runtime import removed; files archived
- [x] [DATA_STRATEGY_WIKIPEDIA.md](./DATA_STRATEGY_WIKIPEDIA.md)

---

## Recommended next steps

1. Complete MVP device test matrix (Expo Go phone)
2. Verify navigation P0 gate items on real device
3. Expand Wikipedia exit lists state-by-state after validating I-95 CT accuracy
4. Lazy-load state JSON per expanded state (bundle win)

**Audit exit criteria:** Met — report complete, P0s addressed, strategy doc written.
