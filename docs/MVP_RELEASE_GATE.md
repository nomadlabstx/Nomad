# Nomad v0.1 MVP Release Gate

Purpose: define non-negotiable checks before declaring v0.1 stable for personal daily use.

Run this after every major bug-fix batch and before any release candidate.

## Environment

- Device: Primary test device (manual run)
- Build/Runtime: Expo Go / development runtime
- Date: Run #3 in progress (Gate A device pass); Run #2 web 2026-06-20; Run #1 2026-03-25
- Tester: Majim

## Gate A: App Integrity

- [x] App launches without red screen/crash loop. (Device verified Run #3)
- [x] Home renders and responds to input. (Device verified Run #3)
- [x] GPS screen opens without runtime error. (Device verified Run #3)
- [x] Travel Log opens and renders saved entries list (or empty state). (Device verified Run #3)

## Gate B: Core Loop (Must Pass End-to-End)

- [x] Select destination from the app and start route.
- [ ] Navigation starts and route state updates while moving/simulating movement.
- [x] Recording starts and stops without UI desync.
- [x] Trip save succeeds and returns to stable UI.
- [x] Saved trip appears in Travel Log.
- [x] Opening saved trip detail works without crash.

## Gate C: Edge Cases

- [x] Location permission denied path shows clear recovery guidance.
- [ ] Temporary route/API failure shows recoverable fallback state.
- [ ] Weak/offline network state is visible and app remains usable.
- [ ] App remains stable after backgrounding/foregrounding during navigation.

## Gate D: Data Reliability

- [ ] Trip metadata (time/distance/title) is persisted and readable.
- [ ] No duplicate or corrupted trip entries after repeated runs.
- [x] Existing trips remain accessible after app restart.

## Gate E: UX Readiness

- [ ] Primary path is clear from Home with no misleading actions.
- [ ] Non-MVP paths are hidden or clearly labeled as secondary.
- [ ] Error messages are user-readable and actionable.

## Release Decision

- [ ] PASS: all required boxes checked
- [x] FAIL: one or more required checks failed

If FAIL:
- Primary blockers:
  1. Route/API failure fallback behavior is not yet validated on device.
  2. Weak/offline network state usability still needs explicit manual verification.
  3. Background/foreground navigation stability still unverified.
- Next fix owner/date: Majim / next test session

## Notes

- Run #2 (2026-06-20): web launch OK; automated smoke passed.
- Run #3 (in progress): **Gate A PASS on primary device** — launch, Home, GPS tab, Travel Log all clean.
- Remaining: Gate B navigation-while-moving (device), Gate C edge cases, Gate D/E on device.
- Release decision stays FAIL until Gates B–E required checks complete.
