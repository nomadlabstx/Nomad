#!/usr/bin/env bash
# Produce the Phase 1 TestFlight binary (iOS production → App Store Connect).
# Requires: Expo login (EXPO_TOKEN or `eas login`) and an Apple team that owns
# com.nomadlabstx.nomad. Do not invent Apple IDs in this script.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EAS=(npx --yes eas-cli)

if ! "${EAS[@]}" whoami >/dev/null 2>&1; then
  echo "EAS is not logged in. Run: eas login"
  echo "Or set EXPO_TOKEN from expo.dev → Account settings → Access tokens."
  exit 1
fi

BUNDLE="$(node -e 'const a=require("./app.json"); process.stdout.write(a.expo.ios.bundleIdentifier)')"
if [[ "$BUNDLE" != "com.nomadlabstx.nomad" ]]; then
  echo "Unexpected bundle identifier: $BUNDLE"
  echo "Change it in app.json before the first store upload if Apple already has a different ID."
fi

echo "Building iOS production (store) for TestFlight…"
"${EAS[@]}" build --platform ios --profile production --non-interactive "$@"

echo "Submitting latest iOS production build to App Store Connect / TestFlight…"
echo "Fill appleId / appleTeamId / ascAppId when EAS asks, or put them in eas.json submit.production.ios after the Apple team exists."
"${EAS[@]}" submit --platform ios --profile production --latest --non-interactive

cat <<'EOF'

Phase 1 device pass on that TestFlight binary:
  1. Install Nomad from TestFlight (not Expo Go).
  2. Open GPS — map and location permission prompt appear.
  3. Confirm place identity (road / town / county) after a fix.
  4. Start a route in Pathfinder or GPS search.
  5. Stop and save a trip; it appears in Travel Log.

Log the run in docs/MVP_TEST_RUN_LOG.md and tick Pass on docs/mvp-october/phase-1-install.md.
EOF
