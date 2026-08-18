#!/usr/bin/env node

/**
 * Discover Missing Cities
 * Compares current city database against comprehensive reference lists
 * to identify cities that might be missing
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Extract all cities from the TypeScript file
 */
async function getCurrentCities() {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const content = await fs.readFile(filePath, 'utf8');
  
  const cities = [];
  
  // Extract city entries using regex
  const cityPattern = /name:\s*['"]([^'"]+)['"][^}]*state:\s*['"]([^'"]+)['"][^}]*stateCode:\s*['"]([^'"]+)['"][^}]*county:\s*['"]([^'"]*)['"]/g;
  
  let match;
  while ((match = cityPattern.exec(content)) !== null) {
    cities.push({
      name: match[1],
      state: match[2],
      stateCode: match[3],
      county: match[4]
    });
  }
  
  return cities;
}

/**
 * Get cities from the complete cities file if it exists
 */
async function getCompleteCities() {
  const completePath = path.join(__dirname, '..', 'data', 'us-cities-complete.ts');
  
  try {
    const content = await fs.readFile(completePath, 'utf8');
    const cities = [];
    
    // Extract from complete file
    const cityPattern = /name:\s*['"]([^'"]+)['"][^}]*state:\s*['"]([^'"]+)['"][^}]*stateCode:\s*['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = cityPattern.exec(content)) !== null) {
      cities.push({
        name: match[1],
        state: match[2],
        stateCode: match[3]
      });
    }
    
    return cities;
  } catch (error) {
    console.log('⚠️  Complete cities file not found, skipping comparison');
    return [];
  }
}

/**
 * Get cities from census data file if it exists
 */
async function getCensusCities() {
  const censusPath = path.join(__dirname, '..', 'data', 'us-cities-census.ts');
  
  try {
    const content = await fs.readFile(censusPath, 'utf8');
    const cities = [];
    
    // Extract from census file
    const cityPattern = /name:\s*['"]([^'"]+)['"][^}]*state:\s*['"]([^'"]+)['"][^}]*stateCode:\s*['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = cityPattern.exec(content)) !== null) {
      cities.push({
        name: match[1],
        state: match[2],
        stateCode: match[3]
      });
    }
    
    return cities;
  } catch (error) {
    console.log('⚠️  Census cities file not found, skipping comparison');
    return [];
  }
}

/**
 * Create a lookup map for quick searching
 */
function createCityMap(cities) {
  const map = new Map();
  
  for (const city of cities) {
    const key = `${city.name.toLowerCase()}|${city.stateCode}`;
    map.set(key, city);
  }
  
  return map;
}

/**
 * Find missing cities by comparing against reference lists
 */
