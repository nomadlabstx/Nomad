# Nomad MVP Test Run Log

Use this log to capture repeatable evidence for v0.1 stability.

## Run Template

### Run #__
- Date:
- Device:
- Build/Runtime:
- Tester:
- Scenario:
  - Plan destination:
  - Navigate/record:
  - Review saved trip:
- Result: PASS | FAIL
- Fail point (if any):
- Notes:
- Follow-up issue:

---

## Runs

### Run #1
- Date: 2026-03-25
- Device: Primary test device
- Build/Runtime: Expo Go / development runtime
- Tester: Majim
- Scenario:
  - Plan destination: Core recorder path exercised; home-to-travel-log routing corrected.
  - Navigate/record: Recording no longer appears as blank white control; start/pause/resume visible.
  - Review saved trip: Saved trip remained available after app reload/restart.
- Result: FAIL
- Fail point (if any): Route/API failure fallback not yet manually validated end-to-end.
- Notes: Initial permission-denied behavior previously failed silently; permission recovery UX and retry path were implemented and gate item marked recovered.
- Follow-up issue: Execute forced route failure test and verify user recovery messaging/actions.

### Run #2
- Date: 2026-06-20
- Device: Desktop (Windows); web browser smoke pass
- Build/Runtime: Expo web dev server (`npx expo start --web`, localhost:8081)
- Tester: Majim (agent-assisted desktop re-entry)
- Scenario:
  - Plan destination: Not exercised on this run (requires mobile GPS / device permissions).
  - Navigate/record: Not exercised on this run (web lacks full location/navigation parity).
  - Review saved trip: Travel Log tab reachable in web shell; full save/reopen flow not exercised.
- Result: FAIL
- Fail point (if any): Same blockers as Run #1 — route failure fallback, offline UX, background stability, and full end-to-end core loop still require primary-device validation.
- Notes: Automated smoke test passed (`npm run test:smoke`). Web app launched without red screen; Home rendered ("What's the move, Chief?") with bottom tabs (Home, Pathfinder, GPS, Travel Log, Checklist, Trips, Achievements, Bookings, Settings). Dependencies installed on desktop (Node v24.17.0, npm install complete). Gate A partially satisfied on web only.
- Follow-up issue: Run #3 on primary phone via Expo Go — full core loop plus Gate C edge cases.

### Run #3
- Date: (in progress)
- Device: Primary test device (Expo Go)
- Build/Runtime: Expo Go / development runtime
- Tester: Majim
- Scenario:
  - Plan destination: (pending)
  - Navigate/record: (pending)
  - Review saved trip: (pending)
- Result: IN PROGRESS (Gate A complete)
- Fail point (if any): —
- Notes: **Gate A PASS** — app launch, Home, GPS screen, and Travel Log all open without red screen or runtime errors.
- Follow-up issue: Continue Run #3 — core loop (plan → navigate → record → save → review), then Gate C edge cases in Run #5.

### Run #4
- Date: 2026-10-04
- Device: Cloud agent VM (no iOS device)
- Build/Runtime: Stack on `cursor/october-mvp-795e` (SDK 57 + highway + place identity + sleek GPS). EAS production profile ready. `eas build` not started — no Expo login / `EXPO_TOKEN`.
- Tester: Cloud agent
- Scenario:
  - Plan destination: Not exercised (needs TestFlight binary).
  - Navigate/record: Not exercised (needs TestFlight binary).
  - Review saved trip: Not exercised (needs TestFlight binary).
- Result: FAIL (credentials)
- Fail point (if any): `npx eas-cli whoami` → Not logged in. `eas build --platform ios --profile production --non-interactive` → "An Expo user account is required."
- Notes: Automated smoke passed, including store identity (`com.nomadlabstx.nomad`, NSLocation strings, EAS preview/production). GPS + save-trip on a TestFlight binary is the next human step after `eas login`.
- Follow-up issue: Log in to Expo, confirm Apple team owns `com.nomadlabstx.nomad`, run `npm run eas:testflight`, then tick Phase 1 Pass on device.

### Run #5
- Date:
- Device:
- Build/Runtime:
- Tester:
- Scenario:
  - Plan destination:
  - Navigate/record:
  - Review saved trip:
- Result:
- Fail point (if any):
- Notes:
- Follow-up issue:

### Run #6
- Date:
- Device:
- Build/Runtime:
- Tester:
- Scenario:
  - Plan destination:
  - Navigate/record:
  - Review saved trip:
- Result:
- Fail point (if any):
- Notes:
- Follow-up issue:

### Run #7
- Date:
- Device:
- Build/Runtime:
- Tester:
- Scenario:
  - Plan destination:
  - Navigate/record:
  - Review saved trip:
- Result:
- Fail point (if any):
- Notes:
- Follow-up issue:

### Run #8
- Date:
- Device:
- Build/Runtime:
- Tester:
- Scenario:
  - Plan destination:
  - Navigate/record:
  - Review saved trip:
- Result:
- Fail point (if any):
- Notes:
- Follow-up issue:

### Run #9
- Date:
- Device:
- Build/Runtime:
- Tester:
- Scenario:
  - Plan destination:
  - Navigate/record:
  - Review saved trip:
- Result:
- Fail point (if any):
- Notes:
- Follow-up issue:

### Run #10
- Date:
- Device:
- Build/Runtime:
- Tester:
- Scenario:
  - Plan destination:
  - Navigate/record:
  - Review saved trip:
- Result:
- Fail point (if any):
- Notes:
- Follow-up issue:
