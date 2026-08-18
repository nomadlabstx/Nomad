#!/usr/bin/env node

/**
 * Geocode and Add Filtered Missing Cities
 * Uses the filtered list from bulk-add-missing-cities-safe.js
 * Integrates with existing geocoding infrastructure
 */

const fs = require('fs').promises;
const path = require('path');

// Load environment variables (try dotenv if available)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv not available, try direct env file reading
}

// Use Node's built-in https module
const https = require('https');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const DELAY_MS = 100; // 10 requests per second
const BATCH_SIZE = 50; // Process in batches

/**
 * Geocode a single city using Google Geocoding API
 */
async function geocodeCity(city) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Maps API key not found. Set GOOGLE_MAPS_SERVER_KEY in .env.local');
  }
  
  const query = `${city.name}, ${city.state || city.stateCode}`;
  const url = `/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'maps.googleapis.com',
      path: url,
      method: 'GET'
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          if (jsonData.status === 'OK' && jsonData.results.length > 0) {
            const result = jsonData.results[0];
            const location = result.geometry.location;
            
            // Extract county from address components
            let county = null;
            for (const component of result.address_components) {
              if (component.types.includes('administrative_area_level_2')) {
                county = component.long_name;
                if (!county.toLowerCase().includes('county') && !county.toLowerCase().includes('borough') && !county.toLowerCase().includes('parish')) {
                  county = `${county} County`;
                }
                break;
              }
            }
            
            // Estimate population based on city name/size
            const population = estimatePopulation(city.name);
            const size = getSizeFromPopulation(population);
            
            resolve({
              name: city.name,
              state: city.state || '',
              stateCode: city.stateCode || '',
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: population,
              size: size,
              confidence: 'medium'
            });
          } else {
            console.warn(`⚠️  Geocoding failed for ${city.name}, ${city.stateCode}: ${jsonData.status}`);
            resolve(null);
          }
        } catch (error) {
          console.error(`❌ Error parsing geocoding response for ${city.name}:`, error.message);
          resolve(null);
        }
      });
    });
    
    request.on('error', (error) => {
      console.error(`❌ Error geocoding ${city.name}:`, error.message);
      resolve(null);
    });
    
    request.end();
  });
}

/**
 * Estimate population (very rough estimate)
 */
function estimatePopulation(cityName) {
  // Major metros
  const majorCities = {
    'new york': 8000000, 'los angeles': 4000000, 'chicago': 2700000,
    'houston': 2300000, 'phoenix': 1600000, 'philadelphia': 1500000,
    'san antonio': 1500000, 'san diego': 1400000, 'dallas': 1300000
  };
  
  const nameLower = cityName.toLowerCase();
  for (const [key, pop] of Object.entries(majorCities)) {
    if (nameLower.includes(key)) {
      return pop;
    }
  }
  
  // Default estimate based on city size perception
  return 50000;
}

/**
 * Get size category from population
 */
function getSizeFromPopulation(pop) {
  if (pop > 1000000) return 'major';
  if (pop > 250000) return 'medium';
  if (pop > 50000) return 'small';
  return 'village';
}

/**
 * Load filtered cities
 */
async function loadFilteredCities(priorityOnly = false) {
  const filteredPath = path.join(__dirname, '..', 'data', 'filtered-missing-cities.json');
  
  try {
    const content = await fs.readFile(filteredPath, 'utf8');
    const data = JSON.parse(content);
    
    if (priorityOnly) {
      return data.priorityCities || [];
    }
    return data.allMissing || [];
  } catch (error) {
    console.error('❌ Error loading filtered cities:', error.message);
    return [];
  }
}

/**
 * Add geocoded city to TypeScript file
 */
async function addCityToFile(geocodedCity) {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  // Find the state section
  const statePattern = new RegExp(
    `(name:\\s*['"][^'"]*['"]` +
    `[\\s\\S]*?code:\\s*['"]${geocodedCity.stateCode}['"]` +
    `[\\s\\S]*?counties:\\s*\\[` +
    `[\\s\\S]*?)`,
    'm'
  );
  
  const stateMatch = content.match(statePattern);
  if (!stateMatch) {
    console.warn(`⚠️  State ${geocodedCity.stateCode} not found for ${geocodedCity.name}`);
    return false;
  }
  
  // Find or create county
  const countyName = geocodedCity.county;
  const countyPattern = new RegExp(
    `(name:\\s*['"]${countyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
    `[\\s\\S]*?cities:\\s*\\[)` +
    `([\\s\\S]*?)(\\s*\\],)`,
    'm'
  );
  
  const stateSection = stateMatch[0];
  const countyMatch = stateSection.match(countyPattern);
  
  if (countyMatch) {
    // County exists, add city
    const newCity = `\n          { name: '${geocodedCity.name}', state: '${geocodedCity.state}', stateCode: '${geocodedCity.stateCode}', county: '${geocodedCity.county}', latitude: ${geocodedCity.latitude}, longitude: ${geocodedCity.longitude}, population: ${geocodedCity.population}, size: '${geocodedCity.size}', confidence: '${geocodedCity.confidence}' },`;
    
    const updatedCounty = countyMatch[1] + countyMatch[2] + newCity + '\n        ' + countyMatch[3];
    content = content.replace(stateSection, stateSection.replace(countyPattern, updatedCounty));
  } else {
    // Create new county
    const lastCountyPattern = /(counties:\s*\[[\s\S]*?)(name:\s*['"][^'"]+['"][\s\S]*?cities:\s*\[[\s\S]*?\][\s\S]*?\},)(\s*\],)/m;
    const lastCountyMatch = stateSection.match(lastCountyPattern);
    
    if (lastCountyMatch) {
      const newCounty = `,\n      {\n        name: '${countyName}',\n        cities: [\n          { name: '${geocodedCity.name}', state: '${geocodedCity.state}', stateCode: '${geocodedCity.stateCode}', county: '${geocodedCity.county}', latitude: ${geocodedCity.latitude}, longitude: ${geocodedCity.longitude}, population: ${geocodedCity.population}, size: '${geocodedCity.size}', confidence: '${geocodedCity.confidence}' },\n        ],\n      }`;
      
      const updatedState = stateSection.replace(lastCountyPattern, `$1$2${newCounty}\n      $3`);
      content = content.replace(stateSection, updatedState);
    } else {
      console.warn(`⚠️  Could not add ${geocodedCity.name} - insertion point not found`);
      return false;
    }
  }
  
  await fs.writeFile(filePath, content);
  return true;
}

/**
 * Process cities in batches
 */
async function processCities(cities, batchNumber = 1) {
  const successCount = { geocoded: 0, added: 0, failed: 0 };
  
  console.log(`\n📦 Processing batch ${batchNumber} (${cities.length} cities)...`);
  
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    console.log(`\n[${i + 1}/${cities.length}] Geocoding ${city.name}, ${city.stateCode}...`);
    
    try {
      // Geocode
      const geocoded = await geocodeCity(city);
      
      if (geocoded) {
        successCount.geocoded++;
        console.log(`   ✅ Geocoded: ${geocoded.county}`);
        
        // Add to file
        const added = await addCityToFile(geocoded);
        if (added) {
          successCount.added++;
          console.log(`   ✅ Added to database`);
        } else {
          successCount.failed++;
          console.log(`   ⚠️  Failed to add to database`);
        }
      } else {
        successCount.failed++;
      }
      
      // Rate limiting
      if (i < cities.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      successCount.failed++;
    }
  }
  
  return successCount;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const priorityOnly = args.includes('--priority');
  const processAll = args.includes('--all');
  
  console.log('🗺️  Geocoding and Adding Missing Cities');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    console.error('   Set GOOGLE_MAPS_SERVER_KEY in .env.local');
    process.exit(1);
  }
  
  try {
    // Load filtered cities
    console.log('\n📊 Loading filtered cities...');
    const cities = await loadFilteredCities(priorityOnly);
    
    if (cities.length === 0) {
      console.log('\n⚠️  No cities to process. Run bulk-add-missing-cities-safe.js first.');
      return;
    }
    
    console.log(`   Found ${cities.length} cities to process`);
    
    if (priorityOnly) {
      console.log('   🎯 Processing PRIORITY cities only (major metros)');
    } else {
      console.log('   📋 Processing ALL missing cities');
    }
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < cities.length; i += BATCH_SIZE) {
      batches.push(cities.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`\n   Will process in ${batches.length} batches of ${BATCH_SIZE}`);
    
    let totalStats = { geocoded: 0, added: 0, failed: 0 };
    
    for (let i = 0; i < batches.length; i++) {
      const batchStats = await processCities(batches[i], i + 1);
      totalStats.geocoded += batchStats.geocoded;
      totalStats.added += batchStats.added;
      totalStats.failed += batchStats.failed;
      
      // Progress update
      console.log(`\n📊 Batch ${i + 1} complete:`);
      console.log(`   Geocoded: ${batchStats.geocoded}`);
      console.log(`   Added: ${batchStats.added}`);
      console.log(`   Failed: ${batchStats.failed}`);
      
      // Pause between batches
      if (i < batches.length - 1) {
        console.log(`\n⏸️  Pausing 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final summary
    console.log('\n✅ Processing Complete!');
    console.log('='.repeat(70));
    console.log('\n📊 Final Statistics:');
    console.log(`   Total processed: ${cities.length}`);
    console.log(`   Successfully geocoded: ${totalStats.geocoded}`);
    console.log(`   Successfully added: ${totalStats.added}`);
    console.log(`   Failed: ${totalStats.failed}`);
    console.log(`   Success rate: ${((totalStats.added / cities.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { geocodeCity, addCityToFile, processCities };
