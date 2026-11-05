const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const checks = [
  {
    file: 'app/(tabs)/ai-assistant.tsx',
    patterns: [/AIChat/, /Pathfinder/, /Plan a destination/, /Plan a weekend trip to Austin/],
  },
  {
    file: 'components/ai-chat.tsx',
    patterns: [/useGemini/, /QUICK_PROMPTS/],
  },
  {
    file: 'components/ai-trip-planner.tsx',
    patterns: [/AI Trip Planner/, /geminiService/],
  },
  {
    file: 'services/gemini-ai.ts',
    patterns: [/buildTripPlanPrompt/, /buildChatPrompt/, /Destination planning/, /Stay on: I-95/],
  },
  {
    file: 'services/conversational-booking.ts',
    patterns: [/parseBookingIntent/],
  },
  {
    file: 'hooks/use-gemini.ts',
    patterns: [/useGemini/],
  },
  {
    file: 'docs/PRODUCT.md',
    patterns: [/Achievements are in/, /SPEED LIMIT/, /Along the interstate/],
  },
  {
    file: 'components/app-drawer.tsx',
    patterns: [/Achievements/],
  },
  {
    file: 'components/place-identity-hud.tsx',
    patterns: [/PlaceIdentityHud/, /formatPlaceLine/, /formatCountyLine/, /compact/],
  },
  {
    file: 'utils/place-identity.ts',
    patterns: [/parsePlaceIdentity/, /pickTown/, /keepLastGoodRoad/],
  },
  {
    file: 'components/navigation-ui.tsx',
    patterns: [/PlaceIdentityHud/, /End/],
  },
  {
    file: 'components/speed-limit-display.tsx',
    patterns: [/SPEED/, /LIMIT/],
  },
  {
    file: 'services/speed-camera.ts',
    patterns: [/refreshNearbyFromOsm/, /highway"="speed_camera/],
  },
  {
    file: 'utils/osm-cameras.ts',
    patterns: [/parseOverpassCameras/],
  },
  {
    file: 'app.json',
    patterns: [
      /"bundleIdentifier": "com\.nomadlabstx\.nomad"/,
      /"package": "com\.nomadlabstx\.nomad"/,
      /NSLocationWhenInUseUsageDescription/,
      /NSLocationAlwaysAndWhenInUseUsageDescription/,
      /expo-location/,
    ],
  },
  {
    file: 'eas.json',
    patterns: [
      /"preview"/,
      /"production"/,
      /"distribution": "store"/,
      /"distribution": "internal"/,
      /"environment": "preview"/,
      /"environment": "production"/,
    ],
  },
  {
    file: 'app.config.js',
    patterns: [/googleMapsApiKey/, /EXPO_PUBLIC_GOOGLE_MAPS_API_KEY/],
  },
  {
    file: 'services/navigation.ts',
    patterns: [/getGoogleMapsApiKey/],
  },
];

function fail(message) {
  console.error(`SMOKE TEST FAILED: ${message}`);
  process.exit(1);
}

for (const check of checks) {
  const fullPath = path.join(repoRoot, check.file);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing file: ${check.file}`);
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  for (const pattern of check.patterns) {
    if (!pattern.test(content)) {
      fail(`Pattern ${pattern} not found in ${check.file}`);
    }
  }
}

console.log('Automated smoke test passed.');
