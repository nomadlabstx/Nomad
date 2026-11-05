# Phase 1 — Installable

Window: originally 6–12 Oct 2026; **still open as of 2026-11-05**  
Status: **In progress** — EAS project linked; first binary still needs API keys + Apple credentials

## Goal

You are driving a production iOS build, not Expo Go.

## In progress

- Create `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and `EXPO_PUBLIC_GEMINI_API_KEY` on expo.dev → Project → Environment variables → **production** (preview env for internal builds)
- Interactive Apple credential setup for store distribution
- Backup path: GitHub Action `.github/workflows/eas-ios-testflight.yml` (`workflow_dispatch`) once `EXPO_TOKEN` is a repo secret

## Next

- Confirm or change `com.nomadlabstx.nomad` if Apple already has a different bundle
- Fill `eas.json` → `submit.production.ios` with `appleId`, `appleTeamId`, `ascAppId` once App Store Connect has the app
- `npm run eas:ios` then `npm run eas:submit` (or `npm run eas:testflight`)
- Device pass on that binary: GPS opens, place identity shows, a route starts, a trip saves to Travel Log

## Blocked until

- Maps + Gemini keys in the EAS **production** environment (not in git)
- Apple Distribution Certificate / provisioning via interactive `eas credentials` or first interactive build
- Apple team ID / App Store Connect app for `eas submit`

Store identifiers default to `com.nomadlabstx.nomad` (GitHub org reverse-DNS). Change them in [app.json](../../app.json) before the first store upload if Apple already has a different bundle. Do not invent App Store Connect IDs.

## Done

- October boards exist in this folder
- Draft stack landed on `cursor/october-mvp-795e` ([PR #7](https://github.com/nomadlabstx/Nomad/pull/7)) in Git order; continuation is `cursor/november-mvp-continuation-7c25`
  - [#3 SDK 57](https://github.com/nomadlabstx/Nomad/pull/3)
  - [#4 highway identity](https://github.com/nomadlabstx/Nomad/pull/4)
  - [#5 place identity](https://github.com/nomadlabstx/Nomad/pull/5)
  - [#6 sleek GPS](https://github.com/nomadlabstx/Nomad/pull/6)
  - PR #2 core-loop bugfixes cherry-picked onto the tip (2026-11-05)
- Automated smoke + unit tests passed after the stack merge / continuation
- `ios.bundleIdentifier` / `android.package` = `com.nomadlabstx.nomad`
- Location purpose strings in `app.json` + `expo-location` plugin (When In Use; background location flags off until Gate C)
- EAS `preview` (internal) and `production` (store / TestFlight) in [eas.json](../../eas.json)
- [app.config.js](../../app.config.js) injects native Google Maps keys from env when present
- Route / place-identity / speed-limit / explorer geocode share [utils/google-maps-key.ts](../../utils/google-maps-key.ts)
- `npm run test:phase1` static config check
- EAS project linked: `adc0e18c-6f98-4d6c-8dec-f688c46f5bc9` (`owner`: `theimprovisedpixel`)

## Pass

- App installs from TestFlight
- GPS opens
- Place identity shows
- A route starts
- A trip saves to Travel Log

## Out of this phase

New GPS chrome, camera database work, eat/drink rec polish.

## TestFlight operator notes

On expo.dev (once), for environment **production**:

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_GEMINI_API_KEY`

Then on a machine that can run interactive Apple login:

```bash
npx eas-cli credentials   # or first interactive eas build
npm run test:phase1
npm run eas:ios          # production store build
npm run eas:submit       # latest → TestFlight
# or
npm run eas:testflight
```

Preview (ad-hoc / internal, not TestFlight): `npm run eas:preview`.

GPS + save-trip cannot be confirmed from a cloud VM. Tick Pass only after a real-phone run on the TestFlight binary, then log it in [MVP Test Run Log](../MVP_TEST_RUN_LOG.md).

### Device pass on the TestFlight binary

- [ ] Install from TestFlight (not Expo Go)
- [ ] GPS opens; location permission prompt uses extra-miler copy
- [ ] Place identity shows a road / town / county after a fix
- [ ] A route starts
- [ ] Stop and save; trip appears in Travel Log
