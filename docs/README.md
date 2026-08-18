# 📚 Nomad Documentation

## Current truth (start here)

For **what works today** and v0.1 release status, read these first:

- **[State of the Union](./STATE_OF_UNION.md)** — Implemented / Verified / Unverified
- **[Consolidation Plan](./CONSOLIDATION_PLAN.md)** — 14-day scope and engineering freeze
- **[Consolidation Workboard](./CONSOLIDATION_WORKBOARD.md)** — Active task queue
- **[Priority Buckets](./PRIORITY_BUCKETS.md)** — Ship blockers vs post-v0.1 vs vision backlog
- **[MVP Release Gate](./MVP_RELEASE_GATE.md)** — Pass/fail checklist (currently FAIL)
- **[MVP Test Run Log](./MVP_TEST_RUN_LOG.md)** — Run-by-run evidence

See also **[CHECKLISTS.md](../CHECKLISTS.md)** for the full index.

---

## Long-term vision and feature inventory

### **[Master Feature List](../NOMAD_MASTER_FEATURE_LIST.md)**
Executive summary: 45+ implemented, 155+ planned, competitive positioning, monetization, timeline.

> **Note:** Vision docs describe code that exists. Reliability claims defer to STATE_OF_UNION and MVP_RELEASE_GATE.

### **[Implementation Audit](../travel-stats-feature.plan.md)**
Detailed feature-by-feature audit (Dec 2024), architecture, and recent fixes.

> **Note:** "Production ready" in this file is outdated. v0.1 consolidation gate is the current bar.

---

## Quick validation

- **[Smoke Test Checklist](./SMOKE_TEST_CHECKLIST.md)** — 5–10 minute core loop pass
- **[First Hour Back](./FIRST_HOUR_BACK.md)** — Re-entry after time away
- **[Daily Operating Rhythm](./DAILY_OPERATING_RHYTHM.md)** — Solo-founder cadence

Run automated static checks: `npm run test:smoke`

---

## Resources and APIs

Required services (no separate RESOURCES_NEEDED.md — summarized here):

| Resource | Purpose |
|----------|---------|
| Node.js 18+ (LTS 20+ recommended) | Runtime |
| npm / Expo SDK 54 | Dependencies and dev server |
| Google Maps API keys | Navigation, geocoding, maps |
| Google Gemini API key | Pathfinder AI |
| Google Places API | Location search and recommendations |
| Expo Go (mobile) | Device testing |

Environment variables (`.env`):

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_GEMINI_API_KEY=
```

See [README.md](../README.md) for full API list and setup.

Budget tracking: [NOMAD_FINANCIAL_TRACKER.md](../NOMAD_FINANCIAL_TRACKER.md)

---

## Feature deep dives

Implementation specs live in `docs/` — examples:

- GPS: [GPS_IMPLEMENTATION_SUMMARY.md](./GPS_IMPLEMENTATION_SUMMARY.md)
- Location data: [LOCATION_DATABASE_STRATEGY.md](./LOCATION_DATABASE_STRATEGY.md), [CENSUS_DATABASE_IMPLEMENTATION.md](./CENSUS_DATABASE_IMPLEMENTATION.md)
- Navigation UX: [LANDMARK_NAVIGATION.md](./LANDMARK_NAVIGATION.md), [MULTI_STOP_PLANNING.md](./MULTI_STOP_PLANNING.md)
- Explorer: [EXIT_TRACKING_SYSTEM.md](./EXIT_TRACKING_SYSTEM.md)
- AI: [AI_ACCURACY_IMPROVEMENTS.md](./AI_ACCURACY_IMPROVEMENTS.md)

---

## Archive

Older strategy docs in `archive/`:

- `ai-first-strategy.md`
- `ai-testing-guide.md`
- `gemini-ai-examples.md`
