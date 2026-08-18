#!/usr/bin/env node

/**
 * Comprehensive Census Data Coverage Verification
 * 
 * Target: 19,734 incorporated places + 12,098 CDPs = 31,832 total
 * (Note: TIGER data shows 32,041 total entries, 31,830 unique for US+DC)
 */

const fs = require('fs');
const path = require('path');

console.log('📊 Census Data Coverage Verification');
console.log('='.repeat(70));

// Load main database
const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Extract all cities from database
const dbCities = new Map(); // key: "name|stateCode" -> { name, stateCode, county, type }
const dbByType = { incorporated: 0, cdp: 0, unknown: 0 };

dbLines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    const countyMatch = line.match(/county:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].trim().toLowerCase()}|${stateCodeMatch[1].trim()}`;
      const city = {
        name: nameMatch[1].trim(),
        stateCode: stateCodeMatch[1].trim(),
        county: countyMatch ? countyMatch[1].trim() : 'Unknown',
        type: 'unknown'
      };
      
      // Try to infer type from confidence or other fields
      if (line.includes('incorporated') || line.includes('city') || line.includes('town') || line.includes('village')) {
        city.type = 'incorporated';
        dbByType.incorporated++;
      } else if (line.includes('CDP') || line.includes('cdp') || line.includes('Census-Designated')) {
        city.type = 'cdp';
        dbByType.cdp++;
      } else {
        dbByType.unknown++;
      }
      
      dbCities.set(key, city);
    }
  }
});

console.log(`\n📊 Database Summary:`);
console.log(`   Total entries: ${dbCities.size}`);
console.log(`   Incorporated (estimated): ${dbByType.incorporated}`);
console.log(`   CDPs (estimated): ${dbByType.cdp}`);
console.log(`   Unknown type: ${dbByType.unknown}`);

// Load TIGER data if available
const tigerPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
let tigerData = null;
let tigerCounts = { total: 0, incorporated: 0, cdp: 0, unique: 0 };

try {
  const tigerContent = fs.readFileSync(tigerPath, 'utf8');
  tigerData = JSON.parse(tigerContent);
  
  const tigerUnique = new Set();
  tigerData.forEach(place => {
    tigerCounts.total++;
    if (place.isIncorporated) {
      tigerCounts.incorporated++;
    } else {
      tigerCounts.cdp++;
    }
    const key = `${place.name.trim().toLowerCase()}|${place.stateCode}`;
    tigerUnique.add(key);
  });
  tigerCounts.unique = tigerUnique.size;
  
  console.log(`\n📊 TIGER Data Summary:`);
  console.log(`   Total entries: ${tigerCounts.total}`);
  console.log(`   Unique places: ${tigerCounts.unique}`);
  console.log(`   Incorporated: ${tigerCounts.incorporated}`);
  console.log(`   CDPs: ${tigerCounts.cdp}`);
} catch (e) {
  console.log(`\n⚠️  TIGER data file not found: ${tigerPath}`);
}

// Load Census data if available
const censusPath = path.join(__dirname, '..', 'data', 'us-cities-census.ts');
let censusData = null;
let censusCounts = { total: 0, incorporated: 0, cdp: 0 };

try {
  const censusContent = fs.readFileSync(censusPath, 'utf8');
  // Extract cities from Census file
  const censusLines = censusContent.split('\n');
  censusLines.forEach(line => {
    if (line.includes('name:') && line.includes('stateCode:')) {
      censusCounts.total++;
      if (line.includes('incorporated') || line.includes('city') || line.includes('town')) {
        censusCounts.incorporated++;
      } else if (line.includes('CDP') || line.includes('cdp')) {
        censusCounts.cdp++;
      }
    }
  });
  
  console.log(`\n📊 Census Data File Summary:`);
  console.log(`   Total entries: ${censusCounts.total}`);
  console.log(`   Incorporated: ${censusCounts.incorporated}`);
  console.log(`   CDPs: ${censusCounts.cdp}`);
} catch (e) {
  console.log(`\n⚠️  Census data file not found: ${censusPath}`);
}

// Compare database with TIGER
let missingFromDb = [];
let extraInDb = [];

if (tigerData) {
  console.log(`\n📊 Coverage Comparison:`);
  
  tigerData.forEach(tigerPlace => {
    const key = `${tigerPlace.name.trim().toLowerCase()}|${tigerPlace.stateCode}`;
    if (!dbCities.has(key)) {
      missingFromDb.push({
        name: tigerPlace.name,
        stateCode: tigerPlace.stateCode,
        isIncorporated: tigerPlace.isIncorporated,
        type: tigerPlace.isIncorporated ? 'incorporated' : 'CDP'
      });
    }
  });
  
  dbCities.forEach((dbCity, key) => {
    const tigerPlace = tigerData.find(p => 
      `${p.name.trim().toLowerCase()}|${p.stateCode}` === key
    );
    if (!tigerPlace) {
      extraInDb.push(dbCity);
    }
  });
  
  console.log(`   Missing from database: ${missingFromDb.length} places`);
  console.log(`   Extra in database: ${extraInDb.length} places`);
  
  if (missingFromDb.length > 0 && missingFromDb.length <= 20) {
    console.log(`\n   Missing places (first ${Math.min(20, missingFromDb.length)}):`);
    missingFromDb.slice(0, 20).forEach((place, i) => {
      console.log(`   ${i + 1}. ${place.name}, ${place.stateCode} (${place.type})`);
    });
  }
  
  if (missingFromDb.length > 20) {
    console.log(`\n   (Showing first 20 of ${missingFromDb.length} missing places)`);
  }
  
  // Group missing by type
  const missingByType = { incorporated: 0, cdp: 0 };
  missingFromDb.forEach(p => {
    if (p.isIncorporated) {
      missingByType.incorporated++;
    } else {
      missingByType.cdp++;
    }
  });
  
  console.log(`\n   Missing by type:`);
  console.log(`      Incorporated: ${missingByType.incorporated}`);
  console.log(`      CDPs: ${missingByType.cdp}`);
}

// Target comparison
console.log(`\n📊 Target Comparison:`);
console.log(`   Census Bureau targets:`);
console.log(`      Incorporated places: 19,734`);
console.log(`      CDPs: 12,098`);
console.log(`      Total: 31,832`);
console.log(`   TIGER/Line data (US+DC):`);
console.log(`      Total entries: ${tigerCounts.total || 'N/A'}`);
console.log(`      Unique places: ${tigerCounts.unique || 'N/A'}`);
console.log(`   Current database:`);
console.log(`      Unique cities: ${dbCities.size}`);
console.log(`      Status: ${dbCities.size >= (tigerCounts.unique || 31830) ? '✅ MEETS/EXCEEDS TIGER' : '❌ Below TIGER'}`);

// Coverage percentage
if (tigerCounts.unique) {
  const coverage = ((dbCities.size / tigerCounts.unique) * 100).toFixed(2);
  console.log(`\n   Coverage: ${coverage}% of TIGER unique places`);
  
  if (coverage >= 99.5) {
    console.log(`   ✅ Excellent coverage!`);
  } else if (coverage >= 95) {
    console.log(`   ⚠️  Good coverage, but some places missing`);
  } else {
    console.log(`   ❌ Significant gaps in coverage`);
  }
}

// Save missing places if any
if (tigerData && missingFromDb.length > 0) {
  const missingPath = path.join(__dirname, '..', 'data', 'missing-census-places.json');
  fs.writeFileSync(missingPath, JSON.stringify(missingFromDb, null, 2), 'utf8');
  console.log(`\n💾 Saved ${missingFromDb.length} missing places to: data/missing-census-places.json`);
}

console.log(`\n✅ Verification complete!`);

