# First Hour Back Guide

Focused re-entry for the **Expo Go personal MVP** (TestFlight deferred). Master queue: [TASKS.md](./TASKS.md).

## 0-10 min: Setup and boot
- [ ] `git checkout cursor/november-mvp-continuation-7c25` && `npm install`
- [ ] Ensure `.env` has `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and `EXPO_PUBLIC_GEMINI_API_KEY`
- [ ] `npx expo start` → open in **Expo Go** on your iPhone
- [ ] Skim [TASKS.md](./TASKS.md) and [mvp-october/phase-1-install.md](./mvp-october/phase-1-install.md)

## 10-25 min: Quick smoke pass
- [ ] Follow [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md)
- [ ] If anything breaks, capture the first error and stop here

## 25-45 min: Core loop verification (Phase 1 Pass)
- [ ] Open GPS from Home
- [ ] Confirm place identity (road / town / county) after a fix
- [ ] Start a route (Pathfinder or GPS search)
- [ ] Stop and save trip
- [ ] Confirm trip appears in Travel Log; open detail without crash

## 45-55 min: Release gate evidence
- [ ] Run through [MVP_RELEASE_GATE.md](./MVP_RELEASE_GATE.md) and mark current status
- [ ] Log this session in [MVP_TEST_RUN_LOG.md](./MVP_TEST_RUN_LOG.md)

## 55-60 min: Next action
- [ ] If Phase 1 Pass: start Phase 2 on a short highway drive
- [ ] If failures: note blocker in [TASKS.md](./TASKS.md) / chat — do not start TestFlight work

## Tips
- Expo Go is the official personal ship bar until you choose to renew Apple Developer.
- Background GPS may be flaky in Expo Go; log it, don’t treat it as a store-only bug until TestFlight exists.
- Use [CHECKLISTS.md](../CHECKLISTS.md) for deeper testing.
