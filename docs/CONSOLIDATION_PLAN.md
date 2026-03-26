# Nomad Consolidation Plan (Solo Founder Reset)

This plan resets Nomad around one goal: build a reliable personal MVP that can be safely expanded later.

## North Star

Deliver a stable core loop:

1. Plan a destination
2. Navigate and record
3. Review trip history

If work does not improve this loop in a measurable way, it is deferred.

## Product Scope Decision

### Keep (MVP-Critical)

- `Home` (`app/(tabs)/index.tsx`)
  - Keep only actions that lead into the core loop.
- `GPS` (`app/(tabs)/recorder.tsx`)
  - Keep destination search, route start, active navigation, recording, and trip save.
- `Travel Log` (`app/(tabs)/travel-log.tsx`, `app/trip/[id].tsx`)
  - Keep trip list and trip detail viewing.
- Core reliability services
  - Keep offline/network state, storage, navigation, and error handling.

### Hide (Implemented But Not MVP-Critical)

- `Pathfinder` (`app/(tabs)/ai-assistant.tsx`)
  - Keep code, hide from primary user path unless needed for route planning.
- `Checklist / Explorer` (`app/(tabs)/explore.tsx`)
  - Keep code, remove from primary loop for now.
- `Planned Trips` (`app/(tabs)/planned-trips.tsx`)
  - Keep code, optional access only.

### Pause (No New Work Until MVP Stable)

- Achievements and gamification (`app/(tabs)/achievements.tsx`, RPG overlays)
- Booking expansion (`app/(tabs)/bookings.tsx` and related enhancements)
- Advanced analytics UX expansion
- New integrations and large data initiatives

## Engineering Freeze Rules (14 Days)

1. No new features.
2. No new dependencies unless they reduce core-loop risk.
3. Any bug fix must include:
   - clear reproduction steps
   - expected behavior
   - verification notes after fix
4. Every day ends with a runnable app and updated status notes.

## 14-Day Execution Plan

## Days 1-2: Truth Baseline

- Create `docs/STATE_OF_UNION.md` with three sections:
  - Implemented
  - Verified
  - Unverified
- Confirm the core loop path works from Home without dead-end routes.
- Remove or relabel any quick actions that are misleading for MVP.

Exit criteria:
- One documented "golden path" from launch to saved trip to travel log.

## Days 3-6: Core Loop Hardening

- Focus only on top failure points:
  - permissions denied/revoked
  - destination search failure
  - route calculation failure
  - navigation interruption
  - trip save/read failure
- Improve user-facing fallback messages and recovery actions.
- Ensure app behavior is understandable without internal knowledge.

Exit criteria:
- Complete core loop 5 times on target device with no blocking failures.

## Days 7-10: Verification Layer

- Upgrade smoke checks to cover high-value behavior assertions.
- Add targeted tests around pure logic and utilities that affect:
  - route state transitions
  - trip persistence
  - key calculations
- Document exact manual checks in one concise checklist.

Exit criteria:
- Minimum automated guardrails exist and run reliably.

## Days 11-14: MVP Candidate

- Remove obvious UX noise from the core loop.
- Update README to reflect current truth only.
- Run 10 end-to-end manual passes across realistic scenarios.
- Produce short release notes with known limitations.

Exit criteria:
- "Nomad v0.1 Personal MVP" is stable for repeated use.

## Verification Checklist (Must Pass Before v0.1)

- App launches without red screen.
- Location permission flow is clear and recoverable.
- Destination can be selected and route can start.
- Navigation updates progress as movement occurs.
- Recording starts/stops reliably.
- Trip appears in `Travel Log` after save.
- Opening a saved trip detail does not crash.
- Offline or weak network state is communicated clearly.
- App recovers from temporary API failure without restart.
- Core loop works on your primary real device repeatedly.

## Work Queue Template

Use this template for every item during consolidation:

- Title:
- Category: Bug | Hardening | Docs | Test
- Affects core loop step: Plan | Navigate/Record | Review
- Repro steps:
- Expected behavior:
- Fix summary:
- Verification performed:
- Status: Open | Done

## Definition of Done for Consolidation

Consolidation is complete when:

1. Core loop is reliable enough for daily personal use.
2. MVP path is obvious and uncluttered.
3. Verified/Unverified status is explicit in docs.
4. README and checklists match actual behavior.
5. New feature work can resume without destabilizing the core loop.

## After Consolidation (Next Phase)

Once v0.1 is stable, expand in this order:

1. AI assistant improvements that directly help route success.
2. Explorer/checklist return with measured user value.
3. Booking improvements tied to real trip planning behavior.
4. Achievements/gamification only if retention data supports it.
