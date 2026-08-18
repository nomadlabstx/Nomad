# Quick Manual Smoke Test Checklist

Use this checklist to validate the v0.1 core loop in under 10 minutes.

## Prerequisites
- Run `npm install` if you have not yet.
- Start the app with `npm run start`.
- If Gemini API keys are not configured, expect demo responses.

## Core App
- [ ] App launches without red screen errors.
- [ ] Bottom tabs render and are responsive.

## Core Loop
- [ ] From Home, enter GPS/recorder flow.
- [ ] Select a destination and start a route.
- [ ] Start and stop recording without UI issues.
- [ ] Save trip and confirm it appears in `Travel Log`.
- [ ] Open trip detail screen successfully.

## Reliability Signals
- [ ] Permission prompts are understandable and recoverable.
- [ ] Offline/weak network state is surfaced to user.
- [ ] No crashes during basic navigation interactions.

## Optional Secondary Checks
- [ ] Open `Pathfinder` and confirm screen renders.
- [ ] Send one prompt and receive a response (or expected demo fallback).
- [ ] Open bookings surface if used in your current build path.

## Pass/Fail
- [ ] All steps pass without crashes or broken UI.

---

## Latest session (Run #2 — 2026-06-20)

Environment: Desktop Windows, Expo web (`localhost:8081`), `npm run test:smoke`

| Check | Result |
|-------|--------|
| Automated smoke script | PASS |
| App launches without red screen (web) | PASS |
| Bottom tabs render (web) | PASS |
| Home quick actions visible | PASS |
| Full GPS / record / save loop | Not run (needs primary device) |
| Offline/weak network surfaced | Not run |
| Pathfinder prompt test | Not run |

**Overall:** Partial — desktop/web shell OK; device core loop still required for PASS.
