/**
 * Geocode ALL US Cities to Get County Information
 * Uses Google Geocoding API to fetch county for every city in the database
 * Saves progress to allow resuming if interrupted
 * 
 * Expected cost: $97.38 (19,476 cities × $0.005)
 * Expected time: ~32 minutes (10 requests/second with 100ms delay)
 */

/* eslint-env node */
/* global __dirname */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!GOOGLE_API_KEY) {
  throw new Error('Set GOOGLE_MAPS_SERVER_KEY or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY before running this script.');
}
const PROGRESS_FILE = path.join(__dirname, '../data/us-county-progress.json');
const OUTPUT_FILE = path.join(__dirname, '../data/us-cities-with-counties.ts');
const DELAY_MS = 100; // 10 requests per second to stay under limits
const SAVE_INTERVAL = 25; // Save progress every 25 cities

/**
 * Make a geocoding API request
 */
function geocodeCity(cityName, state, stateCode, latitude, longitude, population, size, confidence) {
  return new Promise((resolve, reject) => {
    // Use reverse geocoding with lat/lng for best accuracy
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'OK' && parsed.results.length > 0) {
            const result = parsed.results[0];
            
            // Extract county (administrative_area_level_2)
            const countyComponent = result.address_components.find(
              comp => comp.types.includes('administrative_area_level_2')
            );
            const county = countyComponent ? countyComponent.long_name : null;
            
            resolve({ 
              name: cityName, 
              state, 
              stateCode,
              county, 
              latitude, 
              longitude,
              population,
              size,
              confidence
            });
          } else {
            console.error(`⚠️  Geocoding failed for ${cityName}, ${state}: ${parsed.status}`);
            resolve({ 
              name: cityName, 
              state, 
              stateCode,
              county: null, 
              latitude, 
              longitude,
              population,
              size,
              confidence,
              error: parsed.status 
            });
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Load progress from file
 */
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading progress:', err);
  }
  return { processed: [], lastIndex: -1, apiCalls: 0, startTime: Date.now() };
}

/**
 * Save progress to file
 */
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (err) {
    console.error('Error saving progress:', err);
  }
}

/**
 * Load all US cities from census data
 */
function loadAllUSCities() {
  try {
    const censusPath = path.join(__dirname, '../data/us-cities-census.ts');
    const content = fs.readFileSync(censusPath, 'utf8');
    
    // Parse the TypeScript data
    const cities = [];
    const regex = /{\s*name:\s*'([^']+)',\s*state:\s*'([^']+)',\s*stateCode:\s*'([^']+)',\s*population:\s*(\d+),\s*coordinates:\s*{\s*latitude:\s*([-\d.]+),\s*longitude:\s*([-\d.]+)\s*},\s*size:\s*'([^']+)',\s*confidence:\s*'([^']+)'\s*}/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      cities.push({
        name: match[1],
        state: match[2],
        stateCode: match[3],
        population: parseInt(match[4]),
        latitude: parseFloat(match[5]),
        longitude: parseFloat(match[6]),
        size: match[7],
        confidence: match[8]
      });
    }
    
    return cities;
  } catch (err) {
    console.error('Error loading US cities:', err);
    return [];
  }
}

