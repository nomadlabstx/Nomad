#!/usr/bin/env node
/**
 * Static Phase 1 installable-config checks.
 * Does not require Expo login. Missing Maps/Gemini keys warn only —
 * those live on expo.dev for TestFlight, not in git.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let failed = 0;
let warned = 0;

function fail(message) {
  failed += 1;
  console.error(`FAIL: ${message}`);
}

function warn(message) {
  warned += 1;
  console.warn(`WARN: ${message}`);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

const appPath = path.join(root, 'app.json');
const easPath = path.join(root, 'eas.json');
const configJsPath = path.join(root, 'app.config.js');

if (!fs.existsSync(appPath)) fail('app.json missing');
if (!fs.existsSync(easPath)) fail('eas.json missing');
if (!fs.existsSync(configJsPath)) fail('app.config.js missing');

const app = JSON.parse(fs.readFileSync(appPath, 'utf8')).expo;
const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));

if (app.ios?.bundleIdentifier !== 'com.nomadlabstx.nomad') {
  fail(`ios.bundleIdentifier is ${app.ios?.bundleIdentifier}`);
} else {
  ok('ios.bundleIdentifier = com.nomadlabstx.nomad');
}

if (app.android?.package !== 'com.nomadlabstx.nomad') {
  fail(`android.package is ${app.android?.package}`);
} else {
  ok('android.package = com.nomadlabstx.nomad');
}

const whenInUse = app.ios?.infoPlist?.NSLocationWhenInUseUsageDescription || '';
if (!/highway|trip|county/i.test(whenInUse)) {
  fail('NSLocationWhenInUseUsageDescription is missing extra-miler purpose copy');
} else {
  ok('NSLocationWhenInUseUsageDescription set');
}

const locationPlugin = (app.plugins || []).find(
  (entry) => entry === 'expo-location' || (Array.isArray(entry) && entry[0] === 'expo-location')
);
if (!locationPlugin) {
  fail('expo-location plugin missing');
} else {
  ok('expo-location plugin present');
}

const preview = eas.build?.preview;
const production = eas.build?.production;
if (preview?.distribution !== 'internal') fail('eas preview must be internal');
else ok('eas preview is internal');
if (production?.distribution !== 'store') fail('eas production must be store (TestFlight)');
else ok('eas production is store');
if (preview?.environment !== 'preview') fail('eas preview.environment must be preview');
else ok('eas preview.environment = preview');
if (production?.environment !== 'production') fail('eas production.environment must be production');
else ok('eas production.environment = production');

const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!mapsKey) {
  warn('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not in this shell. Set it on expo.dev production env before eas build, or GPS routing/place identity will fail on device.');
} else {
  ok('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY present in this shell');
}
if (!geminiKey) {
  warn('EXPO_PUBLIC_GEMINI_API_KEY not in this shell. Pathfinder needs it on the EAS production environment.');
} else {
  ok('EXPO_PUBLIC_GEMINI_API_KEY present in this shell');
}

if (failed > 0) {
  console.error(`Phase 1 config check failed (${failed} error(s), ${warned} warning(s)).`);
  process.exit(1);
}

console.log(`Phase 1 config check passed (${warned} warning(s)).`);
