# Nomad State of the Union

Last updated: 2026-06-20 (Run #2 desktop/web evidence applied)
Owner: Majim
Mode: Consolidation (no net-new features)

This document is the source of truth for what is implemented, what is verified, and what is still unverified for the v0.1 personal MVP.

## Core Loop for v0.1

1. Plan destination
2. Navigate and record
3. Review saved trip

If an item does not improve this loop, it is deferred.

## Implemented

These areas are present in code and wired into the app:

- App shell, navigation, and startup service initialization (`app/_layout.tsx`, `app/(tabs)/_layout.tsx`)
- Home screen and quick actions (`app/(tabs)/index.tsx`)
- GPS/recorder/navigation surface (`app/(tabs)/recorder.tsx`)
- Travel log list + trip detail (`app/(tabs)/travel-log.tsx`, `app/trip/[id].tsx`)
- AI assistant and planning UI (`app/(tabs)/ai-assistant.tsx`, `components/ai-chat.tsx`, `components/ai-trip-planner.tsx`)
- Explorer/checklist system (`app/(tabs)/explore.tsx`, `hooks/use-explorer.ts`, `services/explorer.ts`)
- Planned trips flow (`app/(tabs)/planned-trips.tsx`, `services/planned-trips.ts`)
- Achievements (`app/(tabs)/achievements.tsx`, `hooks/use-achievements.ts`, `services/achievements.ts`)
- Booking flow (`app/(tabs)/bookings.tsx`, `services/booking.ts`, `services/conversational-booking.ts`)
- Settings/analytics/offline and supporting services

## Verified

Verified means there is recent repeatable evidence (manual or automated) that behavior works as expected.

Current verified status is partial and should be treated as provisional:

- App launches and key screens render: partially verified — web launch OK (2026-06-20); primary device pending.
- Automated static smoke test: verified (`npm run test:smoke`, 2026-06-20).
- Home to Travel Log golden path: verified after route fix in `app/(tabs)/index.tsx`.
- Location permission denied flow: verified with explicit recovery UX (settings + retry) and no silent recording failure.
- Trip persistence after restart: verified (saved trip remains accessible in Travel Log after reload).
- AI assistant and booking card rendering: partially verified via manual checklist docs (not re-run 2026-06-20).
- General code presence checks: verified by static smoke script (`scripts/automated-smoke-test.js`).

Confidence level: Low to Medium.

## Unverified

These are implemented but not yet proven reliable for release:

- End-to-end core loop reliability across repeated runs on real device
- Route failure handling and navigation interruption recovery
- Trip save/read resilience under network transitions
- Weak/offline state and recovery behavior during active routing
- Background/foreground stability during active navigation
- Cross-platform parity (especially web vs mobile map behavior)
- Non-core features used as secondary pathways (AI, Explorer, Bookings, Achievements)

Confidence level: Low.

## Scope Status (Keep / Hide / Pause)

### Keep (MVP-Critical)
- Home
- GPS/Recorder/Navigation
- Travel Log and Trip Detail
- Reliability and storage/network/error handling

### Hide (Remain in Code, Not Primary Path)
- Pathfinder AI tab as default destination
- Explorer/Checklist
- Planned Trips

### Pause (No Work Until v0.1 Stable)
- Achievements/gamification
- Booking expansion
- Advanced analytics expansion
- New integrations and large data additions

## Top Risks

- No robust automated regression safety net for app behavior
- Documentation drift versus current app reality
- Feature breadth exceeding current validation depth
- External API key, quota, and dependency variability

## Next 7 Days (Execution Targets)

- Build a strict pass/fail baseline using `docs/MVP_RELEASE_GATE.md`
- Run 5 complete core-loop passes and log each in `docs/MVP_TEST_RUN_LOG.md` (1 of 5 complete; Run #2 web-only partial)
- Resolve top 5 blockers only (no feature work)
- Update this doc daily with evidence, not assumptions

## Definition of Evidence

A claim is considered "verified" only if:

1. Reproduction steps are documented
2. Result is recorded (pass/fail)
3. Device/context is noted
4. Date is recorded

If evidence is missing, status defaults to unverified.
