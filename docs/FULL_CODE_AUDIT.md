# Nomad Full Code Audit

Last updated: 2026-06-20  
Owner: Majim  
Purpose: Baseline audit before any further feature work. Read this before changing code.

**Scope:** Application source (`app/`, `components/`, `hooks/`, `services/`, `utils/`, `types/`, `constants/`), data layer impact, scripts inventory, lint/static analysis, and alignment with consolidation docs.

**Not literally every line:** The repo contains ~200k+ lines of static geography data and 154 maintenance scripts. This audit covers all runtime application code and flags data/script debt separately.

---

## Executive Summary

Nomad is a **feature-rich prototype**, not a reliable daily-use MVP. The codebase has broad surface area (~40k lines of app logic excluding bulk `data/`) but **critical bugs, zero unit tests, and architectural debt** undermine the core loop and secondary features.

| Area | Verdict |
|------|---------|
| Core loop (Plan → Navigate → Record → Review) | Implemented, partially verified, fragile |
| Pathfinder AI | Connects to Gemini after recent fixes; **lackluster** due to no conversation memory, contradictory prompts, and heavy fallback paths |
| Explorer / Checklist | **Broken for fresh installs** (empty city index + data wipe on mount) |
| GPS / Navigation | Substantial implementation; env key split and network-status bugs |
| Bookings / Achievements | Present; many stubs, hardcoded progress, paused per consolidation |
| Test coverage | **Critical gap** — no Jest/Vitest; only static smoke script |
| Bundle / startup | **High risk** — 40k–60k+ lines of static data on hot paths |
| Documentation | Two eras (consolidation vs vision); partially reconciled June 2026 |

**Recommendation:** Enter a **fix-only phase** using [PRIORITY_BUCKETS.md](./PRIORITY_BUCKETS.md) Bucket 1, plus critical bugs from this audit. No new features until Critical + High items in §3–4 are addressed.

---

## Codebase Scale

| Layer | Files (approx.) | Lines (approx.) | Notes |
|-------|-----------------|-----------------|-------|
| `app/` | 14 | 7,550 | Tab screens + trip detail |
| `components/` | 39 | 9,220 | Heavy GPS + AI clusters |
| `hooks/` | 10 | 1,610 | Navigation, explorer, Gemini |
| `services/` | 32 | 8,900 | Business logic + APIs |
| `types/` | 14 | 1,050 | Some duplicate/unused |
| `utils/` | 7 | 735 | 2 modules unused |
| `constants/` | 1 | 49 | Theme only |
| `data/` | 115+ | **200,000+** | Dominated by state/city/highway TS |
| `scripts/` | 154 | — | ETL/maintenance; 2 wired in npm |

**Largest screens (logic + UI in one file):** `settings.tsx` (1,518), `explore.tsx` (1,282), `bookings.tsx` (943), `recorder.tsx` (863), `ai-chat.tsx` (894).

---

## Why Pathfinder Feels Lackluster (Your Screenshot)

Observed behavior: asks for location on “What’s the weather?”, then after “Seymour, CT” gives a generic greeting instead of weather.

| Cause | Detail |
|-------|--------|
| **No conversation memory in `quickChat`** | Each message is a **standalone** prompt. Follow-ups do not include prior user/assistant turns unless the heavy `runIntelligentChat` path runs (and it often doesn’t). |
| **`clearChat` doesn’t clear service memory** | `use-gemini.ts` clears UI messages only; `geminiService` conversation history persists inconsistently. |
| **Contradictory system prompts** | `gemini-ai.ts` mixes “admit knowledge gaps,” “never be generic,” and “never mention external apps” — model hedges or deflects. |
| **Weather isn’t a first-class capability** | No weather API integration; model must guess or ask for location, then still may refuse without live data. |
| **Location context optional** | `ai-chat.tsx` passes location only when reverse geocode succeeds; web/desktop often has no GPS. |
| **Fallback messaging was misleading** | “Enhanced Mode” / “Enable Gemini API” appeared when API failed; now partially fixed with `quickChat`. |

Pathfinder **works at the API level** (`node scripts/test-gemini-connection.js` → PASS) but **product logic is not conversation-aware**.

---

## §3 Critical Bugs (Fix Before Anything Else)

