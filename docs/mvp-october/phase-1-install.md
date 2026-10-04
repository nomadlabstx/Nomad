# Phase 1 — Installable

Window: 6–12 Oct 2026  
Status: **In progress**

## Goal

You are driving a production iOS build, not Expo Go.

## In progress

- Device pass of draft PRs, then land in stack order:
  - [#3 SDK 57](https://github.com/nomadlabstx/Nomad/pull/3)
  - [#4 highway identity](https://github.com/nomadlabstx/Nomad/pull/4)
  - [#5 place identity](https://github.com/nomadlabstx/Nomad/pull/5)
  - [#6 sleek GPS](https://github.com/nomadlabstx/Nomad/pull/6)

## Next

- `ios.bundleIdentifier` and `android.package` in [app.json](../../app.json)
- Location purpose strings (`NSLocationWhenInUseUsageDescription` and Android fine/coarse location)
- EAS production / preview in [eas.json](../../eas.json)
- First TestFlight binary

## Blocked until

- Apple team ID / App Store Connect access for submit
- Expo account logged in for `eas build`

Store identifiers default to `com.nomadlabstx.nomad` (GitHub org reverse-DNS). Change them before the first store upload if Apple already has a different bundle.

## Done

- October boards exist in this folder

## Pass

- App installs from TestFlight
- GPS opens
- Place identity shows
- A route starts
- A trip saves to Travel Log

## Out of this phase

New GPS chrome, camera database work, eat/drink rec polish.
