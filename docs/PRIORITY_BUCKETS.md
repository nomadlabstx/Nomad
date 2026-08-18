# Nomad Priority Buckets

Last updated: 2026-06-20
Owner: Majim
Purpose: Single prioritized list reconciling v0.1 consolidation (current truth) with long-term product vision.

**Source of truth for reliability:** [STATE_OF_UNION.md](./STATE_OF_UNION.md) and [MVP_RELEASE_GATE.md](./MVP_RELEASE_GATE.md)  
**Source of truth for data direction:** [AUDIT_REPORT.md](./AUDIT_REPORT.md) and [DATA_STRATEGY_WIKIPEDIA.md](./DATA_STRATEGY_WIKIPEDIA.md)  
**Source of truth for ambition/backlog:** [NOMAD_MASTER_FEATURE_LIST.md](../NOMAD_MASTER_FEATURE_LIST.md) and [travel-stats-feature.plan.md](../travel-stats-feature.plan.md)

---

## Bucket 1 — Ship blockers (v0.1 must pass)

Work here until [MVP_RELEASE_GATE.md](./MVP_RELEASE_GATE.md) is PASS. No new features.

| Priority | Item | Affects | Status | Evidence needed |
|----------|------|---------|--------|-----------------|
| P0 | Route/API failure fallback UX | Navigate/Record | Unverified | Force Directions API failure; confirm retry/dismiss and readable error |
| P0 | Weak/offline network visibility during navigation | Navigate/Record | Unverified | Toggle airplane mode mid-route; confirm OfflineIndicator + usable degraded state |
| P0 | Background/foreground stability during active navigation | Navigate/Record | Unverified | Background app during route; confirm no crash/state loss on return |
| P0 | Navigation progress updates while moving | Navigate/Record | Unverified | Real device or simulator movement; route step advances |
| P1 | Complete core-loop test runs #2–#5 | All | In progress | Log each in [MVP_TEST_RUN_LOG.md](./MVP_TEST_RUN_LOG.md) |
| P1 | Gate A: app integrity on primary device | All | Partial (web OK) | Expo Go on phone: launch, Home, GPS, Travel Log without red screen |
| P1 | Gate D: trip metadata persistence (time/distance/title) | Review | Unverified | Save trip; reopen detail; confirm fields match |
| P1 | Gate D: no duplicate/corrupt entries after repeated runs | Review | Unverified | 5 saves in one session; list stays clean |
| P1 | Gate E: primary path clear from Home | Plan | Partial | Audit quick actions; hide or label secondary tabs |
| P1 | Gate E: user-readable actionable error messages | All | Unverified | Spot-check route/search/save failure copy |

### Explorer / data revamp (audit 2026-06-20 — **done**)

| Priority | Item | Status |
|----------|------|--------|
| P0 | Empty `us-cities-index` (0 states on fresh install) | **Fixed** — rebuilt from `us-states-json/` |
| P0 | AsyncStorage wipe on Explorer mount | **Fixed** |
| P0 | Pathfinder multi-turn context | **Fixed** — conversation history in prompt |
| P0 | Misleading 0% when total unknown | **Fixed** — "N discovered" UI |
| P1 | Wikipedia summaries on visit | **Done** — `services/wikipedia.ts` |
| P1 | I-95 CT exit pilot | **Done** — see `data/i95-connecticut-exits-wikipedia.ts` |
| P1 | Freeze Google Places auto-discovery | **Done** — disabled in `location-auto-discovery.ts` |
| P2 | Pathfinder live weather | Open | Needs weather API/tool |
| P2 | Lazy-load state JSON (bundle size) | Open | 50 JSON still in bundle |

**Release gate:** FAIL (navigation/device matrix — not Explorer P0s)

**Active workboard items:** [CONSOLIDATION_WORKBOARD.md](./CONSOLIDATION_WORKBOARD.md)

---

## Bucket 2 — Post-v0.1 high value (core-loop support)

Start only after Bucket 1 gate is PASS. These improve Plan → Navigate → Review without expanding scope into gamification/social.