These can cause silent data loss, runtime errors, or empty features.

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| C-1 | **Explorer data wiped on every app open** | `hooks/use-explorer.ts` L57–64 — `TEMPORARY` `AsyncStorage.removeItem('@nomad_explorer_data')` on mount | All explorer progress deleted each session |
| C-2 | **Empty US city index** | `data/us-cities-index.ts` — `US_STATES_WITH_COUNTIES: []` | Fresh explorer installs get 0 states/counties/cities |
| C-3 | **`const prompt` reassignment** | `services/gemini-ai.ts` L127, L163 — `const prompt = ...` then `prompt = sanitize...` | **Runtime TypeError** on trip plan paths (illegal assignment) |
| C-4 | **Streamed trip plan text duplication** | `streamTripPlan` yields cumulative chunks; `use-gemini.ts` L244 uses `+= chunk` | Garbled/duplicated AI trip plan output |
| C-5 | **Onboarding questions never recorded** | `user-onboarding.ts` — `recordQuestion()` never called | Onboarding stuck forever at question 0 |
| C-6 | **Reverse geocode API key mismatch** | `reverse-geocoding.ts` uses `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY`; most app uses `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | “Unknown” city/location everywhere if keys differ |
| C-7 | **Network status always “online”** | `network-status.ts` — `fetch` with `mode: 'no-cors'` | Offline indicator unreliable |
| C-8 | **Zero unit tests** | No test runner; `test:smoke` is string grep only | No regression safety net |

---

## §4 High Priority by Domain

### 4.1 AI / Pathfinder

| ID | Issue | Location |
|----|-------|----------|
| H-A1 | No multi-turn context in primary `quickChat` path | `services/gemini-ai.ts` |
| H-A2 | Prompt contradictions (specificity vs honesty vs anti-Google-Maps) | `gemini-ai.ts` buildChatPrompt / buildTripPlanPrompt |
| H-A3 | `location-database` not initialized except in full pipeline | `location-database.ts`, `gemini-ai.ts` |
| H-A4 | Fake streaming (full response + word delay) | `gemini-ai.ts`, `use-gemini.ts` |
| H-A5 | Hardcoded Dallas fallback trip data | `getFallbackResponse()` |
| H-A6 | Flight booking origin/destination swapped | `conversational-booking.ts` L158 |
| H-A7 | ~19k census cities loaded for AI context | `location-database.ts` → bundle bloat |

### 4.2 GPS / Navigation / Core Loop

| ID | Issue | Location |
|----|-------|----------|
| H-G1 | GPS tab imports full explorer + achievements stack | `recorder.tsx` → `RPGNavigationOverlay`, `use-achievements` |
| H-G2 | 50 state highway files imported; most init methods unused | `services/explorer.ts` |
| H-G3 | Off-route recalc drops origin/options | `use-navigation.ts` L221 |
| H-G4 | Multi-leg routes use `legs[0]` only | `route-matching.ts` |
| H-G5 | Directions API: no `response.ok` check | `navigation.ts` |
| H-G6 | MapKit polyline encoder likely wrong | `mapkit-routing.ts` |
| H-G7 | Speed camera user reports ignored in alerts | `speed-camera.ts` |

### 4.3 Storage / Data Integrity

| ID | Issue | Location |
|----|-------|----------|
| H-D1 | Trip validation weak on read | `utils/storage.ts` |
| H-D2 | User prefs from storage not schema-validated | `user-preferences.ts` |
| H-D3 | Achievement progress hardcoded to `1` | `use-achievements.ts` |
| H-D4 | Booking getters skip `initialize()` | `booking.ts`, `booking-context.ts` |
| H-D5 | Offline cache unbounded | `offline-cache.ts` |

### 4.4 UI / Architecture

| ID | Issue | Location |
|----|-------|----------|
| H-U1 | Tab bar hidden; custom drawer duplicates `@react-navigation/drawer` dep | `(tabs)/_layout.tsx`, `app-drawer.tsx` |
| H-U2 | Explorer labeled “Checklist” in nav | `(tabs)/_layout.tsx`, drawer |
| H-U3 | Screen bloat — business logic in 800–1500 line screens | `settings`, `explore`, `bookings`, `recorder` |
| H-U4 | Expo template dead code | `modal.tsx`, `hello-wave.tsx`, `parallax-scroll-view.tsx`, `external-link.tsx` |
| H-U5 | Duplicate type files | `types/data-report.ts` vs `data-reports.ts`; empty `reports.ts` |

---

## §5 MVP Core Loop vs Consolidation Docs

Per [STATE_OF_UNION.md](./STATE_OF_UNION.md) and [MVP_RELEASE_GATE.md](./MVP_RELEASE_GATE.md):

| Step | Code exists | Verified reliable |
|------|-------------|-------------------|
| Plan destination | Yes | Partial |
| Navigate + record | Yes | Partial |
| Review in Travel Log | Yes | Partial (persistence OK) |
| Permission recovery | Yes | Verified |
| Route failure fallback | Partial | **No** |
| Offline UX | Partial | **No** |
| Background stability | Unknown | **No** |

Release gate: **FAIL** (Run #2 logged; device runs still needed).

---

## §6 Static Analysis (ESLint)

`npm run lint` — **2 errors, 26 warnings**

**Errors (must fix for clean CI):**
- `app/(tabs)/bookings.tsx` L678 — unescaped `'`
- `components/data-report-form.tsx` L128 — unescaped `'`

**Common warnings:** duplicate React imports, missing hook dependencies, unused vars.

TypeScript: `tsc --noEmit` previously hit stack overflow (large `data/` types in project graph).

---

## §7 Security & Configuration

