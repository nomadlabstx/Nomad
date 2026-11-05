# Nomad Master Task List

Last updated: 2026-11-05 (America/Chicago)  
Owner: Majim  
Active branch: `cursor/november-mvp-continuation-7c25`  
Source boards: [mvp-october](./mvp-october/README.md), [MVP Release Gate](./MVP_RELEASE_GATE.md), [Consolidation Workboard](./CONSOLIDATION_WORKBOARD.md)

This is the single ordered queue. Work top-down. Do not start later phases until earlier Pass criteria are met (except prep that does not require a device).

---

## Phase 0 — Bring the stack current (agent can finish)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Branch from `cursor/october-mvp-795e` (PRs #3–#6 + store identity) | **Done** | `cursor/november-mvp-continuation-7c25` |
| 0.2 | Land missing PR #2 core-loop bugfixes onto that tip | **Done** | Waypoints, trip save lock, GPX/KML XML escape, network probe, `npm test` |
| 0.3 | Land PR #1 Aug audit pointer in docs index | **Done** | Linked from `docs/README.md` via 31 Aug audit |
| 0.4 | `npm test` | **Done** | 129 pass / 0 fail |
| 0.5 | `npm run test:smoke` | **Done** | Passed |
| 0.6 | `npm run test:phase1` | **Done** | Passed (Maps/Gemini key warnings expected without EAS env) |
| 0.7 | Refresh MVP docs for post–31 Oct reality | **Done** | See `docs/mvp-october/` + this file |
| 0.8 | Phase 2 prep: Loop/FM stay-on ranking + offline route error UX | **Done** | Unit-tested; device still required for Pass |

---

## Phase 1 — Installable TestFlight (was 6–12 Oct; still the blocker)

Goal: drive a **production iOS build**, not Expo Go.

| # | Task | Status | Owner | Blocked by |
|---|------|--------|-------|------------|
| 1.1 | Link Expo / EAS project (`eas init`) into `app.json` | **Done** | Agent | Project `adc0e18c-6f98-4d6c-8dec-f688c46f5bc9` |
| 1.2 | Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` on expo.dev **production** (+ preview) | Blocked | Human | Keys in password manager / Google Cloud |
| 1.3 | Set `EXPO_PUBLIC_GEMINI_API_KEY` on expo.dev **production** (+ preview) | Blocked | Human | Gemini key |
| 1.4 | Confirm Apple bundle `com.nomadlabstx.nomad` (or change before first upload) | Blocked | Human | Apple Developer account |
| 1.5 | Fill `eas.json` → `submit.production.ios` with `appleId`, `appleTeamId`, `ascAppId` | Blocked | Human | App Store Connect app |
| 1.5b | Interactive Apple Distribution credentials (`eas credentials`) | Blocked | Human | Non-interactive EAS build failed here 2026-11-05 |
| 1.6 | Add GitHub secret `EXPO_TOKEN` for `.github/workflows/eas-ios-testflight.yml` | Blocked | Human | Repo secrets |
| 1.7 | `npm run eas:ios` (or `eas:testflight`) production build | Blocked | Agent+Human | 1.2–1.5b |
| 1.8 | `npm run eas:submit` → TestFlight | Blocked | Agent+Human | 1.7 + Apple submit fields |
| 1.9 | Device pass on TestFlight binary | Blocked | Human | 1.8 |
| | — Install from TestFlight | | | |
| | — GPS opens; location permission uses extra-miler copy | | | |
| | — Place identity shows road / town / county | | | |
| | — A route starts | | | |
| | — Stop + save; trip in Travel Log | | | |
| 1.10 | Log device pass in [MVP_TEST_RUN_LOG.md](./MVP_TEST_RUN_LOG.md); tick Phase 1 Pass | Pending | Human | 1.9 |

**Already done on the October branch:** store IDs, EAS profiles, location purpose strings, `app.config.js` Maps key inject, shared `getGoogleMapsApiKey()`, phase1 checker, TestFlight operator script, GitHub Action workflow file.

---

## Phase 2 — Extra-miler truth (after Phase 1 Pass)

| # | Task | Status | Prep without device? |
|---|------|--------|----------------------|
| 2.1 | Highway / county / exit checkoff correct on a real interstate drive | Pending | Code review + unit tests only |
| 2.2 | Pathfinder “stay on Loop 340 / I-35” survives recalc (no silent shortcut) | Pending | Unit tests exist in `utils/__tests__/preferred-highways.test.ts` |
| 2.3 | Gate C: route/API failure fallback on device | Pending | Code path review |
| 2.4 | Gate C: airplane mode / offline indicator usable mid-nav | Pending | `services/network-status.ts` + `utils/connectivity.ts` |
| 2.5 | Gate C: background → foreground during navigation stable | Pending | Needs phone |

Pass: one interstate drive checks off the right road/county; stay-on-highway does not shortcut.

---

## Phase 3 — Live like the user (after Phase 2 Pass)

| # | Task | Status |
|---|------|--------|
| 3.1 | Two full extra-miler TestFlight drives logged | Pending |
| 3.2 | Log crashes, wrong town names, lost recording, bad stay-on | Pending |
| 3.3 | Privacy policy + location purpose strings ready to paste | Pending |
| 3.4 | Screenshots + extra-miler App Store copy | Pending |

Pass: two drives without losing the trip; listing + privacy ready.

---

## Phase 4 — Ship what you drove (after Phase 3 Pass)

| # | Task | Status |
|---|------|--------|
| 4.1 | Fix only what the two drives broke | Pending |
| 4.2 | If Gates B–C green → App Review submit | Pending |
| 4.3 | Else freeze TestFlight as the daily-driver MVP | Pending |

---

## Gate leftovers (parallel once Phase 1 binary exists)

From [MVP_RELEASE_GATE.md](./MVP_RELEASE_GATE.md) — still FAIL:

- Gate B: navigation progress updates while moving
- Gate C: API failure / offline / background (same as 2.3–2.5)
- Gate D: trip metadata persistence; no duplicate/corrupt entries
- Gate E: primary path clear from Home; secondary paths labeled; actionable errors

---

## Explicitly deferred (do not pull into this queue)

Bookings expansion, Tesla 3D renderer, CarPlay / Android Auto, national camera completeness, RPG overlay, social, Checklist / Travel Log visual rewrite, “new miles” chips polish.

---

## Agent progress log

- 2026-11-05: Created continuation branch from October MVP tip; cherry-picked PR #2 with conflict resolution (kept SDK 57 File API + place-identity geocode + EAS scripts; restored AI-plan achievement + XML-safe trip export + unit tests). All automated checks green.
- 2026-11-05: Linked EAS project under `@theimprovisedpixel/Nomad`. Non-interactive iOS production build failed: no Maps/Gemini env vars; Apple Distribution credentials require interactive setup.
- 2026-11-05: Phase 2/Gate C prep — parse Loop/FM in stay-on ranking; offline route errors show Retry + suggestions; OfflineIndicator copy cleaned.
