# Nomad Consolidation Workboard

**Active queue as of 4 Oct 2026:** [October MVP](./mvp-october/README.md)

The June consolidation sprint is closed. Reliability evidence still lives in [MVP Release Gate](./MVP_RELEASE_GATE.md) (FAIL until navigation-while-moving, background, and offline are proven on device).

## October phases

- [Phase 1 — Installable](./mvp-october/phase-1-install.md) — TestFlight, not Expo Go
- [Phase 2 — Extra-miler truth](./mvp-october/phase-2-extra-miler.md) — checklist and stay-on-highway
- [Phase 3 — Live like the user](./mvp-october/phase-3-live-drive.md) — two highway drives
- [Phase 4 — Ship what you drove](./mvp-october/phase-4-ship.md) — App Review or TestFlight-as-MVP

## Historical (June 2026)

Rules from the 14-day freeze (kept for the record):

- One in-progress item at a time.
- No new features during that sprint.
- Every completed item includes verification notes.

### Done then

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
- [x] Home -> GPS -> Travel Log golden path

### Still unverified (moved into Phase 2)

- [ ] Route/API failure fallback on device
- [ ] Weak/offline network state during navigation
- [ ] Background/foreground stability during active navigation
- [ ] Navigation progress updates while moving

### Deferred past October

- [ ] Booking flow expansion
- [ ] Tesla 3D renderer
- [ ] CarPlay / Android Auto
- [ ] National camera completeness
- [ ] RPG overlay
- [ ] Social features
- [ ] Checklist / Travel Log visual rewrite
