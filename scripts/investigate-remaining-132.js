#!/usr/bin/env node

/**
 * Investigate the remaining 132 places needed to reach 32,041
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Investigating Remaining 132 Places');
console.log('='.repeat(70));

// Load database
const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Extract all cities from database
const dbCities = new Set();
const dbCitiesByState = new Map();

dbLines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].trim().toLowerCase()}|${stateCodeMatch[1]}`;
      dbCities.add(key);
      
      if (!dbCitiesByState.has(stateCodeMatch[1])) {
        dbCitiesByState.set(stateCodeMatch[1], 0);
      }
      dbCitiesByState.set(stateCodeMatch[1], dbCitiesByState.get(stateCodeMatch[1]) + 1);
    }
  }
});

console.log(`\n📊 Database: ${dbCities.size} unique cities`);

// Load TIGER extraction
const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
const extractedPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

console.log(`📊 TIGER extraction: ${extractedPlaces.length} places`);

// Count by state in TIGER
const tigerByState = new Map();
extractedPlaces.forEach(place => {
  if (!tigerByState.has(place.stateCode)) {
    tigerByState.set(place.stateCode, 0);
  }
  tigerByState.set(place.stateCode, tigerByState.get(place.stateCode) + 1);
});

// Find missing places
const missingPlaces = [];
extractedPlaces.forEach(place => {
  const key = `${place.name.trim().toLowerCase()}|${place.stateCode}`;
  if (!dbCities.has(key)) {
    missingPlaces.push(place);
  }
});

console.log(`\n❌ Missing from database: ${missingPlaces.length} places`);

// Compare state-by-state counts
console.log(`\n📊 State-by-State Comparison:`);
const allStates = new Set([...dbCitiesByState.keys(), ...tigerByState.keys()]);
const stateDiffs = [];

allStates.forEach(state => {
  const dbCount = dbCitiesByState.get(state) || 0;
  const tigerCount = tigerByState.get(state) || 0;
  const diff = tigerCount - dbCount;
  
  if (diff !== 0) {
    stateDiffs.push({ state, dbCount, tigerCount, diff });
  }
});

stateDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

console.log(`\n   States with discrepancies:`);
stateDiffs.forEach(({ state, dbCount, tigerCount, diff }) => {
  console.log(`   ${state}: Database=${dbCount}, TIGER=${tigerCount}, Diff=${diff}`);
});

// Total discrepancy
const totalDbCount = Array.from(dbCitiesByState.values()).reduce((a, b) => a + b, 0);
const totalTigerCount = Array.from(tigerByState.values()).reduce((a, b) => a + b, 0);
const totalDiff = totalTigerCount - totalDbCount;

console.log(`\n📊 Total Count Comparison:`);
console.log(`   Database total: ${totalDbCount}`);
console.log(`   TIGER total: ${totalTigerCount}`);
console.log(`   Difference: ${totalDiff}`);

// Check for potential issues
console.log(`\n🔍 Potential Issues:`);

// Check for cities with encoding issues that might not match
const encodingIssues = [];
missingPlaces.forEach(place => {
  if (place.name.match(/Ã|Ì|‡/)) {
    encodingIssues.push(place);
  }
});

if (encodingIssues.length > 0) {
  console.log(`   ⚠️  ${encodingIssues.length} missing places have encoding issues`);
  console.log(`   Examples:`);
  encodingIssues.slice(0, 5).forEach(p => {
    console.log(`     - ${p.name}, ${p.stateCode}`);
  });
}

// Check for places with special characters
const specialCharPlaces = [];
missingPlaces.forEach(place => {
  if (place.name.match(/['"`]/) || place.name.includes("'") || place.name.includes('"')) {
    specialCharPlaces.push(place);
  }
});

if (specialCharPlaces.length > 0) {
  console.log(`   ⚠️  ${specialCharPlaces.length} missing places have special characters`);
  console.log(`   Examples:`);
  specialCharPlaces.slice(0, 5).forEach(p => {
    console.log(`     - ${p.name}, ${p.stateCode}`);
  });
}

// Check for places that might be duplicates with different names
console.log(`\n🔍 Checking for name variations...`);
const nameVariations = new Map();

missingPlaces.forEach(place => {
  const cleanName = place.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!nameVariations.has(cleanName)) {
    nameVariations.set(cleanName, []);
  }
  nameVariations.get(cleanName).push(place);
});

const possibleDuplicates = [];
nameVariations.forEach((places, cleanName) => {
  if (places.length > 1) {
    const byState = new Map();
    places.forEach(p => {
      if (!byState.has(p.stateCode)) {
        byState.set(p.stateCode, []);
      }
      byState.get(p.stateCode).push(p);
    });
    
    byState.forEach((statePlaces, state) => {
      if (statePlaces.length > 1) {
        possibleDuplicates.push({ cleanName, state, places: statePlaces });
      }
    });
  }
});

if (possibleDuplicates.length > 0) {
  console.log(`   ⚠️  Found ${possibleDuplicates.length} potential duplicate name variations`);
  possibleDuplicates.slice(0, 3).forEach(dup => {
    console.log(`     - ${dup.cleanName} in ${dup.state}:`);
    dup.places.forEach(p => {
      console.log(`       * ${p.name}`);
    });
  });
}

// Summary
console.log(`\n📊 Summary:`);
console.log(`   Current database: ${dbCities.size} unique cities`);
console.log(`   TIGER extraction: ${extractedPlaces.length} places`);
console.log(`   Missing places: ${missingPlaces.length}`);
console.log(`   Target: 32,041 places`);
console.log(`   After adding missing: ${dbCities.size + missingPlaces.length}`);
console.log(`   Still need: ${32041 - (dbCities.size + missingPlaces.length)} more places`);

// Save missing places for review
const outputPath = path.join(__dirname, '..', 'data', 'investigation-missing-places.json');
fs.writeFileSync(outputPath, JSON.stringify({
  missingPlaces,
  stateDiffs,
  encodingIssues,
  specialCharPlaces,
  possibleDuplicates,
  summary: {
    currentDb: dbCities.size,
    tigerTotal: extractedPlaces.length,
    missing: missingPlaces.length,
    target: 32041,
    stillNeeded: 32041 - (dbCities.size + missingPlaces.length)
  }
}, null, 2));

console.log(`\n✅ Investigation results saved to: data/investigation-missing-places.json`);

