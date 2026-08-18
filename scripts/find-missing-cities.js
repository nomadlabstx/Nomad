#!/usr/bin/env node

/**
 * Find missing cities by comparing extracted TIGER places with database
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');

console.log('🔍 Finding Missing Cities');
console.log('='.repeat(70));

// Load extracted places
const extractedPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
console.log(`\n📊 Loaded ${extractedPlaces.length} extracted places from TIGER data`);

// Load database
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Extract cities from database
const dbCities = new Set();
const dbCitiesMap = new Map(); // name|stateCode -> city info

dbLines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const name = nameMatch[1];
      const stateCode = stateCodeMatch[1];
      const key = `${name}|${stateCode}`;
      
      dbCities.add(key);
      dbCitiesMap.set(key, { name, stateCode, lineNumber: index + 1 });
    }
  }
});

console.log(`📊 Found ${dbCities.size} cities in database`);

// Find missing places
const missingPlaces = [];

extractedPlaces.forEach(place => {
  const key = `${place.name}|${place.stateCode}`;
  
  if (!dbCities.has(key)) {
    missingPlaces.push(place);
  }
});

console.log(`\n❌ Missing places: ${missingPlaces.length}`);
console.log(`   Expected total: ${extractedPlaces.length}`);
console.log(`   In database: ${dbCities.size}`);
console.log(`   Missing: ${missingPlaces.length}`);

// Group by state
const byState = new Map();
missingPlaces.forEach(place => {
  if (!byState.has(place.stateCode)) {
    byState.set(place.stateCode, []);
  }
  byState.get(place.stateCode).push(place);
});

console.log(`\n📊 Missing places by state:`);
const sortedStates = Array.from(byState.entries()).sort((a, b) => b[1].length - a[1].length);
sortedStates.forEach(([state, places]) => {
  console.log(`   ${state}: ${places.length} missing`);
});

// Save missing places
const outputPath = path.join(__dirname, '..', 'data', 'missing-places-to-add.json');
fs.writeFileSync(outputPath, JSON.stringify(missingPlaces, null, 2));

console.log(`\n✅ Saved ${missingPlaces.length} missing places to: data/missing-places-to-add.json`);

// Show first 20 missing places
console.log(`\n📋 First 20 missing places:`);
missingPlaces.slice(0, 20).forEach((place, i) => {
  console.log(`   ${i + 1}. ${place.name}, ${place.stateCode} (${place.type})`);
});

if (missingPlaces.length > 20) {
  console.log(`   ... and ${missingPlaces.length - 20} more`);
}

