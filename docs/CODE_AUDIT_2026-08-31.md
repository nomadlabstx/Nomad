# Nomad Code Audit — 31 Aug 2026

**Supersedes:** [CODE_AUDIT_2026-08-18.md](./CODE_AUDIT_2026-08-18.md) (if present) and [FULL_CODE_AUDIT.md](./FULL_CODE_AUDIT.md) (20 Jun 2026).

**Repo:** https://github.com/nomadlabstx/Nomad  
**How to read this:** Verdict first, then what this pass actually fixed, then remaining debt.

---

## Verdict

Nomad is still a **working personal MVP**. The August device loop (Pathfinder → GPS → Travel Log → Go again) stands. This pass was a **debug + fix** review of the current tree, not a feature dump.

The important change: several bugs that could **drop stops, lose a just-saved trip, or fail export** are now patched in code. They still need a phone pass after you pull this branch.

| Area | Now |
|------|-----|
| Plan → Navigate → Record → Review | Device-proven in August; Planned Trips → Navigate no longer drops waypoints |
| Pathfinder | Unchanged (still the in-tab chat path) |
| Multi-stop from GPS tab | Last stop is the end (August) |
| Multi-stop from Planned Trips | **Was broken** (waypoints discarded); **fixed** via pending plan handoff |
| Travel Log title backfill | **Was a race** that could wipe a new trip; **fixed** under the storage lock |
| GPX / KML | Used the SDK 54 FileSystem API that throws at runtime; now `expo-file-system/legacy` + XML-escaped names |
| Tests | `npm test` wired with `tsx`; export / connectivity / multi-stop plan tests added |
| Release | Still a personal Expo app |

---

## What this pass fixed (31 Aug)

| ID | Bug | Severity | Fix |
|----|-----|----------|-----|
| D-1 | Planned Trips **Navigate** calculated a route on a throwaway hook, then opened GPS with dest-only params | Wrong route | `pendingPlanFromPlannedTrip` + `applySavedPlan` (same channel as Pathfinder) |
| D-2 | Travel Log `saveTrips(resolved)` from a stale snapshot | Data loss | `backfillTripNames()` inside `enqueueTripMutation` |
| D-3 | GPX/KML `writeAsStringAsync` on default `expo-file-system` (SDK 54 throws) | Silent fail | Import `expo-file-system/legacy` |
| D-4 | Trip names with `&` / `<` broke GPX/KML | Corrupt export | `escapeXml` in `utils/trip-export.ts` |
| D-5 | `addTrip` false was ignored; 0-meter paths discarded | Data loss | Check write result; save path with ≥1 point; recompute meters |
| D-6 | Auto-record `start()` fire-and-forget, no retry | Missed Travel Log | Await + one retry; `start()` no-ops if already tracking |
| D-7 | Maps services read only `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` at module load | Silent fail | `getGoogleMapsApiKey()` at call time |
| D-8 | Network check: `no-cors` HEAD then always `return true`; timer leak on throw | False online | `generate_204`, status check, `finally` clearTimeout |
| D-9 | Start voice used first leg end (a stop), not the destination | Wrong UX | Last leg / destination label |
| D-10 | Progress % was first-leg-only | Wrong UX | Distance-weighted across legs |
| D-11 | `getNavigationUpdate` crashed if leg/step missing | Crash | Guard before `.steps` / `.endLocation` |
| D-12 | Arrival did not stop GPS simulator | Next-trip origin wrong | `gpsSimulator.stop()` in `handleArrival` |
| D-13 | Planned Trips save swallowed AsyncStorage errors | Silent fail | `save()` returns boolean; `addTrip` rolls back and throws |
| D-14 | Directions `json()` without `response.ok` | Opaque errors | Throw on HTTP failure |
| D-15 | Tests not runnable (`npm test` missing; Node ESM imports) | Process | `"test": "tsx --test …"` |

Skipped on purpose (still skip unless they bite you): unused `routing-service.ts`, traffic overlay indexes, 50k-point path vs meters, Explorer/bookings expansion.

---

## June / August IDs — current status

| Old ID | Issue | 31 Aug |
|--------|--------|--------|
| C-1–C-6 | Explorer wipe, empty index, prompt crash, stream dup, onboarding, geocode key | Still **fixed** |
| C-7 | `no-cors` always-online | **Fixed** (D-8) |
| C-8 | Zero tests | **Fixed**; now also `npm test` |
| N-1 | GPX/KML untested / broken API | **Code fixed**; re-test on device |
| N-2 | Offline detection | **Fixed** |
| N-3 | Wire `npm test` | **Fixed** |
| N-4 | Route Maps through helper | **Fixed** in navigation / places / explorer / speed-limit |
| N-8 | First-leg leftovers | **Fixed** |

---

## Remaining work

### P0 — You

1. Pull this branch (or merge the PR), copy `.env` / `.env.local` onto the laptop. Keys are not on GitHub.
2. **Rotate Maps + Gemini keys** that were pasted into chat on 18 Aug, then `npx expo start -c`.
3. On a phone: Planned Trips → a multi-stop plan → **Navigate** (confirm every stop). Finish a nav, open Travel Log, **Export GPX**. Airplane-mode: Offline indicator should go red.

### P1 — After the phone pass

| ID | Item |
|----|------|
| R-1 | Device-confirm D-1, D-3, D-5 (the ones that only fully prove on hardware) |
| R-2 | Backgrounding while navigating (not exercised here) |
| R-3 | `maybe-map.web.tsx` still reads `EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY` directly (web-only) |

### P2 — Debt

Same as August: unused routing service, `data/us-states` / scripts bulk, lazy-load state JSON, overlapping docs.

---

## Security

| Item | Status |
|------|--------|
| `.env` gitignored | Yes |
| Live `AIza…` keys in tracked source | None found this pass |
| Keys pasted in Cursor chat (18 Aug) | **Rotate** |
| `EXPO_PUBLIC_*` in the client bundle | Expected; restrict by API/referrer in Google Cloud |

---

## Testing

```bash
npm test
npm run test:smoke
```

Unit tests cover Places query helpers, trip names, route matching (including multi-leg progress), GPS sim math, GPX/KML escaping, connectivity status, and Planned Trips → GPS plan mapping. They do **not** replace a phone run.

---

## How to use this on a new machine

1. Clone, copy `.env`, `npm install`, `npx expo start -c`.
2. Open **this file**.
3. Treat June `FULL_CODE_AUDIT.md` as history.
