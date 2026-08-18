#!/usr/bin/env node

/**
 * Carefully verify city counts and identify discrepancies
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Careful Count Verification');
console.log('='.repeat(70));

// Load database
const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Count cities more carefully
let totalEntries = 0;
const uniqueCities = new Set();
const cityDetails = [];

dbLines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    totalEntries++;
    
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    const countyMatch = line.match(/county:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const name = nameMatch[1].trim();
      const stateCode = stateCodeMatch[1].trim();
      const key = `${name.toLowerCase()}|${stateCode}`;
      
      uniqueCities.add(key);
      
      cityDetails.push({
        name,
        stateCode,
        county: countyMatch ? countyMatch[1] : 'Unknown',
        lineNumber: index + 1
      });
    }
  }
});

console.log(`\n📊 Database Analysis:`);
console.log(`   Total city entries: ${totalEntries}`);
console.log(`   Unique cities (name+state): ${uniqueCities.size}`);

// Count by type (incorporated vs CDP - we can't always tell, but check for patterns)
const unknownCounties = cityDetails.filter(c => c.county === 'Unknown County').length;
console.log(`   Cities with Unknown County: ${unknownCounties}`);

// Check TIGER extraction
const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
let extractedPlaces = [];
try {
  extractedPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
  console.log(`\n📊 TIGER Extraction:`);
  console.log(`   Total places extracted: ${extractedPlaces.length}`);
  console.log(`   Incorporated: ${extractedPlaces.filter(p => p.type === 'incorporated').length}`);
  console.log(`   CDPs: ${extractedPlaces.filter(p => p.type === 'CDP').length}`);
  
  // Check which are missing
  const missingFromTiger = [];
  extractedPlaces.forEach(place => {
    const key = `${place.name.trim().toLowerCase()}|${place.stateCode}`;
    if (!uniqueCities.has(key)) {
      missingFromTiger.push(place);
    }
  });
  
  console.log(`   Missing from database: ${missingFromTiger.length}`);
  
  if (missingFromTiger.length > 0) {
    console.log(`\n   First 10 missing:`);
    missingFromTiger.slice(0, 10).forEach((p, i) => {
      console.log(`     ${i + 1}. ${p.name}, ${p.stateCode} (${p.type})`);
    });
  }
} catch (e) {
  console.log(`   ⚠️  Could not load: ${e.message}`);
}

// Check Census data
const censusPath = path.join(__dirname, '..', 'data', 'us-cities-census.ts');
let censusCount = 0;
try {
  const censusContent = fs.readFileSync(censusPath, 'utf8');
  const censusLines = censusContent.split('\n');
  
  censusLines.forEach(line => {
    if (line.includes('name:') && line.includes('stateCode:')) {
      censusCount++;
    }
  });
  
  console.log(`\n📊 Census Data:`);
  console.log(`   Total cities in file: ${censusCount}`);
  
  // Check which are missing
  let missingFromCensus = 0;
  censusLines.forEach(line => {
    if (line.includes('name:') && line.includes('stateCode:')) {
      const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
      const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
      if (nameMatch && stateCodeMatch) {
        const key = `${nameMatch[1].trim().toLowerCase()}|${stateCodeMatch[1].trim()}`;
        if (!uniqueCities.has(key)) {
          missingFromCensus++;
        }
      }
    }
  });
  
  console.log(`   Missing from database: ${missingFromCensus}`);
} catch (e) {
  console.log(`   ⚠️  Could not load: ${e.message}`);
}

// Summary
console.log(`\n📊 Summary:`);
console.log(`   Current database: ${uniqueCities.size} unique cities`);
console.log(`   Target: 32,188 cities`);
console.log(`   Difference: ${32188 - uniqueCities.size} cities`);

// Check for potential duplicates (same name, state, very similar coordinates)
console.log(`\n🔍 Checking for near-duplicates...`);
const coordinateMap = new Map();
cityDetails.forEach(city => {
  const key = `${city.name.toLowerCase()}|${city.stateCode}`;
  if (!coordinateMap.has(key)) {
    coordinateMap.set(key, []);
  }
  coordinateMap.get(key).push(city);
});

const potentialDuplicates = [];
coordinateMap.forEach((cities, key) => {
  if (cities.length > 1) {
    potentialDuplicates.push({ key, count: cities.length, cities });
  }
});

if (potentialDuplicates.length > 0) {
  console.log(`   Found ${potentialDuplicates.length} cities with same name+state (may be legitimate duplicates):`);
  potentialDuplicates.slice(0, 5).forEach((dup, i) => {
    const [name, state] = dup.key.split('|');
    console.log(`     ${i + 1}. ${name}, ${state} (${dup.count} entries)`);
  });
}

console.log(`\n✅ Verification complete!`);
console.log(`\n💡 Analysis:`);
console.log(`   - If we have ${uniqueCities.size} unique cities and need 32,188, we need ${32188 - uniqueCities.size} more`);
console.log(`   - However, the 32,188 number might include:`);
console.log(`     * Places that don't exist anymore`);
console.log(`     * Different counting methodology`);
console.log(`     * Places from different data sources`);
console.log(`   - TIGER extraction has ${extractedPlaces.length} places, which is ${extractedPlaces.length - uniqueCities.size} more than our database`);

