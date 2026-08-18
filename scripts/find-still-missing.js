#!/usr/bin/env node

/**
 * Find places that are still missing by checking failed places against database
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const failedPath = path.join(__dirname, '..', 'data', 'failed-tiger-places.json');

console.log('🔍 Finding Still Missing Places');
console.log('='.repeat(70));

// Load database
const dbContent = fs.readFileSync(dbPath, 'utf8');

// Load failed places
const failedPlaces = JSON.parse(fs.readFileSync(failedPath, 'utf8'));
console.log(`\n📊 Loaded ${failedPlaces.length} failed places`);

// Check which are still missing
const stillMissing = [];

failedPlaces.forEach(place => {
  const nameEscaped = place.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `name:\\s*['"]${nameEscaped}['"]\\s*[^}]*stateCode:\\s*['"]${place.stateCode}['"]`,
    'i'
  );
  
  if (!pattern.test(dbContent)) {
    stillMissing.push(place);
  }
});

console.log(`\n❌ Still missing: ${stillMissing.length} places`);

// Group by state
const byState = new Map();
stillMissing.forEach(place => {
  if (!byState.has(place.stateCode)) {
    byState.set(place.stateCode, []);
  }
  byState.get(place.stateCode).push(place);
});

console.log(`\n📊 Still missing by state:`);
const sortedStates = Array.from(byState.entries()).sort((a, b) => b[1].length - a[1].length);
sortedStates.forEach(([state, places]) => {
  console.log(`   ${state}: ${places.length} missing`);
});

// Save
const outputPath = path.join(__dirname, '..', 'data', 'still-missing-places.json');
fs.writeFileSync(outputPath, JSON.stringify(stillMissing, null, 2));

console.log(`\n✅ Saved ${stillMissing.length} still missing places to: data/still-missing-places.json`);

// Show first 20
console.log(`\n📋 First 20 still missing places:`);
stillMissing.slice(0, 20).forEach((place, i) => {
  console.log(`   ${i + 1}. ${place.name}, ${place.stateCode} (${place.type})`);
});

if (stillMissing.length > 20) {
  console.log(`   ... and ${stillMissing.length - 20} more`);
}

