# Phase 1 — Expo Go personal MVP

Window: originally TestFlight 6–12 Oct 2026; **retargeted 2026-11-04**  
Status: **In progress** — needs Maps + Gemini keys + Expo Go device pass  
Ship bar: **Expo Go on iPhone** (no paid Apple membership)

## Goal

You are driving Nomad on your phone in Expo Go with routing and place identity working.

## Why not TestFlight

Apple Developer Program renewal (~$99/yr) is deferred on purpose. Store / TestFlight steps live under **Deferred** in [TASKS.md](../TASKS.md). Do not block this phase on them.

## In progress

- Add Gemini API key (Maps key already created with the required APIs)
- Put keys in local `.env` and open the November branch in Expo Go
- Run the device-pass checklist below

## Next

```bash
git checkout cursor/november-mvp-continuation-7c25
npm install
```

Create **`.env`** at the repo root (gitignored):

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

Then:

```bash
npx expo start
```

Scan the QR with **Expo Go** on your iPhone (same Wi‑Fi, or enable tunnel in the Expo UI if needed).

Optional: also paste the same two vars on [expo.dev environment variables](https://expo.dev/accounts/theimprovisedpixel/projects/Nomad/environment-variables) for **development** / **preview** so cloud agents can use them later. Not required for Expo Go if `.env` is local.

## Maps API checklist (already done if your key matches)

Required for Nomad:

- Directions API
- Geocoding API
- Places API (New)
- Maps SDK for iOS
- Roads API

Optional / unused today: Routes API, Geolocation API.

## Pass

- App opens in Expo Go without a red screen
- GPS opens; location permission prompt uses extra-miler copy
- Place identity shows a road / town / county after a fix
- A route starts
- Stop and save; trip appears in Travel Log

Log the run in [MVP Test Run Log](../MVP_TEST_RUN_LOG.md).

### Device pass checklist

- [ ] Expo Go install of this branch (not a store binary)
- [ ] GPS opens; location permission prompt uses extra-miler copy
- [ ] Place identity shows a road / town / county after a fix
- [ ] A route starts
- [ ] Stop and save; trip appears in Travel Log

## Done (engineering)

- October stack + PR #2 core-loop fixes on `cursor/november-mvp-continuation-7c25`
- EAS project linked (`adc0e18c-6f98-4d6c-8dec-f688c46f5bc9`) for when store is wanted later
- Store identity / EAS profiles remain in repo but are not this phase’s Pass criteria
- Automated `npm test` / `test:smoke` / `test:phase1` green

## Out of this phase

TestFlight, App Store Connect, Distribution certificates, eat/drink polish, new GPS chrome.
