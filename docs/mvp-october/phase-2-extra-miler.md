# Phase 2 — Extra-miler truth

Window: 13–19 Oct 2026  
Status: **Not started** (after Phase 1 pass)

## Goal

The atlas is honest on a real drive.

## In progress

- (starts after TestFlight exists)

## Next

- Highway / county / exit checkoff on device
  - [services/explorer.ts](../../services/explorer.ts)
  - [app/(tabs)/explore.tsx](../../app/(tabs)/explore.tsx)
- Pathfinder stay-on-highway after recalc
  - [hooks/use-navigation.ts](../../hooks/use-navigation.ts)
  - [utils/preferred-highways.ts](../../utils/preferred-highways.ts)
- Gate C from [MVP Release Gate](../MVP_RELEASE_GATE.md): API failure, airplane mode, background / foreground

## Blocked until

- Phase 1 pass (TestFlight install + save-trip)

## Done

- (none)

## Pass

- One interstate drive checks off the right road and county
- “Stay on Loop 340 / I-35” does not silently shortcut

## Out of this phase

Eat/drink chips, OSM cameras, achievements expansion — unless they crash or lie.
