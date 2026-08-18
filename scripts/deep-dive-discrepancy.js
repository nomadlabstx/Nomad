#!/usr/bin/env node

/**
 * Deep dive into the discrepancy between database entries and unique cities
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Deep Dive: Database vs TIGER Discrepancy');
console.log('='.repeat(70));

// Load database
const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Count entries vs unique
let totalEntries = 0;
const uniqueCities = new Set();
const entryDetails = [];

dbLines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    totalEntries++;
    
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    const countyMatch = line.match(/county:\s*['"]([^'"]+)['"]/);
    const latMatch = line.match(/latitude:\s*([0-9.-]+)/);
    const lngMatch = line.match(/longitude:\s*([0-9.-]+)/);
    
    if (nameMatch && stateCodeMatch) {
      const name = nameMatch[1].trim();
      const stateCode = stateCodeMatch[1].trim();
      const key = `${name.toLowerCase()}|${stateCode}`;
      
      uniqueCities.add(key);
      
      entryDetails.push({
        name,
        stateCode,
        county: countyMatch ? countyMatch[1] : 'Unknown',
        latitude: latMatch ? parseFloat(latMatch[1]) : null,
        longitude: lngMatch ? parseFloat(lngMatch[1]) : null,
        lineNumber: index + 1
      });
    }
  }
});

console.log(`\n📊 Database Counts:`);
console.log(`   Total entries: ${totalEntries}`);
console.log(`   Unique cities (name+state): ${uniqueCities.size}`);
console.log(`   Difference: ${totalEntries - uniqueCities.size} duplicate entries`);

// Find entries with same name+state but different locations
const duplicatesByName = new Map();
entryDetails.forEach(entry => {
  const key = `${entry.name.toLowerCase()}|${entry.stateCode}`;
  if (!duplicatesByName.has(key)) {
    duplicatesByName.set(key, []);
  }
  duplicatesByName.get(key).push(entry);
});

const legitimateDuplicates = [];
duplicatesByName.forEach((entries, key) => {
  if (entries.length > 1) {
    // Check if they're in different counties or have different coordinates
    const counties = new Set(entries.map(e => e.county));
    const coords = entries.map(e => `${e.latitude?.toFixed(4)}|${e.longitude?.toFixed(4)}`);
    const uniqueCoords = new Set(coords);
    
    if (counties.size > 1 || uniqueCoords.size > 1) {
      legitimateDuplicates.push({
        key,
        count: entries.length,
        counties: Array.from(counties),
        entries
      });
    }
  }
});

console.log(`\n📊 Legitimate Duplicates (same name+state, different location):`);
console.log(`   Found: ${legitimateDuplicates.length} cities with multiple locations`);
console.log(`   Total duplicate entries: ${legitimateDuplicates.reduce((sum, d) => sum + d.count - 1, 0)}`);

if (legitimateDuplicates.length > 0) {
  console.log(`\n   Examples:`);
  legitimateDuplicates.slice(0, 5).forEach(dup => {
    const [name, state] = dup.key.split('|');
    console.log(`     ${name}, ${state}: ${dup.count} entries in ${dup.counties.length} counties`);
  });
}

// Load TIGER data
const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
const extractedPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

console.log(`\n📊 TIGER Data:`);
console.log(`   Total places: ${extractedPlaces.length}`);

// Check for duplicates in TIGER data
const tigerByName = new Map();
extractedPlaces.forEach(place => {
  const key = `${place.name.trim().toLowerCase()}|${place.stateCode}`;
  if (!tigerByName.has(key)) {
    tigerByName.set(key, []);
  }
  tigerByName.get(key).push(place);
});

const tigerDuplicates = [];
tigerByName.forEach((places, key) => {
  if (places.length > 1) {
    tigerDuplicates.push({ key, count: places.length, places });
  }
});

console.log(`   Unique cities (name+state): ${tigerByName.size}`);
console.log(`   Duplicate entries: ${tigerDuplicates.length} cities with multiple entries`);
console.log(`   Total duplicate entries: ${tigerDuplicates.reduce((sum, d) => sum + d.count - 1, 0)}`);

if (tigerDuplicates.length > 0) {
  console.log(`\n   Examples:`);
  tigerDuplicates.slice(0, 5).forEach(dup => {
    const [name, state] = dup.key.split('|');
    const types = [...new Set(dup.places.map(p => p.type))];
    console.log(`     ${name}, ${state}: ${dup.count} entries (types: ${types.join(', ')})`);
  });
}

// Compare unique counts
console.log(`\n📊 Comparison:`);
console.log(`   Database unique: ${uniqueCities.size}`);
console.log(`   TIGER unique: ${tigerByName.size}`);
console.log(`   Difference: ${tigerByName.size - uniqueCities.size}`);

// Find what's in TIGER but not in database (by unique name+state)
const missingFromDb = [];
tigerByName.forEach((places, key) => {
  if (!uniqueCities.has(key)) {
    missingFromDb.push(places[0]); // Take first instance
  }
});

console.log(`\n❌ Missing from database (unique): ${missingFromDb.length}`);

// Find what's in database but not in TIGER
const extraInDb = [];
uniqueCities.forEach(key => {
  if (!tigerByName.has(key)) {
    const [name, state] = key.split('|');
    const entry = entryDetails.find(e => 
      e.name.toLowerCase() === name && e.stateCode === state
    );
    if (entry) {
      extraInDb.push(entry);
    }
  }
});

console.log(`   Extra in database (not in TIGER): ${extraInDb.length}`);

// Summary
console.log(`\n📊 Summary:`);
console.log(`   Database entries: ${totalEntries}`);
console.log(`   Database unique: ${uniqueCities.size}`);
console.log(`   TIGER total: ${extractedPlaces.length}`);
console.log(`   TIGER unique: ${tigerByName.size}`);
console.log(`   Missing from DB: ${missingFromDb.length}`);
console.log(`   Extra in DB: ${extraInDb.length}`);

// Calculate what we actually need
const netMissing = missingFromDb.length;
console.log(`\n💡 Net Analysis:`);
console.log(`   After adding ${netMissing} missing places:`);
console.log(`   Unique count would be: ${uniqueCities.size + netMissing}`);
console.log(`   Target (TIGER unique): ${tigerByName.size}`);
console.log(`   Still need: ${tigerByName.size - (uniqueCities.size + netMissing)} more`);

if (extraInDb.length > 0) {
  console.log(`\n   Note: ${extraInDb.length} cities in database are not in TIGER data`);
  console.log(`   These might be from Census data or other sources`);
  console.log(`   Examples:`);
  extraInDb.slice(0, 5).forEach(e => {
    console.log(`     - ${e.name}, ${e.stateCode}`);
  });
}