| Priority | Item | Effort | Notes |
|----------|------|--------|-------|
| P1 | Current city/state detection for AI planner | 1–2 days | Master list item; fixes hardcoded location context |
| P1 | Voice settings UI (natural language, landmarks, speed coaching toggles) | 1–2 days | Settings exist in code; needs dedicated UI |
| P1 | Parking suggestions integration | 1–2 days | [PARKING_SUGGESTIONS.md](./PARKING_SUGGESTIONS.md) — coded, needs UI wiring |
| P2 | Explorer search (find city/county quickly) | 1–2 days | Supports review/explore without blocking MVP |
| P2 | Save favorite places (home, work, frequent) | 2–3 days | Speeds up Plan step |
| P2 | Speed camera warnings polish | 1–2 days | [SPEED_CAMERA_IMPLEMENTATION.md](./SPEED_CAMERA_IMPLEMENTATION.md) |
| P2 | Cross-platform map parity (web vs mobile) | 3–5 days | Called out as unverified in STATE_OF_UNION |
| P2 | Expo SDK patch alignment | 0.5 day | 17 packages behind SDK 54 per expo-doctor |
| P3 | Automated regression beyond static smoke | 3–5 days | Extend `scripts/automated-smoke-test.js` |

**Already implemented (remove from “next” lists):**
- Trip export GPX/KML — on trip detail page
- Trip history / Travel Log — primary MVP surface
- Multi-stop routes, AI trip planning, Explorer database

---

## Bucket 3 — Vision backlog (explicitly deferred)

No work until v0.1 stable and Bucket 2 items that support daily use are done. Tracked in workboard **Deferred (Post-v0.1)**.

### Tier 2 — Medium (weeks)
- CarPlay integration ([APPLE_MAPS_SETUP.md](../APPLE_MAPS_SETUP.md) adjacent)
- Android Auto integration
- Offline map downloads / full offline navigation
- Weather overlay on route
- Traffic incident reports (crowdsourced)
- Route history (save/replay favorite routes)

### Tier 3 — Large (1–2+ weeks each)
- Achievement/gamification expansion (115+ achievements, RPG overlay deepening)
- Social features (share trips, friends, challenges)
- Photo scrapbook tied to locations
- Web dashboard for stats and maps
- Apple Watch navigation
- Dark mode polish (partial theme support exists)

### Phases 3–4+ (months)
- Road completion tracking by percentage
- Safety: emergency SOS, crash detection, live location sharing
- Monetization: freemium tier ($4.99/mo per master list)
- Traffic light countdown, scenic routes, audio tour guide
- Global expansion beyond US Explorer data
- **THE TRUE NOMAD** long-horizon achievement quest

### Pause per consolidation (code stays, no expansion)
- Booking flow expansion
- Advanced analytics dashboard
- New external integrations / large data additions
- Pathfinder AI as default primary tab

---

## Overlap flags (vision vs consolidation)

| Vision doc claim | Consolidation reality | Bucket |
|------------------|----------------------|--------|
| "Production ready" (travel-stats plan) | MVP gate FAIL | Bucket 1 first |
| Trip export "needs implementation" (master list) | Already on trip detail | Remove from Bucket 2 |
| Achievement system "complete" | Paused; unverified for release | Bucket 3 |
| 155+ features planned | Freeze until v0.1 PASS | Bucket 3 |
| CarPlay "must-have before launch" (master list) | Deferred post-v0.1 | Bucket 3 |

---

## Recommended execution order

1. **This week:** Bucket 1 P0 items on primary phone (Expo Go)
2. **Log runs #2–#5** in [MVP_TEST_RUN_LOG.md](./MVP_TEST_RUN_LOG.md)
3. **When gate PASS:** Pick 1–2 Bucket 2 P1 items per week
4. **Quarterly:** Revisit Bucket 3 against actual usage data

See [DAILY_OPERATING_RHYTHM.md](./DAILY_OPERATING_RHYTHM.md) for day-to-day cadence.
