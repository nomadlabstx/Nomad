# Phase 2 — Extra-miler truth

Window: originally 13–19 Oct 2026  
Status: **Prep in progress** — device Pass still waits on Phase 1

## Goal

The atlas is honest on a real drive.

## In progress

- Device validation after TestFlight exists

## Next

- Highway / county / exit checkoff on device
  - [services/explorer.ts](../../services/explorer.ts)
  - [app/(tabs)/explore.tsx](../../app/(tabs)/explore.tsx)
- Pathfinder stay-on-highway after recalc on device
  - [hooks/use-navigation.ts](../../hooks/use-navigation.ts)
  - [utils/preferred-highways.ts](../../utils/preferred-highways.ts)
- Gate C from [MVP Release Gate](../MVP_RELEASE_GATE.md): API failure, airplane mode, background / foreground

## Blocked until

- Phase 1 pass (Expo Go install + save-trip)

## Done (code prep, 2026-11-05)

- Loop / FM highway refs parse + stay-on ranking prefers `Loop 340` over shortcuts (unit tests)
- Offline / no-cache route failures map to Retry UX on GPS
- Connectivity probe + OfflineIndicator already in stack from PR #2

## Pass

- One interstate drive checks off the right road and county
- “Stay on Loop 340 / I-35” does not silently shortcut

## Out of this phase

Eat/drink chips, OSM cameras, achievements expansion — unless they crash or lie.
