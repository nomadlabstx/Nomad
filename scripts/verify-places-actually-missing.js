#!/usr/bin/env node

/**
 * Properly verify if places are actually missing by handling quote escaping
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying if Places are Actually Missing');
console.log('='.repeat(70));

// Load database
const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');

// Load "missing" places
const missingPath = path.join(__dirname, '..', 'data', 'investigation-missing-places.json');
const investigation = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
const missingPlaces = investigation.missingPlaces;

console.log(`\n📊 Checking ${missingPlaces.length} "missing" places...`);

const actuallyMissing = [];
const foundInDb = [];

missingPlaces.forEach(place => {
  // Try multiple matching patterns to handle quote escaping
  const nameVariations = [
    place.name,
    place.name.replace(/'/g, "\\'"),
    place.name.replace(/'/g, "'"),
    place.name.replace(/"/g, '\\"'),
    place.name.replace(/"/g, '"'),
  ];
  
  let found = false;
  
  for (const nameVar of nameVariations) {
    // Try with escaped quotes
    const escaped = nameVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`name:\\s*['"]${escaped}['"]`, 'i'),
      new RegExp(`name:\\s*['"]${nameVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i'),
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(dbContent)) {
        // Also verify state code is correct
        const statePattern = new RegExp(
          `name:\\s*['"]${escaped}['"]\\s*[^}]*stateCode:\\s*['"]${place.stateCode}['"]`,
          'i'
        );
        
        if (statePattern.test(dbContent)) {
          found = true;
          break;
        }
      }
    }
    
    if (found) break;
  }
  
  if (found) {
    foundInDb.push(place);
  } else {
    actuallyMissing.push(place);
  }
});

console.log(`\n📊 Results:`);
console.log(`   Found in database: ${foundInDb.length}`);
console.log(`   Actually missing: ${actuallyMissing.length}`);

if (foundInDb.length > 0) {
  console.log(`\n✅ These places ARE in the database (matching issue was the problem):`);
  foundInDb.slice(0, 10).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}, ${p.stateCode}`);
  });
  if (foundInDb.length > 10) {
    console.log(`   ... and ${foundInDb.length - 10} more`);
  }
}

if (actuallyMissing.length > 0) {
  console.log(`\n❌ These places are ACTUALLY missing:`);
  actuallyMissing.slice(0, 20).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}, ${p.stateCode} (${p.type})`);
  });
  if (actuallyMissing.length > 20) {
    console.log(`   ... and ${actuallyMissing.length - 20} more`);
  }
  
  // Save actually missing
  const outputPath = path.join(__dirname, '..', 'data', 'actually-missing-places.json');
  fs.writeFileSync(outputPath, JSON.stringify(actuallyMissing, null, 2));
  console.log(`\n✅ Saved ${actuallyMissing.length} actually missing places to: data/actually-missing-places.json`);
} else {
  console.log(`\n🎉 All places are already in the database!`);
}

