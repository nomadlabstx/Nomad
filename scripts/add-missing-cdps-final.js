#!/usr/bin/env node

/**
 * Add the 51 missing CDPs - verify they're actually missing first
 */

const fs = require('fs');
const path = require('path');

const missingPath = path.join(__dirname, '..', 'data', 'missing-census-places.json');
const missingPlaces = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');

console.log('📊 Adding Missing CDPs - Final Verification');
console.log('='.repeat(70));
console.log(`\n📊 Checking ${missingPlaces.length} "missing" places...`);

// First, verify which are ACTUALLY missing (with better matching)
const actuallyMissing = [];

missingPlaces.forEach(place => {
  // Try multiple matching strategies
  const name = place.name;
  const stateCode = place.stateCode;
  
  // Clean name for matching (remove special chars, normalize)
  const cleanName = name.toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  
  // Check if exists with exact match
  const exactPattern = new RegExp(`name:\\s*['"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i');
  const exactMatch = exactPattern.test(dbContent) && dbContent.includes(`stateCode: '${stateCode}'`);
  
  // Check if exists with cleaned name
  const cleanedNameEscaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const cleanedPattern = new RegExp(`name:\\s*['"][^'"]*${cleanedNameEscaped}[^'"]*['"]`, 'i');
  const cleanedMatch = cleanedPattern.test(dbContent) && dbContent.includes(`stateCode: '${stateCode}'`);
  
  // Check if exists with state code nearby
  const stateCodeIndex = dbContent.indexOf(`stateCode: '${stateCode}'`);
  if (stateCodeIndex !== -1) {
    const section = dbContent.substring(Math.max(0, stateCodeIndex - 500), stateCodeIndex + 500);
    const sectionMatch = section.toLowerCase().includes(name.toLowerCase());
    if (sectionMatch && !exactMatch && !cleanedMatch) {
      // Might be there with different formatting
      console.log(`   ⚠️  "${name}, ${stateCode}" might exist with different formatting`);
    }
  }
  
  if (!exactMatch && !cleanedMatch) {
    actuallyMissing.push(place);
  }
});

console.log(`\n📊 Verification Results:`);
console.log(`   Checked: ${missingPlaces.length}`);
console.log(`   Actually missing: ${actuallyMissing.length}`);
console.log(`   Already in database: ${missingPlaces.length - actuallyMissing.length}`);

if (actuallyMissing.length > 0) {
  console.log(`\n   Actually missing places:`);
  actuallyMissing.forEach((place, i) => {
    console.log(`   ${i + 1}. ${place.name}, ${place.stateCode} (${place.type})`);
  });
  
  // Save actually missing
  const actuallyMissingPath = path.join(__dirname, '..', 'data', 'actually-missing-cdps.json');
  fs.writeFileSync(actuallyMissingPath, JSON.stringify(actuallyMissing, null, 2), 'utf8');
  console.log(`\n💾 Saved ${actuallyMissing.length} actually missing places to: data/actually-missing-cdps.json`);
  console.log(`\n📝 Next step: Use fix-failed-cities-robust.js or geocode-extracted-places.js to add these places`);
} else {
  console.log(`\n✅ All places are already in the database!`);
  console.log(`   The "missing" was due to matching logic issues.`);
}

console.log(`\n✅ Verification complete!`);

