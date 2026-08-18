#!/usr/bin/env node

/**
 * Explain why we exceed TIGER - find what extra sources we have
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Why Do We Exceed TIGER?');
console.log('='.repeat(70));

// Load database
const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Extract unique cities from database
const dbCities = new Map(); // name+state -> count of entries

dbLines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].trim().toLowerCase()}|${stateCodeMatch[1].trim()}`;
      dbCities.set(key, (dbCities.get(key) || 0) + 1);
    }
  }
});

console.log(`\n📊 Database: ${dbCities.size} unique cities`);

// Load TIGER
const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
const extractedPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

const tigerCities = new Map();
extractedPlaces.forEach(p => {
  const key = `${p.name.trim().toLowerCase()}|${p.stateCode}`;
  tigerCities.set(key, (tigerCities.get(key) || 0) + 1);
});

console.log(`📊 TIGER: ${tigerCities.size} unique cities`);

// Find what's in DB but NOT in TIGER
const extraInDb = [];
dbCities.forEach((count, key) => {
  if (!tigerCities.has(key)) {
    const [name, state] = key.split('|');
    extraInDb.push({ name, state, entryCount: count });
  }
});

console.log(`\n📊 Extra in Database (not in TIGER): ${extraInDb.length} cities`);

if (extraInDb.length > 0) {
  console.log(`\n   Examples (first 20):`);
  extraInDb.slice(0, 20).forEach((city, i) => {
    console.log(`   ${i + 1}. ${city.name}, ${city.state} (${city.entryCount} entry/entries)`);
  });
  
  // Group by state
  const byState = new Map();
  extraInDb.forEach(city => {
    if (!byState.has(city.state)) {
      byState.set(city.state, []);
    }
    byState.get(city.state).push(city);
  });
  
  console.log(`\n   By state:`);
  const sortedStates = Array.from(byState.entries()).sort((a, b) => b[1].length - a[1].length);
  sortedStates.forEach(([state, cities]) => {
    console.log(`   ${state}: ${cities.length} extra cities`);
  });
}

// Find what's in TIGER but NOT in DB
const missingFromDb = [];
tigerCities.forEach((count, key) => {
  if (!dbCities.has(key)) {
    const [name, state] = key.split('|');
    missingFromDb.push({ name, state, entryCount: count });
  }
});

console.log(`\n📊 Missing from Database (in TIGER): ${missingFromDb.length} cities`);

if (missingFromDb.length > 0 && missingFromDb.length <= 20) {
  console.log(`\n   Missing cities:`);
  missingFromDb.forEach((city, i) => {
    console.log(`   ${i + 1}. ${city.name}, ${city.state}`);
  });
}

// Summary
console.log(`\n📊 Summary:`);
console.log(`   Database unique: ${dbCities.size}`);
console.log(`   TIGER unique: ${tigerCities.size}`);
console.log(`   Extra in DB: ${extraInDb.length}`);
console.log(`   Missing from DB: ${missingFromDb.length}`);
console.log(`   Net difference: ${dbCities.size - tigerCities.size}`);

console.log(`\n💡 Explanation:`);
console.log(`   We have ${extraInDb.length} cities from other sources (likely Census data)`);
console.log(`   We're missing ${missingFromDb.length} cities from TIGER`);
console.log(`   Net: ${extraInDb.length - missingFromDb.length} more than TIGER`);

