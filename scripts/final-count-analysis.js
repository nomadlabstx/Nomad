#!/usr/bin/env node

/**
 * Final count analysis to understand the discrepancy
 */

const fs = require('fs');
const path = require('path');

console.log('📊 Final Count Analysis');
console.log('='.repeat(70));

// Load database
const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Count carefully
let totalEntries = 0;
const uniqueCities = new Set();

dbLines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    totalEntries++;
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].trim().toLowerCase()}|${stateCodeMatch[1].trim()}`;
      uniqueCities.add(key);
    }
  }
});

console.log(`\n📊 Database:`);
console.log(`   Total entries: ${totalEntries}`);
console.log(`   Unique cities: ${uniqueCities.size}`);

// Load TIGER
const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
const extractedPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

const tigerUnique = new Set();
extractedPlaces.forEach(p => {
  tigerUnique.add(`${p.name.trim().toLowerCase()}|${p.stateCode}`);
});

console.log(`\n📊 TIGER Data:`);
console.log(`   Total entries: ${extractedPlaces.length}`);
console.log(`   Unique cities: ${tigerUnique.size}`);

// Find missing
const missing = [];
extractedPlaces.forEach(p => {
  const key = `${p.name.trim().toLowerCase()}|${p.stateCode}`;
  if (!uniqueCities.has(key)) {
    missing.push(p);
  }
});

console.log(`\n❌ Missing from database: ${missing.length} unique cities`);

// Find extra
const extra = [];
uniqueCities.forEach(key => {
  if (!tigerUnique.has(key)) {
    const [name, state] = key.split('|');
    extra.push({ name, state });
  }
});

console.log(`   Extra in database (not in TIGER): ${extra.length} unique cities`);

// Summary
console.log(`\n📊 Summary:`);
console.log(`   Database unique: ${uniqueCities.size}`);
console.log(`   TIGER unique: ${tigerUnique.size}`);
console.log(`   TIGER total entries: ${extractedPlaces.length}`);
console.log(`   Target (32,188): Includes territories`);
console.log(`   Target (US+DC only): 32,041 total entries OR ${tigerUnique.size} unique`);

console.log(`\n💡 Analysis:`);
console.log(`   If target is UNIQUE cities for US+DC: ${tigerUnique.size}`);
console.log(`     Current: ${uniqueCities.size}`);
console.log(`     Missing: ${missing.length}`);
console.log(`     After adding missing: ${uniqueCities.size + missing.length}`);
console.log(`     Difference: ${tigerUnique.size - (uniqueCities.size + missing.length)}`);
console.log(`   `);
console.log(`   If target is TOTAL entries for US+DC: ${extractedPlaces.length}`);
console.log(`     Current entries: ${totalEntries}`);
console.log(`     Difference: ${extractedPlaces.length - totalEntries}`);

console.log(`\n🎯 Recommendation:`);
if (uniqueCities.size + missing.length >= tigerUnique.size) {
  console.log(`   ✅ We have/are exceeding TIGER unique count!`);
  console.log(`   ✅ Just need to add the ${missing.length} missing places`);
} else {
  console.log(`   ⚠️  Need to add ${missing.length} missing + ${tigerUnique.size - (uniqueCities.size + missing.length)} more`);
}