/**
 * Format time duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🗺️  US Cities County Geocoding Script');
  console.log('=====================================\n');
  
  // Load all US cities
  console.log('📖 Loading US cities from census data...');
  const allCities = loadAllUSCities();
  console.log(`✅ Found ${allCities.length.toLocaleString()} US cities\n`);
  
  if (allCities.length === 0) {
    console.error('❌ No cities found. Check data file.');
    return;
  }
  
  // Load progress
  const progress = loadProgress();
  const isResuming = progress.processed.length > 0;
  
  console.log(`📊 Progress Status:`);
  console.log(`   ✅ Completed: ${progress.processed.length.toLocaleString()}/${allCities.length.toLocaleString()} cities`);
  console.log(`   📡 API calls made: ${progress.apiCalls.toLocaleString()}`);
  if (isResuming) {
    const elapsed = Date.now() - progress.startTime;
    console.log(`   ⏱️  Time elapsed: ${formatDuration(elapsed)}`);
  }
  console.log();
  
  // Cost calculation
  const remainingCities = allCities.length - progress.processed.length;
  const estimatedCost = (remainingCities * 0.005).toFixed(2);
  const totalCost = (allCities.length * 0.005).toFixed(2);
  
  console.log(`💰 Cost Analysis:`);
  console.log(`   Total budget: $300.00`);
  console.log(`   Total cost (all cities): $${totalCost}`);
  console.log(`   Remaining cost: $${estimatedCost}`);
  console.log(`   Percentage of budget: ${((estimatedCost / 300) * 100).toFixed(1)}%`);
  console.log();
  
  // Time estimate
  const estimatedTimeMs = remainingCities * (DELAY_MS + 50); // 50ms for API response
  console.log(`⏱️  Time Estimate:`);
  console.log(`   Remaining cities: ${remainingCities.toLocaleString()}`);
  console.log(`   Estimated time: ${formatDuration(estimatedTimeMs)}`);
  console.log();
  
  // Confirmation
  if (!isResuming) {
    console.log(`⚠️  This will make ${allCities.length.toLocaleString()} API calls costing $${totalCost}`);
    console.log(`⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...\n`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    console.log(`🔄 Resuming from city #${progress.lastIndex + 2}...\n`);
  }
  
  // Process cities
  console.log('🚀 Starting geocoding...\n');
  let successCount = 0;
  let errorCount = 0;
  let lastSaveTime = Date.now();
  
  for (let i = progress.lastIndex + 1; i < allCities.length; i++) {
    const city = allCities[i];
    
    try {
      const result = await geocodeCity(
        city.name, 
        city.state, 
        city.stateCode,
        city.latitude, 
        city.longitude,
        city.population,
        city.size,
        city.confidence
      );
      
      progress.processed.push(result);
      progress.lastIndex = i;
      progress.apiCalls++;
      
      if (result.county) {
        successCount++;
        const percent = ((i + 1) / allCities.length * 100).toFixed(1);
        console.log(`✅ [${i + 1}/${allCities.length}] (${percent}%) ${city.name}, ${city.stateCode} → ${result.county}`);
      } else {
        errorCount++;
        console.log(`⚠️  [${i + 1}/${allCities.length}] ${city.name}, ${city.stateCode} → No county found`);
      }
      
      // Save progress periodically or every 5 minutes
      const timeSinceLastSave = Date.now() - lastSaveTime;
      if ((i + 1) % SAVE_INTERVAL === 0 || timeSinceLastSave > 300000) {
        saveProgress(progress);
        lastSaveTime = Date.now();
        const elapsed = Date.now() - progress.startTime;
        const remaining = allCities.length - (i + 1);
        const rate = (i + 1) / (elapsed / 1000); // cities per second
        const eta = remaining / rate * 1000; // ms
        console.log(`💾 Progress saved | Elapsed: ${formatDuration(elapsed)} | ETA: ${formatDuration(eta)}\n`);
      }
      
      // Delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      
    } catch (err) {
      console.error(`❌ Error processing ${city.name}, ${city.state}:`, err.message);
      errorCount++;
      
      // Save progress on error
      saveProgress(progress);
    }
  }
  
  // Save final progress
  saveProgress(progress);
  
  // Generate TypeScript output file
  console.log('\n📝 Generating TypeScript file...');
  generateTypeScriptFile(progress.processed, allCities.length);
  
  // Final summary
  const totalElapsed = Date.now() - progress.startTime;
  console.log('\n✅ Geocoding Complete!');
  console.log('=====================');
  console.log(`✅ Success: ${successCount.toLocaleString()} cities`);
  console.log(`⚠️  Errors: ${errorCount.toLocaleString()} cities`);
  console.log(`📡 Total API calls: ${progress.apiCalls.toLocaleString()}`);
  console.log(`💰 Total cost: $${(progress.apiCalls * 0.005).toFixed(2)}`);
  console.log(`⏱️  Total time: ${formatDuration(totalElapsed)}`);
  console.log(`📁 Output: ${OUTPUT_FILE}\n`);
}

/**
 * Generate TypeScript file with county data
 */
