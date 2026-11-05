# Nomad Master Task List

Last updated: 2026-11-04 (America/Chicago)  
Owner: Majim  
Active branch: `cursor/november-mvp-continuation-7c25`  
Source boards: [mvp-october](./mvp-october/README.md), [MVP Release Gate](./MVP_RELEASE_GATE.md), [Consolidation Workboard](./CONSOLIDATION_WORKBOARD.md)

This is the single ordered queue. Work top-down. Do not start later phases until earlier Pass criteria are met (except prep that does not require a device).

## Ship decision (2026-11-04)

**Official personal MVP target: Expo Go on a real iPhone.**  
Paid Apple Developer ($99) / TestFlight / App Store are **deferred** until membership is worth it. Do not block Phases 2–4 on store binaries.

---

## Phase 0 — Bring the stack current (agent can finish)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Branch from `cursor/october-mvp-795e` (PRs #3–#6 + store identity) | **Done** | `cursor/november-mvp-continuation-7c25` |
| 0.2 | Land missing PR #2 core-loop bugfixes onto that tip | **Done** | Waypoints, trip save lock, GPX/KML XML escape, network probe, `npm test` |
| 0.3 | Land PR #1 Aug audit pointer in docs index | **Done** | Linked from `docs/README.md` via 31 Aug audit |
| 0.4 | `npm test` | **Done** | 135 pass / 0 fail (after Loop/FM + error-message tests) |
| 0.5 | `npm run test:smoke` | **Done** | Passed |
| 0.6 | `npm run test:phase1` | **Done** | Passed (Maps/Gemini key warnings expected without env) |
| 0.7 | Refresh MVP docs for post–31 Oct reality | **Done** | See `docs/mvp-october/` + this file |
| 0.8 | Phase 2 prep: Loop/FM stay-on ranking + offline route error UX | **Done** | Unit-tested; device still required for Pass |
| 0.9 | Retarget Phase 1 to Expo Go personal MVP (no Apple fee) | **Done** | This revision |

---

## Phase 1 — Expo Go personal MVP (active)

Goal: you are driving Nomad on your iPhone in **Expo Go** with Maps + Gemini working. No paid Apple membership required.

| # | Task | Status | Owner | Blocked by |
|---|------|--------|-------|------------|
| 1.1 | Link Expo / EAS project (`eas init`) into `app.json` | **Done** | Agent | Project `adc0e18c-6f98-4d6c-8dec-f688c46f5bc9` |
| 1.2 | Create Google Maps API key (Directions, Geocoding, Places New, Maps SDK iOS, Roads) | **Done / confirm** | Human | Key exists with those APIs |
| 1.3 | Create Gemini API key | Pending | Human | AI Studio / Cloud |
| 1.4a | Put both keys in a **local** `.env` (gitignored) for Expo Go | Pending | Human | 1.2–1.3 |
| 1.4b | Optional: also set both on expo.dev → **development** / preview env | Optional | Human | Nice for cloud builds later |
| 1.5 | Checkout branch, `npm install`, `npx expo start`, open in Expo Go | Pending | Human | 1.4a |
| 1.6 | Device pass on Expo Go | Pending | Human | 1.5 |
| | — GPS opens; location permission uses extra-miler copy | | | |
| | — Place identity shows road / town / county | | | |
| | — A route starts | | | |
| | — Stop + save; trip in Travel Log | | | |
| 1.7 | Log device pass in [MVP_TEST_RUN_LOG.md](./MVP_TEST_RUN_LOG.md); tick Phase 1 Pass | Pending | Human | 1.6 |

### Local `.env` template (never commit)

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

### Run

```bash
git checkout cursor/november-mvp-continuation-7c25
npm install
npx expo start
# scan QR with Expo Go on iPhone (same Wi‑Fi / tunnel if needed)
```

---

## Deferred — TestFlight / App Store (paid Apple membership)

Do **not** start until you explicitly decide to renew Apple Developer (~$99/yr).

| # | Task | Status |
|---|------|--------|
| T.1 | Renew Apple Developer Program membership | Deferred |
| T.2 | Confirm bundle `com.nomadlabstx.nomad` + App Store Connect app | Deferred |
| T.3 | Interactive `eas credentials` + `eas.json` submit fields | Deferred |
| T.4 | Set Maps/Gemini on EAS **production** env | Deferred |
| T.5 | `npm run eas:testflight` + TestFlight device pass | Deferred |
| T.6 | Optional GitHub `EXPO_TOKEN` for workflow | Deferred |

Store wiring already in the repo (EAS profiles, bundle ID, location strings, workflow) stays; it just is not the active ship bar.

---

## Phase 2 — Extra-miler truth (after Phase 1 Expo Go Pass)

Same criteria; runs on **Expo Go drives**.

| # | Task | Status | Prep without device? |
|---|------|--------|----------------------|
| 2.1 | Highway / county / exit checkoff correct on a real interstate drive | Pending | Code review + unit tests only |
| 2.2 | Pathfinder “stay on Loop 340 / I-35” survives recalc (no silent shortcut) | Pending | Unit tests exist |
| 2.3 | Gate C: route/API failure fallback on device | Pending | Retry UX landed; needs phone proof |
| 2.4 | Gate C: airplane mode / offline indicator usable mid-nav | Pending | Code present |
| 2.5 | Gate C: background → foreground during navigation stable | Pending | Needs phone; Expo Go may kill background GPS — note in log |

Pass: one interstate drive checks off the right road/county; stay-on-highway does not shortcut.

---

## Phase 3 — Live like the user (after Phase 2 Pass)

| # | Task | Status |
|---|------|--------|
| 3.1 | Two full extra-miler **Expo Go** drives logged | Pending |
| 3.2 | Log crashes, wrong town names, lost recording, bad stay-on | Pending |
| 3.3 | Privacy policy draft (optional until store) | Deferred with store |
| 3.4 | Screenshots + App Store copy | Deferred with store |

Pass: two drives without losing the trip; you trust Nomad as the atlas.

---

## Phase 4 — Ship what you drove (after Phase 3 Pass)

| # | Task | Status |
|---|------|--------|
| 4.1 | Fix only what the two drives broke | Pending |
| 4.2 | Freeze **Expo Go** as the daily-driver personal MVP | Pending |
| 4.3 | When ready to pay Apple: resume Deferred TestFlight track | Deferred |

---

## Gate leftovers (parallel once Phase 1 Expo Go pass exists)

From [MVP_RELEASE_GATE.md](./MVP_RELEASE_GATE.md) — still FAIL until proven on phone:

- Gate B: navigation progress updates while moving
- Gate C: API failure / offline / background (same as 2.3–2.5)
- Gate D: trip metadata persistence; no duplicate/corrupt entries
- Gate E: primary path clear from Home; secondary paths labeled; actionable errors

Note Gate C background: Expo Go cannot match a store binary for background location. Log what happens; do not treat Expo Go background kills as a store blocker until TestFlight exists.

---

## Explicitly deferred (do not pull into this queue)

Paid Apple membership / TestFlight / App Review, bookings expansion, Tesla 3D renderer, CarPlay / Android Auto, national camera completeness, RPG overlay, social, Checklist / Travel Log visual rewrite, “new miles” chips polish.

---

## Agent progress log

- 2026-11-05: Created continuation branch from October MVP tip; cherry-picked PR #2; linked EAS; Loop/FM + offline Retry UX; tests green.
- 2026-11-04 (evening CT): Retargeted ship bar to Expo Go personal MVP; TestFlight parked until Apple membership is renewed on purpose.