| Item | Status |
|------|--------|
| API keys in `.env` / `.env.local` | Present; `.env.local` must not override Gemini with Maps key |
| `EXPO_PUBLIC_*` keys in client bundle | Expected for Expo; keys are extractable from app |
| Google Maps key formats mixed | Legacy `AIza...` vs newer `AQ....` format in `.env` |
| No secrets in git (`.env` local) | `.env*.local` gitignored; verify `.env` not committed |
| Affiliate / booking URLs | Generated without validating affiliate IDs |

---

## §8 Documentation Drift

| Doc | Issue |
|-----|-------|
| `docs/CLEANUP_SUMMARY.md` | Claims only `reset-project.js` kept; **154 scripts** exist |
| `docs/CENSUS_DATABASE_IMPLEMENTATION.md` | Says 500 cities; file has **19,476** |
| `travel-stats-feature.plan.md` | Was “PRODUCTION READY”; reconciled June 2026 |
| `NOMAD_MASTER_FEATURE_LIST.md` | Vision backlog; trip export/history marked done in reconciliation |
| `docs/README.md` | Rewritten June 2026; points to consolidation docs |

**Trust order:** [STATE_OF_UNION.md](./STATE_OF_UNION.md) → [MVP_RELEASE_GATE.md](./MVP_RELEASE_GATE.md) → [PRIORITY_BUCKETS.md](./PRIORITY_BUCKETS.md) → this audit.

---

## §9 Testing Gap

| What exists | What’s missing |
|-------------|----------------|
| `scripts/automated-smoke-test.js` — 6 file pattern checks | Unit tests for `utils/calculations`, `storage`, `location` |
| Manual checklists in `docs/` | Component tests (RNTL) |
| `scripts/test-gemini-connection.js` — API connectivity | Integration tests for core loop |
| MVP test run log (1–2 runs) | CI pipeline |

`.cursorrules` testing strategy is **documented but not implemented**.

---

## §10 Recommended Fix Order (Post-Audit)

Do not start new features until these complete phases:

### Phase 0 — Stop the bleeding (1–2 days)
1. Remove explorer AsyncStorage wipe (`use-explorer.ts` C-1)
2. Fix `const prompt` → `let prompt` (`gemini-ai.ts` C-3)
3. Fix stream accumulation (`use-gemini.ts` C-4)
4. Fix or regenerate `us-cities-index.ts` (C-2)
5. Align reverse geocode API key env var (C-6)

### Phase 1 — Core loop + Pathfinder usable (3–5 days)
1. MVP release gate device runs (#3–#5 in test log)
2. Pathfinder: add **conversation history** to `quickChat` (last N turns)
3. Pathfinder: simplify system prompt; remove contradictions
4. Route failure + offline UX verification/fixes
5. Fix lint errors (2)

### Phase 2 — Stability & performance (1–2 weeks)
1. Lazy-load explorer/highway data off GPS hot path
2. Decouple achievements/RPG overlay from recorder MVP path (or hide)
3. Add Jest + tests for critical utils
4. Fix network-status, booking onboarding, achievement progress stubs
5. Remove dead template code and duplicate types

### Phase 3 — Post-v0.1 (per PRIORITY_BUCKETS Bucket 2+)
Only after MVP gate PASS.

---

## §11 File-Level Inventory (Runtime)

### Tab screens
| Route | Lines | Role |
|-------|-------|------|
| `index.tsx` | 191 | Home hub |
| `ai-assistant.tsx` | 334 | Pathfinder entry |
| `recorder.tsx` | 863 | GPS + navigation |
| `travel-log.tsx` | 559 | Trip history |
| `explore.tsx` | 1,282 | Location explorer |
| `planned-trips.tsx` | 774 | Saved itineraries |
| `achievements.tsx` | 445 | Gamification |
| `bookings.tsx` | 943 | Bookings |
| `settings.tsx` | 1,518 | Preferences |

### Services (all 32 audited)
Core: `navigation.ts`, `gemini-ai.ts`, `explorer.ts`, `google-places.ts`, `reverse-geocoding.ts`, `offline-cache.ts`, `network-status.ts`, `user-preferences.ts`, `user-onboarding.ts`, `conversational-booking.ts`, `booking.ts`, `booking-context.ts`, `planned-trips.ts`, `achievements.ts`, `location-database.ts`, `location-auto-discovery.ts`, plus routing/mapkit/speed/voice/analytics helpers.

### Hooks (all 9 audited)
`use-navigation`, `use-trip-tracking`, `use-gemini`, `use-explorer`, `use-achievements`, theme/color scheme hooks.

---

## §12 What This Audit Does Not Cover

- Line-by-line review of 200k+ lines in `data/us-states/*.ts`
- Execution of all 154 maintenance scripts
- Production EAS build configuration
- App Store / Play Store compliance
- Legal review of affiliate booking links

---

## Next Step

Use this document as the **gate** before implementation. When ready to execute, start **Phase 0** only — no parallel feature work.

Cross-reference: [CONSOLIDATION_WORKBOARD.md](./CONSOLIDATION_WORKBOARD.md), [PRIORITY_BUCKETS.md](./PRIORITY_BUCKETS.md).
