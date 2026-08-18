#!/usr/bin/env node

/**
 * Process US Census Places CSV
 * Handles CSV files from US Census Bureau for all incorporated places and CDPs
 * 
 * Required files:
 * - Places CSV from Census Bureau (https://www2.census.gov/programs-surveys/popest/datasets/)
 * 
 * Usage:
 *   node scripts/process-census-places-csv.js <path-to-census-places.csv>
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
 * Parse CSV line (simple CSV parser)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Load and parse Census CSV file
 */
async function loadCensusCSV(filePath) {
  console.log(`📊 Loading Census CSV: ${filePath}`);
  
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const places = [];
  
  // Parse header
  const header = parseCSVLine(lines[0]);
  const nameIndex = header.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('place'));
  const stateIndex = header.findIndex(h => h.toLowerCase().includes('state') && !h.toLowerCase().includes('fips'));
  const stateCodeIndex = header.findIndex(h => (h.toLowerCase().includes('st') && h.length <= 3) || h.toLowerCase().includes('state code'));
  const popIndex = header.findIndex(h => h.toLowerCase().includes('population') || h.toLowerCase().includes('pop'));
  const typeIndex = header.findIndex(h => h.toLowerCase().includes('type') || h.toLowerCase().includes('designation'));
  
  console.log(`   Header: ${header.join(', ')}`);
  console.log(`   Found columns: name=${nameIndex}, state=${stateIndex}, stateCode=${stateCodeIndex}, pop=${popIndex}`);
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = parseCSVLine(line);
    if (row.length < Math.max(nameIndex, stateIndex, stateCodeIndex) + 1) continue;
    
    const place = {
      name: row[nameIndex] || '',
      state: row[stateIndex] || '',
      stateCode: row[stateCodeIndex] || '',
      population: popIndex >= 0 ? parseInt(row[popIndex]) || 0 : 0,
      type: typeIndex >= 0 ? row[typeIndex] : 'city'
    };
    
    if (place.name && place.stateCode) {
      places.push(place);
    }
  }
  
  console.log(`   Parsed ${places.length} places from CSV`);
  return places;
}

/**
 * Get existing cities to check duplicates
 */
async function getExistingCities() {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const content = await fs.readFile(filePath, 'utf8');
  
  const cities = new Set();
  const cityPattern = /name:\s*['"]([^'"]+)['"][^}]*stateCode:\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = cityPattern.exec(content)) !== null) {
    const key = `${match[1].toLowerCase().trim()}|${match[2].toUpperCase()}`;
    cities.add(key);
  }
  
  return cities;
}

/**
 * Geocode place (same as before)
 */
