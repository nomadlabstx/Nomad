# First Hour Back Guide

This is a focused 60-minute re-entry plan to get Nomad running and validate the v0.1 core loop.

## 0-10 min: Setup and boot
- [X] Run `npm install`
- [X] Start the app: `npm run start`
- [X] Open on your target device/emulator
- [X] Open `docs/STATE_OF_UNION.md` and `docs/CONSOLIDATION_WORKBOARD.md`

## 10-25 min: Quick smoke pass
- [ ] Follow `docs/SMOKE_TEST_CHECKLIST.md`
- [ ] If anything breaks, capture the first error and stop here

## 25-45 min: Core loop verification
- [ ] Plan a destination from Home
- [ ] Start GPS navigation and recording
- [ ] Stop and save trip
- [ ] Confirm trip appears in `Travel Log`
- [ ] Open saved trip details without crash

## 45-55 min: Release gate evidence
- [ ] Run through `docs/MVP_RELEASE_GATE.md` and mark current status
- [ ] Log this session in `docs/MVP_TEST_RUN_LOG.md`

## 55-60 min: Next action
- [ ] If failures occurred, add top blocker to `docs/CONSOLIDATION_WORKBOARD.md`
- [ ] If all core checks passed, fix one reliability issue (not a new feature)

## Tips
- Keep AI/booking/explorer as secondary during consolidation unless needed for core-loop stability.
- Use the checklist index for deeper testing: `CHECKLISTS.md`
