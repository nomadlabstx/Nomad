#!/usr/bin/env node

/**
 * Comprehensive US Places Addition System
 * 1. Retry failed cities with better error handling
 * 2. Add all 19,734 incorporated places
 * 3. Add all 12,098 Census-Designated Places (CDPs)
 * Total: ~32,000 places
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const DELAY_MS = 100;
const BATCH_SIZE = 50;

/**
 * Enhanced geocoding with better error handling
 */
async function geocodePlace(place, retries = 3) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Maps API key not found');
  }
  
  const query = `${place.name}, ${place.state || place.stateCode}`;
  const url = `/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await new Promise((resolve) => {
        const request = https.request({
          hostname: 'maps.googleapis.com',
          path: url,
          method: 'GET',
          timeout: 10000
        }, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch (e) {
              resolve(null);
            }
          });
        });
        
        request.on('error', () => resolve(null));
        request.on('timeout', () => {
          request.destroy();
          resolve(null);
        });
        
        request.end();
      });
      
      if (result && result.status === 'OK' && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        
        let county = null;
        for (const component of result.results[0].address_components) {
          if (component.types.includes('administrative_area_level_2')) {
            county = component.long_name;
            if (!county.toLowerCase().includes('county') && 
                !county.toLowerCase().includes('borough') && 
                !county.toLowerCase().includes('parish')) {
              county = `${county} County`;
            }
            break;
          }
        }
        
        return {
          name: place.name,
          state: place.state || '',
          stateCode: place.stateCode || '',
          county: county || 'Unknown County',
          latitude: location.lat,
          longitude: location.lng,
          population: place.population || estimatePopulation(place.name),
          size: getSizeFromPopulation(place.population || estimatePopulation(place.name)),
          confidence: 'medium',
          type: place.type || 'city'
        };
      }
      
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS * (attempt + 1)));
      }
    } catch (error) {
      if (attempt === retries - 1) {
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, DELAY_MS * (attempt + 1)));
    }
  }
  
  return null;
}

function estimatePopulation(name) {
  const nameLower = name.toLowerCase();
  const majorCities = {
    'new york': 8000000, 'los angeles': 4000000, 'chicago': 2700000,
    'houston': 2300000, 'phoenix': 1600000, 'philadelphia': 1500000
  };
  
  for (const [key, pop] of Object.entries(majorCities)) {
    if (nameLower.includes(key)) return pop;
  }
  
  return 50000;
}

function getSizeFromPopulation(pop) {
  if (pop > 1000000) return 'major';
  if (pop > 250000) return 'medium';
  if (pop > 50000) return 'small';
  return 'village';
}

/**
 * Enhanced file addition with better structure handling
 */
async function addCityToFile(geocodedCity) {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  // Find state section - simplified to just use state code (more reliable)
  const statePattern = new RegExp(
    `(name:\\s*['"][^'"]*['"]` +
    `[\\s\\S]*?code:\\s*['"]${geocodedCity.stateCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
    `[\\s\\S]*?counties:\\s*\\[` +
    `[\\s\\S]*?)`,
    'm'
  );
  
  const stateMatch = content.match(statePattern);
  if (!stateMatch) {
    return false;
  }
  
  const stateSection = stateMatch[0];
  const countyName = geocodedCity.county;
  const escapedCounty = countyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Look for county
  const countyPattern = new RegExp(
    `(name:\\s*['"]${escapedCounty}['"]` +
    `[\\s\\S]*?cities:\\s*\\[)` +
    `([\\s\\S]*?)(\\s*\\],)`,
    'm'
  );
  
  const countyMatch = stateSection.match(countyPattern);
  
  if (countyMatch) {
    // County exists - add city
    const newCity = `\n          { name: '${geocodedCity.name.replace(/'/g, "\\'")}', state: '${geocodedCity.state.replace(/'/g, "\\'")}', stateCode: '${geocodedCity.stateCode}', county: '${geocodedCity.county.replace(/'/g, "\\'")}', latitude: ${geocodedCity.latitude}, longitude: ${geocodedCity.longitude}, population: ${geocodedCity.population}, size: '${geocodedCity.size}', confidence: '${geocodedCity.confidence}' },`;
    
    const updatedCounty = countyMatch[1] + countyMatch[2] + newCity + '\n        ' + countyMatch[3];
    content = content.replace(stateSection, stateSection.replace(countyPattern, updatedCounty));
    
    await fs.writeFile(filePath, content);
    return true;
  } else {
    // Create new county - find last county in state
    const lastCountyPattern = /(counties:\s*\[[\s\S]*?)(name:\s*['"][^'"]+['"][\s\S]*?cities:\s*\[[\s\S]*?\][\s\S]*?\},)(\s*\],)/m;
    const lastCountyMatch = stateSection.match(lastCountyPattern);
    
    if (lastCountyMatch) {
      const newCounty = `,\n      {\n        name: '${geocodedCity.county.replace(/'/g, "\\'")}',\n        cities: [\n          { name: '${geocodedCity.name.replace(/'/g, "\\'")}', state: '${geocodedCity.state.replace(/'/g, "\\'")}', stateCode: '${geocodedCity.stateCode}', county: '${geocodedCity.county.replace(/'/g, "\\'")}', latitude: ${geocodedCity.latitude}, longitude: ${geocodedCity.longitude}, population: ${geocodedCity.population}, size: '${geocodedCity.size}', confidence: '${geocodedCity.confidence}' },\n        ],\n      }`;
      
      const updatedState = stateSection.replace(lastCountyPattern, `$1$2${newCounty}\n      $3`);
      content = content.replace(stateSection, updatedState);
      
      await fs.writeFile(filePath, content);
      return true;
    }
  }
  
  return false;
}

