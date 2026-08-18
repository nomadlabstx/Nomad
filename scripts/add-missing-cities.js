#!/usr/bin/env node

/**
 * Add Missing Cities to TypeScript File
 * Properly inserts the 15 missing cities into their respective state/county sections
 */

const fs = require('fs').promises;
const path = require('path');

// Missing cities with all details
const MISSING_CITIES = [
  { name: 'Marydel', state: 'Maryland', stateCode: 'MD', county: 'Caroline County', lat: 39.1128904, lng: -75.7457651, pop: 500, size: 'village' },
  { name: 'Virginia Beach', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.8516437, lng: -75.97921939999999, pop: 450000, size: 'major' },
  { name: 'Newport News', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.0870821, lng: -76.4730122, pop: 180000, size: 'medium' },
  { name: 'Suffolk', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.7282054, lng: -76.5835621, pop: 95000, size: 'small' },
  { name: 'Charlottesville', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.0301826, lng: -78.4769353, pop: 48000, size: 'small' },
  { name: 'Colonial Heights', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.244039, lng: -77.4102607, pop: 18000, size: 'small' },
  { name: 'Radford', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.13179239999999, lng: -80.5764477, pop: 17000, size: 'small' },
  { name: 'Manassas Park', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.7840035, lng: -77.4697111, pop: 17000, size: 'small' },
  { name: 'Falls Church', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.88233400000001, lng: -77.1710914, pop: 14000, size: 'small' },
  { name: 'Poquoson', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.1223664, lng: -76.3457773, pop: 12000, size: 'small' },
  { name: 'Galax', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.6612387, lng: -80.9239671, pop: 7000, size: 'small' },
  { name: 'Los Ranchos de Albuquerque', state: 'New Mexico', stateCode: 'NM', county: 'Sandoval County', lat: 35.1619885, lng: -106.6428038, pop: 6000, size: 'village' },
  { name: 'Utqiaġvik', state: 'Alaska', stateCode: 'AK', county: 'North Slope Borough', lat: 63.588753, lng: -154.4930619, pop: 4500, size: 'village' },
  { name: 'Drew', state: 'Mississippi', stateCode: 'MS', county: 'Drew County', lat: 33.809558, lng: -90.5264813, pop: 2000, size: 'village' },
  { name: 'Oceana', state: 'West Virginia', stateCode: 'WV', county: 'Wyoming County', lat: 37.6920553, lng: -81.6239985, pop: 1200, size: 'village' },
];

/**
 * Get confidence level based on city size
 */
function getConfidence(size) {
  if (size === 'major' || size === 'medium') return 'high';
  if (size === 'small') return 'medium';
  return 'low';
}

/**
 * Add a city to the TypeScript file
 */
async function addCityToFile(city) {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  // Find the state
  const statePattern = new RegExp(
    `(name:\\s*['"]${city.state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
    `[\\s\\S]*?code:\\s*['"]${city.stateCode}['"]` +
    `[\\s\\S]*?counties:\\s*\\[` +
    `[\\s\\S]*?)`,
    'm'
  );
  
  const stateMatch = content.match(statePattern);
  if (!stateMatch) {
    console.log(`⚠️  State ${city.state} not found for ${city.name}`);
    return false;
  }
  
  // Check if county exists
  const countyPattern = new RegExp(
    `(name:\\s*['"]${city.county.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
    `[\\s\\S]*?cities:\\s*\\[)` +
    `([\\s\\S]*?)(\\s*\\],)`,
    'm'
  );
  
  // Try to find county within the state section
  const stateSection = stateMatch[0];
  const countyMatch = stateSection.match(countyPattern);
  
  if (countyMatch) {
    // County exists, add city to it
    const newCity = `\n          { name: '${city.name}', state: '${city.state}', stateCode: '${city.stateCode}', county: '${city.county}', latitude: ${city.lat}, longitude: ${city.lng}, population: ${city.pop}, size: '${city.size}', confidence: '${getConfidence(city.size)}' },`;
    
    // Replace the county section with city added
    const updatedCounty = countyMatch[1] + countyMatch[2] + newCity + '\n        ' + countyMatch[3];
    
    // Replace in full content
    content = content.replace(stateSection, stateSection.replace(countyPattern, updatedCounty));
    
    await fs.writeFile(filePath, content);
    console.log(`✅ Added ${city.name} to ${city.state} > ${city.county}`);
    return true;
  } else {
    // County doesn't exist, need to create it
    // Find where to insert new county (after last county in state)
    const lastCountyPattern = new RegExp(
      `(counties:\\s*\\[[\\s\\S]*?)(name:\\s*['"][^'"]+['"][\\s\\S]*?cities:\\s*\\[[\\s\\S]*?\\][\\s\\S]*?\\},)` +
      `(\\s*\\],)`,
      'm'
    );
    
    const lastCountyMatch = stateSection.match(lastCountyPattern);
    if (lastCountyMatch) {
      // Insert new county after last one
      const newCounty = `,\n      {\n        name: '${city.county}',\n        cities: [\n          { name: '${city.name}', state: '${city.state}', stateCode: '${city.stateCode}', county: '${city.county}', latitude: ${city.lat}, longitude: ${city.lng}, population: ${city.pop}, size: '${city.size}', confidence: '${getConfidence(city.size)}' },\n        ],\n      }`;
      
      const updatedState = stateSection.replace(lastCountyPattern, `$1$2${newCounty}\n      $3`);
      content = content.replace(stateSection, updatedState);
      
      await fs.writeFile(filePath, content);
      console.log(`✅ Added ${city.name} with new county ${city.county} to ${city.state}`);
      return true;
    } else {
      console.log(`⚠️  Could not find insertion point for ${city.name} in ${city.state}`);
      return false;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Adding 15 missing cities to TypeScript file...');
  console.log('='.repeat(70));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const city of MISSING_CITIES) {
    try {
      const success = await addCityToFile(city);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      console.error(`❌ Error adding ${city.name}:`, error.message);
      failCount++;
    }
  }
  
  console.log('\n✅ Addition Complete!');
  console.log('\n📊 Summary:');
  console.log(`   Successfully added: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total processed: ${MISSING_CITIES.length}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MISSING_CITIES, addCityToFile };
