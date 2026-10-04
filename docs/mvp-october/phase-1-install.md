# Phase 1 — Installable

Window: 6–12 Oct 2026  
Status: **Blocked** on Expo login + Apple team for the first TestFlight binary

## Goal

You are driving a production iOS build, not Expo Go.

## In progress

- First TestFlight: `npm run eas:testflight` after `eas login` (or `EXPO_TOKEN`) and an Apple team that owns the bundle

## Next

- `eas login` / `EXPO_TOKEN`
- Confirm or change `com.nomadlabstx.nomad` if Apple already has a different bundle
- Fill `eas.json` → `submit.production.ios` with `appleId`, `appleTeamId`, `ascAppId` once App Store Connect has the app
- `npm run eas:ios` then `npm run eas:submit`
- Device pass on that binary: GPS opens, place identity shows, a route starts, a trip saves to Travel Log

## Blocked until

- Expo account logged in for `eas build`
- Apple team ID / App Store Connect app for `eas submit`

Store identifiers default to `com.nomadlabstx.nomad` (GitHub org reverse-DNS). Change them in [app.json](../../app.json) before the first store upload if Apple already has a different bundle. Do not invent App Store Connect IDs.

## Done

- October boards exist in this folder
- Draft stack landed on `cursor/october-mvp-795e` in Git order (GitHub PRs stay open drafts until this ship PR merges):
  - [#3 SDK 57](https://github.com/nomadlabstx/Nomad/pull/3)
  - [#4 highway identity](https://github.com/nomadlabstx/Nomad/pull/4)
  - [#5 place identity](https://github.com/nomadlabstx/Nomad/pull/5)
  - [#6 sleek GPS](https://github.com/nomadlabstx/Nomad/pull/6)
- Automated smoke (`npm run test:smoke`) passed after the stack merge
- `ios.bundleIdentifier` / `android.package` = `com.nomadlabstx.nomad`
- Location purpose strings in `app.json` + `expo-location` plugin (When In Use; background location flags off until Gate C)
- EAS `preview` (internal) and `production` (store / TestFlight) in [eas.json](../../eas.json)

## Pass

- App installs from TestFlight
- GPS opens
- Place identity shows
- A route starts
- A trip saves to Travel Log

## Out of this phase

New GPS chrome, camera database work, eat/drink rec polish.

## TestFlight operator notes

```bash
eas login
npm run eas:ios          # production store build
npm run eas:submit       # latest → TestFlight
# or
npm run eas:testflight
```

Preview (ad-hoc / internal, not TestFlight): `npm run eas:preview`.

GPS + save-trip cannot be confirmed from this cloud VM. Tick Pass only after a real-phone run on the TestFlight binary, then log it in [MVP Test Run Log](../MVP_TEST_RUN_LOG.md).