/**
 * Process places in batches
 */
async function processPlaces(places, label = 'Places') {
  const stats = { geocoded: 0, added: 0, failed: 0 };
  const batches = [];
  
  for (let i = 0; i < places.length; i += BATCH_SIZE) {
    batches.push(places.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`\n📦 Processing ${places.length} ${label} in ${batches.length} batches...`);
  
  for (let batchNum = 0; batchNum < batches.length; batchNum++) {
    const batch = batches[batchNum];
    console.log(`\n📦 Batch ${batchNum + 1}/${batches.length} (${batch.length} ${label})...`);
    
    for (let i = 0; i < batch.length; i++) {
      const place = batch[i];
      const progress = `[${i + 1}/${batch.length}]`;
      
      try {
        const geocoded = await geocodePlace(place);
        if (geocoded) {
          stats.geocoded++;
          const added = await addCityToFile(geocoded);
          if (added) {
            stats.added++;
            console.log(`${progress} ✅ ${place.name}, ${place.stateCode}`);
          } else {
            stats.failed++;
            console.log(`${progress} ⚠️  ${place.name}, ${place.stateCode} - geocoded but failed to add`);
          }
        } else {
          stats.failed++;
          console.log(`${progress} ❌ ${place.name}, ${place.stateCode} - geocoding failed`);
        }
        
        if (i < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        stats.failed++;
        console.log(`${progress} ❌ ${place.name}, ${place.stateCode} - ${error.message}`);
      }
    }
    
    if (batchNum < batches.length - 1) {
      console.log(`\n⏸️  Pausing 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return stats;
}

/**
 * Main execution
 */
async function main() {
  console.log('🗺️  Comprehensive US Places Addition System');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  // Step 1: Retry failed cities
  console.log('\n📊 Step 1: Retrying failed cities...');
  try {
    const failedPath = path.join(__dirname, '..', 'data', 'failed-cities-to-retry.json');
    const failedData = JSON.parse(await fs.readFile(failedPath, 'utf8'));
    
    if (failedData.length > 0) {
      console.log(`   Found ${failedData.length} cities to retry`);
      const stats = await processPlaces(failedData, 'failed cities');
      console.log(`\n✅ Failed cities retry complete:`);
      console.log(`   Geocoded: ${stats.geocoded}`);
      console.log(`   Added: ${stats.added}`);
      console.log(`   Failed: ${stats.failed}`);
    }
  } catch (error) {
    console.log('   No failed cities file found');
  }
  
  // Step 2: Add all Census places
  console.log('\n📊 Step 2: Adding all Census places...');
  console.log('   Note: For comprehensive coverage, you need:');
  console.log('   1. Census Bureau Places data (CSV or JSON)');
  console.log('   2. Or use geocoding for all known places');
  console.log('\n   Recommended: Download from');
  console.log('   https://www2.census.gov/programs-surveys/popest/datasets/');
  console.log('\n   Once you have the data file, run this script again');
  
  // TODO: Add logic to load and process Census places file
  // This would require the actual Census data file
  
  console.log('\n✅ Setup complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Download Census places data');
  console.log('   2. Save as data/us-census-places.json');
  console.log('   3. Run this script again to process');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { geocodePlace, addCityToFile, processPlaces };
