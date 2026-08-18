# Nomad Consolidation Workboard

Use this as the active queue during the 14-day consolidation sprint.

## Rules

- One in-progress item at a time.
- No new features.
- Every completed item includes verification notes.
- If an item does not support the core loop, move it to Deferred.

## In Progress

- [ ] Verify route failure fallback behavior

## Next Up

- [ ] Verify weak/offline network state is visible and usable
- [ ] Verify background/foreground stability during active navigation

## Blocked

- [ ] (none)

## Done

- [x] Created `docs/PRIORITY_BUCKETS.md` (2026-06-20 planning session)
- [x] Run #2 logged in `docs/MVP_TEST_RUN_LOG.md` (desktop/web smoke)
- [x] Reconciled doc drift (`docs/README.md`, master list, travel-stats plan)
- [x] Created `docs/CONSOLIDATION_PLAN.md`
- [x] Created `docs/STATE_OF_UNION.md`
- [x] Created `docs/MVP_RELEASE_GATE.md`
- [x] Created `docs/MVP_TEST_RUN_LOG.md`
- [x] Aligned `README.md` with MVP consolidation scope
- [x] Verified location permission deny/recover behavior
- [x] Verified trip save/read reliability after app restart

## Validation Session Notes (Items 18-22)

- [x] Home -> GPS -> Travel Log golden path
  - Code check: Home "Travel Log" action now routes to `/(tabs)/travel-log`.
  - Manual evidence: saved trip still present after reload/restart.
- [x] Location permission deny/recover behavior
  - Manual evidence: denied permission now shows explicit recovery UI; recording is no longer a silent no-op.
- [ ] Route failure fallback behavior
  - Still required: simulate route/API failure and verify retry/dismiss recovery behavior.
- [x] Trip save/read reliability after app restart
  - Manual evidence: travel log entry remains accessible after reload.

## Deferred (Post-v0.1)

- [ ] Achievements/gamification enhancements
- [ ] Booking flow expansion
- [ ] Explorer/checklist deepening
- [ ] Advanced analytics dashboard expansion
- [ ] New external integrations

## Item Template

Copy/paste:

- Title:
- Category: Bug | Hardening | Docs | Test
- Affects core loop step: Plan | Navigate/Record | Review
- Repro steps:
- Expected behavior:
- Fix summary:
- Verification performed:
- Status: Open | Done
