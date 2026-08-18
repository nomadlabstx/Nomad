#!/usr/bin/env node

/**
 * Add the geocoded CDPs using the robust add approach
 * Reads from geocoded-missing-cdps.json and adds them to the database
 */

const fs = require('fs').promises;
const path = require('path');

async function main() {
  // Load the robust add functions by reading the file and extracting the needed functions
  const robustScriptPath = path.join(__dirname, 'fix-failed-cities-robust.js');
  // const robustScriptContent = await fs.readFile(robustScriptPath, 'utf8');

  // We'll need to manually implement the addCityRobust function
  // Or use a simpler direct approach

  const geocodedPath = path.join(__dirname, '..', 'data', 'geocoded-missing-cdps.json');
  const geocodedPlaces = JSON.parse(await fs.readFile(geocodedPath, 'utf8'));

  const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');

console.log('📊 Adding Geocoded CDPs');
console.log('='.repeat(70));
console.log(`\n📊 Found ${geocodedPlaces.length} geocoded places to add`);

// For now, let's use the existing geocode-extracted-places.js approach
// But we need to modify it to use our geocoded data
// Actually, let's create a simpler script that uses the addCityRobust pattern

// Read the database
let dbContent = await fs.readFile(dbPath, 'utf8');

// Add places one by one using string manipulation (simpler than regex)
async function addCitySimple(city) {
  const escapedName = city.name.replace(/'/g, "\\'");
  const escapedState = city.state.replace(/'/g, "\\'");
  const escapedCounty = city.county.replace(/'/g, "\\'");
  
  // Find the state section
  const statePattern = new RegExp(`code:\\s*['"]${city.stateCode}['"]`, 'i');
  const stateMatch = statePattern.exec(dbContent);
  
  if (!stateMatch) {
    console.log(`   ⚠️  State ${city.stateCode} not found, skipping ${city.name}`);
    return false;
  }
  
  // Find the county in that state
  const stateStart = stateMatch.index;
  const nextState = dbContent.indexOf('code:', stateStart + 100);
  const stateSection = dbContent.substring(stateStart, nextState !== -1 ? nextState : dbContent.length);
  
  // Check if county exists
  const countyPattern = new RegExp(`name:\\s*['"]${escapedCounty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i');
  const countyMatch = countyPattern.exec(stateSection);
  
  if (countyMatch) {
    // County exists - add city to it
    const countyStart = stateStart + countyMatch.index;
    const citiesStart = dbContent.indexOf('cities: [', countyStart);
    if (citiesStart !== -1) {
      const insertPoint = dbContent.indexOf(']', citiesStart);
      const newCity = `\n          { name: '${escapedName}', state: '${escapedState}', stateCode: '${city.stateCode}', county: '${escapedCounty}', latitude: ${city.latitude}, longitude: ${city.longitude}, population: ${city.population}, size: '${city.size}', confidence: '${city.confidence}' },`;
      dbContent = dbContent.substring(0, insertPoint) + newCity + '\n        ' + dbContent.substring(insertPoint);
      return true;
    }
  } else {
    // County doesn't exist - add county and city
    const countiesStart = stateSection.indexOf('counties: [');
    if (countiesStart !== -1) {
      const insertPoint = stateStart + countiesStart + stateSection.substring(countiesStart).indexOf('[') + 1;
      const newCounty = `\n      {\n        name: '${escapedCounty}',\n        cities: [\n          { name: '${escapedName}', state: '${escapedState}', stateCode: '${city.stateCode}', county: '${escapedCounty}', latitude: ${city.latitude}, longitude: ${city.longitude}, population: ${city.population}, size: '${city.size}', confidence: '${city.confidence}' },\n        ],\n      },`;
      dbContent = dbContent.substring(0, insertPoint) + newCounty + dbContent.substring(insertPoint);
      return true;
    }
  }
  
  return false;
}

let success = 0;
let failed = 0;

for (const city of geocodedPlaces) {
  process.stdout.write(`\r   Adding ${city.name}, ${city.stateCode}...`);
  
  try {
    const result = await addCitySimple(city);
    if (result) {
      success++;
    } else {
      failed++;
      console.log(`\n   ❌ Failed to add: ${city.name}`);
    }
  } catch (error) {
    failed++;
    console.log(`\n   ❌ Error adding ${city.name}: ${error.message}`);
  }
}

if (success > 0) {
  await fs.writeFile(dbPath, dbContent, 'utf8');
  console.log(`\n\n✅ Successfully added ${success} places`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Database updated: ${dbPath}`);
} else {
  console.log(`\n\n⚠️  No places were added. Check errors above.`);
}

  // Note: The simple approach might have issues with complex cases
  // For production, use the robust add function from fix-failed-cities-robust.js
  console.log(`\n📝 Note: For production, consider using fix-failed-cities-robust.js approach`);
}

main().catch(console.error);