async function geocodePlace(place) {
  const query = `${place.name}, ${place.state || place.stateCode}`;
  const url = `/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve) => {
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
          if (jsonData.status === 'OK' && jsonData.results.length > 0) {
            const result = jsonData.results[0];
            const location = result.geometry.location;
            
            let county = null;
            for (const component of result.address_components) {
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
            
            resolve({
              name: place.name,
              state: place.state || '',
              stateCode: place.stateCode || '',
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: place.population || 50000,
              size: getSizeFromPopulation(place.population || 50000),
              confidence: 'medium'
            });
          } else {
            resolve(null);
          }
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
}

function getSizeFromPopulation(pop) {
  if (pop > 1000000) return 'major';
  if (pop > 250000) return 'medium';
  if (pop > 50000) return 'small';
  return 'village';
}

/**
 * Add city to file (use existing function from retry script)
 */
async function addCityToFile(geocodedCity) {
  // Import the function from retry script or duplicate logic
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  const statePattern = new RegExp(
    `(name:\\s*['"][^'"]*['"]` +
    `[\\s\\S]*?code:\\s*['"]${geocodedCity.stateCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
    `[\\s\\S]*?counties:\\s*\\[` +
    `[\\s\\S]*?)`,
    'm'
  );
  
  const stateMatch = content.match(statePattern);
  if (!stateMatch) return false;
  
  const stateSection = stateMatch[0];
  const escapedCounty = geocodedCity.county.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const countyPattern = new RegExp(
    `(name:\\s*['"]${escapedCounty}['"][\\s\\S]*?cities:\\s*\\[)` +
    `([\\s\\S]*?)(\\s*\\],)`,
    'm'
  );
  
  const countyMatch = stateSection.match(countyPattern);
  
  if (countyMatch) {
    const newCity = `\n          { name: '${geocodedCity.name.replace(/'/g, "\\'")}', state: '${geocodedCity.state.replace(/'/g, "\\'")}', stateCode: '${geocodedCity.stateCode}', county: '${geocodedCity.county.replace(/'/g, "\\'")}', latitude: ${geocodedCity.latitude}, longitude: ${geocodedCity.longitude}, population: ${geocodedCity.population}, size: '${geocodedCity.size}', confidence: '${geocodedCity.confidence}' },`;
    const updatedCounty = countyMatch[1] + countyMatch[2] + newCity + '\n        ' + countyMatch[3];
    content = content.replace(stateSection, stateSection.replace(countyPattern, updatedCounty));
    await fs.writeFile(filePath, content);
    return true;
  } else {
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
 * Main execution
 */
async function main() {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.log('📋 US Census Places CSV Processor');
    console.log('='.repeat(70));
    console.log('\nUsage: node scripts/process-census-places-csv.js <path-to-census-places.csv>');
    console.log('\n📥 To get Census data:');
    console.log('   1. Go to: https://www2.census.gov/programs-surveys/popest/datasets/');
    console.log('   2. Download "Places" CSV file');
    console.log('   3. Run: node scripts/process-census-places-csv.js <path-to-file>');
    console.log('\n📊 Expected data:');
    console.log('   - 19,734 incorporated places');
    console.log('   - 12,098 Census-Designated Places (CDPs)');
    console.log('   - Total: ~32,000 places');
    return;
  }
  
  console.log('🗺️  Processing Census Places CSV');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  try {
    // Load CSV
    const places = await loadCensusCSV(csvPath);
    
    // Check duplicates
    console.log('\n📊 Checking for duplicates...');
    const existingCities = await getExistingCities();
    const newPlaces = [];
    
    for (const place of places) {
      const key = `${place.name.toLowerCase().trim()}|${place.stateCode.toUpperCase()}`;
      if (!existingCities.has(key)) {
        newPlaces.push(place);
      }
    }
    
    console.log(`   Total places in CSV: ${places.length}`);
    console.log(`   Already in database: ${places.length - newPlaces.length}`);
    console.log(`   New places to add: ${newPlaces.length}`);
    
    if (newPlaces.length === 0) {
      console.log('\n✅ All places already in database!');
      return;
    }
    
    // Process in batches
    const stats = { geocoded: 0, added: 0, failed: 0 };
    const batches = [];
    
    for (let i = 0; i < newPlaces.length; i += BATCH_SIZE) {
      batches.push(newPlaces.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`\n📦 Processing ${newPlaces.length} places in ${batches.length} batches...`);
    console.log(`   Estimated time: ${Math.ceil((newPlaces.length * DELAY_MS) / 1000 / 60)} minutes`);
    console.log(`   Estimated cost: $${((newPlaces.length * 0.005).toFixed(2))}`);
    
    for (let batchNum = 0; batchNum < batches.length; batchNum++) {
      const batch = batches[batchNum];
      console.log(`\n📦 Batch ${batchNum + 1}/${batches.length}...`);
      
      for (let i = 0; i < batch.length; i++) {
        const place = batch[i];
        
        try {
          const geocoded = await geocodePlace(place);
          if (geocoded) {
            stats.geocoded++;
            const added = await addCityToFile(geocoded);
            if (added) {
              stats.added++;
              if (i % 10 === 0) {
                console.log(`   [${i + 1}/${batch.length}] ✅ Added ${place.name}, ${place.stateCode}`);
              }
            } else {
              stats.failed++;
            }
          } else {
            stats.failed++;
          }
          
          if (i < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        } catch (error) {
          stats.failed++;
        }
      }
      
      if (batchNum < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n✅ Processing Complete!');
    console.log('='.repeat(70));
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total processed: ${newPlaces.length}`);
    console.log(`   Successfully geocoded: ${stats.geocoded}`);
    console.log(`   Successfully added: ${stats.added}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Success rate: ${((stats.added / newPlaces.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { loadCensusCSV, parseCSVLine };