function generateTypeScriptFile(cities, totalCities) {
  // Group by state, then by county
  const statesByCode = new Map();
  
  for (const city of cities) {
    if (!city.county) continue;
    
    if (!statesByCode.has(city.stateCode)) {
      statesByCode.set(city.stateCode, {
        name: city.state,
        code: city.stateCode,
        counties: new Map()
      });
    }
    
    const state = statesByCode.get(city.stateCode);
    
    if (!state.counties.has(city.county)) {
      state.counties.set(city.county, []);
    }
    
    state.counties.get(city.county).push(city);
  }
  
  // Generate TypeScript content
  let tsContent = `/**
 * US Cities Organized by County and State
 * Generated from Google Geocoding API
 * ${new Date().toISOString()}
 * 
 * Total: ${totalCities.toLocaleString()} cities
 * Geocoded: ${cities.filter(c => c.county).length.toLocaleString()} cities with county data
 * API Cost: $${(cities.length * 0.005).toFixed(2)}
 */

export interface USCityWithCounty {
  name: string;
  state: string;
  stateCode: string;
  county: string;
  latitude: number;
  longitude: number;
  population: number;
  size: string;
  confidence: string;
}

export interface USCounty {
  name: string;
  cities: USCityWithCounty[];
}

export interface USState {
  name: string;
  code: string;
  counties: USCounty[];
}

`;
  
  // Sort states alphabetically
  const sortedStates = Array.from(statesByCode.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  // Generate state arrays
  tsContent += 'export const US_STATES_WITH_COUNTIES: USState[] = [\n';
  
  let totalCounties = 0;
  let totalCitiesWithCounty = 0;
  
  for (const state of sortedStates) {
    const sortedCounties = Array.from(state.counties.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    totalCounties += sortedCounties.length;
    
    tsContent += `  {\n    name: '${state.name.replace(/'/g, "\\'")}',\n    code: '${state.code}',\n    counties: [\n`;
    
    for (const [countyName, cities] of sortedCounties) {
      totalCitiesWithCounty += cities.length;
      tsContent += `      {\n        name: '${countyName.replace(/'/g, "\\'")}',\n        cities: [\n`;
      
      for (const city of cities) {
        tsContent += `          { name: '${city.name.replace(/'/g, "\\'")}', state: '${city.state.replace(/'/g, "\\'")}', stateCode: '${city.stateCode}', county: '${countyName.replace(/'/g, "\\'")}', latitude: ${city.latitude}, longitude: ${city.longitude}, population: ${city.population}, size: '${city.size}', confidence: '${city.confidence}' },\n`;
      }
      
      tsContent += `        ],\n      },\n`;
    }
    
    tsContent += `    ],\n  },\n`;
  }
  
  tsContent += '];\n\n';
  tsContent += `// Summary:\n`;
  tsContent += `// - ${sortedStates.length} states\n`;
  tsContent += `// - ${totalCounties} counties\n`;
  tsContent += `// - ${totalCitiesWithCounty.toLocaleString()} cities with county data\n`;
  
  fs.writeFileSync(OUTPUT_FILE, tsContent);
  
  console.log(`✅ Generated ${OUTPUT_FILE}`);
  console.log(`   ${sortedStates.length} states`);
  console.log(`   ${totalCounties} counties`);
  console.log(`   ${totalCitiesWithCounty.toLocaleString()} cities with county data`);
}

// Run the script
main().catch(console.error);




