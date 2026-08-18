#!/usr/bin/env node

/**
 * Find Failed Cities
 * Compares extracted places with database to find missing cities
 */

const fs = require('fs').promises;
const path = require('path');

async function findFailedCities() {
  console.log('🔍 Finding Failed Cities');
  console.log('='.repeat(70));
  
  // Load extracted places
  const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
  const places = JSON.parse(await fs.readFile(extractedPath, 'utf8'));
  
  console.log(`\n📊 Loaded ${places.length} extracted places`);
  
  // Load database
  const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const dbContent = await fs.readFile(dbPath, 'utf8');
  
  // Check each place
  const failed = [];
  
  for (const place of places) {
    const key = `${place.name.toLowerCase().trim()}|${place.stateCode.toUpperCase()}`;
    const pattern = new RegExp(`name:\\s*['"]${place.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^}]*stateCode:\\s*['"]${place.stateCode}['"]`, 'i');
    
    if (!pattern.test(dbContent)) {
      failed.push(place);
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Total places: ${places.length}`);
  console.log(`   Found in database: ${places.length - failed.length}`);
  console.log(`   Missing (failed): ${failed.length}`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Cities:`);
    failed.forEach((place, i) => {
      console.log(`   ${i + 1}. ${place.name}, ${place.stateCode} (${place.type})`);
    });
    
    // Save failed cities
    const failedPath = path.join(__dirname, '..', 'data', 'failed-tiger-places.json');
    await fs.writeFile(failedPath, JSON.stringify(failed, null, 2));
    console.log(`\n💾 Saved failed cities to: ${failedPath}`);
  }
  
  return failed;
}

if (require.main === module) {
  findFailedCities().catch(console.error);
}

module.exports = { findFailedCities };