async function findMissingCities() {
  console.log('🔍 Discovering missing cities...');
  console.log('='.repeat(70));
  
  // Get current cities
  console.log('\n📊 Loading current city database...');
  const currentCities = await getCurrentCities();
  const currentMap = createCityMap(currentCities);
  console.log(`   Found ${currentCities.length} cities in current database`);
  
  // Get reference lists
  console.log('\n📊 Loading reference city lists...');
  const completeCities = await getCompleteCities();
  const censusCities = await getCensusCities();
  
  const allReferenceCities = [...completeCities, ...censusCities];
  console.log(`   Found ${allReferenceCities.length} cities in reference lists`);
  
  if (allReferenceCities.length === 0) {
    console.log('\n⚠️  No reference lists available for comparison.');
    console.log('   Consider:');
    console.log('   1. Creating a comprehensive city list');
    console.log('   2. Using a public dataset (US Census, GeoNames, etc.)');
    console.log('   3. Comparing against major city lists');
    return [];
  }
  
  // Find cities in reference but not in current
  console.log('\n🔎 Comparing databases...');
  const missingCities = [];
  
  for (const refCity of allReferenceCities) {
    const key = `${refCity.name.toLowerCase()}|${refCity.stateCode}`;
    if (!currentMap.has(key)) {
      missingCities.push(refCity);
    }
  }
  
  // Remove duplicates
  const uniqueMissing = [];
  const seen = new Set();
  for (const city of missingCities) {
    const key = `${city.name.toLowerCase()}|${city.stateCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMissing.push(city);
    }
  }
  
  return uniqueMissing;
}

/**
 * Get cities by population threshold (major cities that should definitely be included)
 */
function getMajorCitiesToCheck() {
  // List of major US cities that should be in the database
  return [
    // Major metros
    { name: 'New York', state: 'New York', stateCode: 'NY' },
    { name: 'Los Angeles', state: 'California', stateCode: 'CA' },
    { name: 'Chicago', state: 'Illinois', stateCode: 'IL' },
    { name: 'Houston', state: 'Texas', stateCode: 'TX' },
    { name: 'Phoenix', state: 'Arizona', stateCode: 'AZ' },
    { name: 'Philadelphia', state: 'Pennsylvania', stateCode: 'PA' },
    { name: 'San Antonio', state: 'Texas', stateCode: 'TX' },
    { name: 'San Diego', state: 'California', stateCode: 'CA' },
    { name: 'Dallas', state: 'Texas', stateCode: 'TX' },
    { name: 'San Jose', state: 'California', stateCode: 'CA' },
    
    // State capitals
    { name: 'Austin', state: 'Texas', stateCode: 'TX' },
    { name: 'Jacksonville', state: 'Florida', stateCode: 'FL' },
    { name: 'Indianapolis', state: 'Indiana', stateCode: 'IN' },
    { name: 'Columbus', state: 'Ohio', stateCode: 'OH' },
    { name: 'Charlotte', state: 'North Carolina', stateCode: 'NC' },
    { name: 'Seattle', state: 'Washington', stateCode: 'WA' },
    { name: 'Denver', state: 'Colorado', stateCode: 'CO' },
    { name: 'Boston', state: 'Massachusetts', stateCode: 'MA' },
    { name: 'Nashville', state: 'Tennessee', stateCode: 'TN' },
    { name: 'Portland', state: 'Oregon', stateCode: 'OR' },
    
    // Other important cities
    { name: 'Detroit', state: 'Michigan', stateCode: 'MI' },
    { name: 'Memphis', state: 'Tennessee', stateCode: 'TN' },
    { name: 'Oklahoma City', state: 'Oklahoma', stateCode: 'OK' },
    { name: 'Las Vegas', state: 'Nevada', stateCode: 'NV' },
    { name: 'Louisville', state: 'Kentucky', stateCode: 'KY' },
    { name: 'Milwaukee', state: 'Wisconsin', stateCode: 'WI' },
    { name: 'Albuquerque', state: 'New Mexico', stateCode: 'NM' },
    { name: 'Tucson', state: 'Arizona', stateCode: 'AZ' },
    { name: 'Fresno', state: 'California', stateCode: 'CA' },
    { name: 'Sacramento', state: 'California', stateCode: 'CA' },
    { name: 'Kansas City', state: 'Missouri', stateCode: 'MO' },
    { name: 'Atlanta', state: 'Georgia', stateCode: 'GA' },
    { name: 'Miami', state: 'Florida', stateCode: 'FL' },
    { name: 'Oakland', state: 'California', stateCode: 'CA' },
    { name: 'Minneapolis', state: 'Minnesota', stateCode: 'MN' },
    { name: 'Tulsa', state: 'Oklahoma', stateCode: 'OK' },
    { name: 'Cleveland', state: 'Ohio', stateCode: 'OH' },
    { name: 'Wichita', state: 'Kansas', stateCode: 'KS' },
    { name: 'Arlington', state: 'Texas', stateCode: 'TX' },
    { name: 'Tampa', state: 'Florida', stateCode: 'FL' },
  ];
}

/**
 * Check if major cities exist
 */
async function checkMajorCities() {
  const currentCities = await getCurrentCities();
  const currentMap = createCityMap(currentCities);
  const majorCities = getMajorCitiesToCheck();
  
  const missingMajor = [];
  for (const city of majorCities) {
    const key = `${city.name.toLowerCase()}|${city.stateCode}`;
    if (!currentMap.has(key)) {
      missingMajor.push(city);
    }
  }
  
  return missingMajor;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Find missing cities from reference lists
    const missingFromRef = await findMissingCities();
    
    // Check major cities
    console.log('\n📊 Checking major cities...');
    const missingMajor = await checkMajorCities();
    
    // Combine results
    const allMissing = [...missingFromRef, ...missingMajor];
    
    // Remove duplicates
    const uniqueMissing = [];
    const seen = new Set();
    for (const city of allMissing) {
      const key = `${city.name.toLowerCase()}|${city.stateCode}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMissing.push(city);
      }
    }
    
    // Group by state
    const byState = {};
    for (const city of uniqueMissing) {
      if (!byState[city.stateCode]) {
        byState[city.stateCode] = [];
      }
      byState[city.stateCode].push(city);
    }
    
    // Display results
    console.log('\n📊 DISCOVERY RESULTS:');
    console.log('='.repeat(70));
    console.log(`\n   Total missing cities found: ${uniqueMissing.length}`);
    console.log(`   Missing major cities: ${missingMajor.length}`);
    console.log(`   Missing from reference: ${missingFromRef.length}`);
    
    if (uniqueMissing.length > 0) {
      console.log('\n📝 Missing Cities by State:');
      for (const [stateCode, cities] of Object.entries(byState)) {
        console.log(`\n   ${stateCode} (${cities.length} cities):`);
        for (const city of cities.slice(0, 10)) { // Show first 10
          console.log(`     - ${city.name}`);
        }
        if (cities.length > 10) {
          console.log(`     ... and ${cities.length - 10} more`);
        }
      }
      
      // Save to file
      const outputPath = path.join(__dirname, '..', 'data', 'discovered-missing-cities.json');
      await fs.writeFile(
        outputPath,
        JSON.stringify({
          total: uniqueMissing.length,
          missingMajorCities: missingMajor.length,
          missingFromReference: missingFromRef.length,
          cities: uniqueMissing,
          byState
        }, null, 2)
      );
      
      console.log(`\n📄 Results saved to: ${outputPath}`);
      console.log('\n💡 Next Steps:');
      console.log('   1. Review the discovered missing cities');
      console.log('   2. Use geocoding script to get county data');
      console.log('   3. Add to main cities file using add-missing-cities.js');
    } else {
      console.log('\n✅ No missing cities discovered! Database looks complete.');
    }
    
  } catch (error) {
    console.error('❌ Error discovering missing cities:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { findMissingCities, checkMajorCities, getCurrentCities };
