# Nomad Daily Operating Rhythm (Consolidation)

Use this routine to stay focused and avoid scope drift.

## Daily Session (60-90 minutes minimum)

1. Open:
   - `docs/STATE_OF_UNION.md`
   - `docs/CONSOLIDATION_WORKBOARD.md`
   - `docs/MVP_RELEASE_GATE.md`
2. Pick one in-progress blocker from the workboard.
3. Reproduce issue and document expected behavior.
4. Implement fix and verify on device.
5. Log result in `docs/MVP_TEST_RUN_LOG.md`.
6. Update workboard and state of union.

## Weekly Cadence

- Monday: choose top 3 consolidation outcomes
- Tuesday-Thursday: bug fixing and hardening only
- Friday: run full release gate and summarize blockers
- Saturday/Sunday: optional cleanup/docs, no expansion work

## Scope Guardrails

- Do not add features during consolidation.
- If a new idea appears, write it in Deferred and move on.
- If uncertain whether a task belongs, ask:
  - Does this directly improve Plan -> Navigate/Record -> Review?
  - Can this wait until after v0.1 stability?

## End-of-Week Output

- Updated `docs/STATE_OF_UNION.md`
- Updated `docs/CONSOLIDATION_WORKBOARD.md`
- At least 3 recorded runs in `docs/MVP_TEST_RUN_LOG.md`
- Clear PASS/FAIL status using `docs/MVP_RELEASE_GATE.md`
