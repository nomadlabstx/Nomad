/**
 * Census Data Parser
 * Parses US Census sub-est2023.csv and generates location database
 * 
 * Usage: node scripts/parse-census-data.js
 */

/* eslint-env node */
/* global __dirname */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration  
const CENSUS_FILE = 'C:\\Users\\majim\\Downloads\\sub-est2023.csv';
const OUTPUT_FILE = path.join(__dirname, '../data/us-cities-census.ts');
const PROGRESS_FILE = path.join(__dirname, '../data/geocoding-progress.json');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_SERVER_KEY;
if (!GOOGLE_API_KEY) {
  throw new Error('Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_SERVER_KEY before running this script.');
}

// Geocoding cache to avoid duplicate API calls
const geocodeCache = new Map();
let apiCallCount = 0;
const MAX_API_CALLS = 40000; // Google's free tier limit per month

/**
 * Parse CSV line
 */
function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

/**
 * Geocode a city using Google Geocoding API
 */
async function geocodeCity(cityName, stateName) {
  const cacheKey = `${cityName}, ${stateName}`;
  
  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }
  
  // Check API limit
  if (apiCallCount >= MAX_API_CALLS) {
    console.log(`⚠️  Reached API limit (${MAX_API_CALLS} calls). Skipping remaining geocoding.`);
    return null;
  }
  
  const address = encodeURIComponent(`${cityName}, ${stateName}, USA`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          apiCallCount++;
          
          if (json.status === 'OK' && json.results[0]) {
            const location = json.results[0].geometry.location;
            const result = {
              latitude: location.lat,
              longitude: location.lng,
            };
            geocodeCache.set(cacheKey, result);
            resolve(result);
          } else {
            console.log(`❌ Failed to geocode: ${cacheKey} (${json.status})`);
            resolve(null);
          }
        } catch (error) {
          console.error(`Error parsing geocode response for ${cacheKey}:`, error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error(`Error geocoding ${cacheKey}:`, error.message);
      resolve(null);
    });
  });
}

/**
 * Clean city name (remove "city", "town", "village" suffixes)
 */
function cleanCityName(name) {
  return name
    .replace(/\s+(city|town|village|borough|CDP|municipality)$/i, '')
    .trim();
}

/**
 * Classify city by population
 */
function classifyCity(population) {
  if (population >= 500000) return 'major';
  if (population >= 100000) return 'medium';
  if (population >= 10000) return 'small';
  return 'village';
}

/**
 * Get confidence level
 */
function getConfidence(size) {
  if (size === 'major') return 'high';
  if (size === 'medium') return 'medium';
  return 'low';
}

/**
 * Get state code from state name
 */
const STATE_CODES = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC', 'Puerto Rico': 'PR'
};

/**
 * Main parsing function
 */
async function parseCensusData() {
  console.log('📊 Parsing US Census Data...\n');
  
  // Read CSV file
  const csvContent = fs.readFileSync(CENSUS_FILE, 'utf-8');
  const lines = csvContent.split('\n');
  
  console.log(`Total lines: ${lines.length}`);
  
  // Parse header
  const header = parseCsvLine(lines[0]);
  const nameIndex = header.indexOf('NAME');
  const stateIndex = header.indexOf('STNAME');
  const popIndex = header.indexOf('POPESTIMATE2023');
  const sumlevIndex = header.indexOf('SUMLEV');
  
  console.log('Column indices:', { nameIndex, stateIndex, popIndex, sumlevIndex });
  
  // Parse cities
  const cities = [];
  let skipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCsvLine(lines[i]);
    const sumlev = values[sumlevIndex];
    
    // Only process incorporated places (SUMLEV=162)
    if (sumlev !== '162') {
      skipped++;
      continue;
    }
    
    const rawName = values[nameIndex];
    const stateName = values[stateIndex];
    const population = parseInt(values[popIndex]) || 0;
    
    // Skip if no population data
    if (population === 0) continue;
    
    const cityName = cleanCityName(rawName);
    const stateCode = STATE_CODES[stateName] || 'XX';
    const size = classifyCity(population);
    const confidence = getConfidence(size);
    
    cities.push({
      name: cityName,
      state: stateName,
      stateCode,
      population,
      size,
      confidence,
      rawName,
    });
  }
  
  console.log(`\n✅ Parsed ${cities.length} cities`);
  console.log(`⏭️  Skipped ${skipped} non-city entries`);
  
  // Sort by population (descending)
  cities.sort((a, b) => b.population - a.population);
  
  // Statistics
  const stats = {
    major: cities.filter(c => c.size === 'major').length,
    medium: cities.filter(c => c.size === 'medium').length,
    small: cities.filter(c => c.size === 'small').length,
    village: cities.filter(c => c.size === 'village').length,
  };
  
  console.log('\n📊 City Classification:');
  console.log(`   Major cities (>500K): ${stats.major}`);
  console.log(`   Medium cities (100K-500K): ${stats.medium}`);
  console.log(`   Small cities (10K-100K): ${stats.small}`);
  console.log(`   Villages (<10K): ${stats.village}`);
  
  return cities;
}

/**
 * Load progress from previous run
 */
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      const progress = JSON.parse(data);
      console.log(`📂 Loaded progress: ${progress.geocodedCities.length} cities already geocoded`);
      return progress;
    }
  } catch (error) {
    console.log('⚠️  Could not load progress, starting fresh');
  }
  return { geocodedCities: [], lastIndex: 0 };
}

/**
 * Save progress to file
 */
function saveProgress(geocodedCities, lastIndex) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
      geocodedCities,
      lastIndex,
      timestamp: new Date().toISOString(),
    }, null, 2));
  } catch (error) {
    console.error('⚠️  Could not save progress:', error.message);
  }
}

/**
 * Geocode top cities
 */
async function geocodeTopCities(cities, limit = 19476) {
  console.log(`\n🗺️  Geocoding ${limit === 19476 ? 'ALL' : 'top ' + limit} cities...`);
  console.log(`⏳ This will take ~${Math.ceil(limit / 60)} minutes (${(limit / 60 / 60).toFixed(1)} hours)\n`);
  
  // Load previous progress
  const progress = loadProgress();
  const geocodedCities = progress.geocodedCities;
  const startIndex = progress.lastIndex;
  
  if (startIndex > 0) {
    console.log(`🔄 Resuming from city #${startIndex + 1}...\n`);
  }
  
  const startTime = Date.now();
  
  for (let i = startIndex; i < Math.min(limit, cities.length); i++) {
    const city = cities[i];
    
    // Add delay to respect API rate limits (50 requests per second max)
    if (i > 0 && i % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const remaining = ((limit - i) / 60).toFixed(0);
      console.log(`   Processed ${i} cities... (${elapsed}m elapsed, ~${remaining}m remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const coords = await geocodeCity(city.name, city.state);
    
    if (coords) {
      geocodedCities.push({
        ...city,
        coordinates: coords,
      });
      
      // Save progress every 100 cities
      if ((i + 1) % 100 === 0) {
        console.log(`✅ Geocoded ${i + 1}/${limit} cities (${((i + 1) / limit * 100).toFixed(1)}%)`);
        saveProgress(geocodedCities, i + 1);
      }
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Successfully geocoded ${geocodedCities.length} cities`);
  console.log(`📊 API calls used: ${apiCallCount}`);
  console.log(`⏱️  Total time: ${totalTime} minutes`);
  
  // Save final progress
  saveProgress(geocodedCities, geocodedCities.length);
  
  return geocodedCities;
}

/**
 * Generate TypeScript file
 */
function generateTypeScriptFile(cities) {
  console.log('\n📝 Generating TypeScript file...');
  
  const bySize = {
    major: cities.filter(c => c.size === 'major'),
    medium: cities.filter(c => c.size === 'medium'),
    small: cities.filter(c => c.size === 'small'),
    village: cities.filter(c => c.size === 'village'),
  };
  
  let content = `/**
 * US Cities Database - Generated from US Census Bureau Data
 * Source: sub-est2023.csv (2023 Population Estimates)
 * Generated: ${new Date().toISOString()}
 * Total Cities: ${cities.length}
 */

import type { CityData } from '../types/location-database';

`;
  
  // Generate arrays for each size category
  for (const [sizeName, citiesOfSize] of Object.entries(bySize)) {
    if (citiesOfSize.length === 0) continue;
    
    const varName = `${sizeName.toUpperCase()}_CITIES_CENSUS`;
    content += `// ${sizeName.charAt(0).toUpperCase() + sizeName.slice(1)} Cities (${citiesOfSize.length} total)\n`;
    content += `export const ${varName}: CityData[] = [\n`;
    
    for (const city of citiesOfSize) {
      // Escape single quotes in city names
      const safeName = city.name.replace(/'/g, "\\'");
      content += `  { name: '${safeName}', state: '${city.state}', stateCode: '${city.stateCode}', population: ${city.population}, coordinates: { latitude: ${city.coordinates.latitude}, longitude: ${city.coordinates.longitude} }, size: '${city.size}', confidence: '${city.confidence}' },\n`;
    }
    
    content += `];\n\n`;
  }
  
  // Export all
  content += `// All cities combined\n`;
  content += `export const ALL_CITIES_CENSUS: CityData[] = [\n`;
  content += `  ...MAJOR_CITIES_CENSUS,\n`;
  content += `  ...MEDIUM_CITIES_CENSUS,\n`;
  content += `  ...SMALL_CITIES_CENSUS,\n`;
  content += `  ...VILLAGE_CITIES_CENSUS,\n`;
  content += `];\n\n`;
  
  content += `export const CENSUS_STATS = {\n`;
  content += `  total: ${cities.length},\n`;
  content += `  major: ${bySize.major.length},\n`;
  content += `  medium: ${bySize.medium.length},\n`;
  content += `  small: ${bySize.small.length},\n`;
  content += `  village: ${bySize.village.length},\n`;
  content += `  generatedAt: '${new Date().toISOString()}',\n`;
  content += `};\n`;
  
  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  console.log(`✅ Generated: ${OUTPUT_FILE}`);
  console.log(`📊 Total cities in file: ${cities.length}\n`);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Check if API key is set
    if (!GOOGLE_API_KEY) {
      console.error('❌ Error: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not set in environment');
      console.error('   Please set it in your .env file or environment variables');
      process.exit(1);
    }
    
    // Step 1: Parse Census data
    const cities = await parseCensusData();
    
    // Step 2: Geocode ALL cities (this will take 5-6 hours)
    const geocodedCities = await geocodeTopCities(cities, 19476);
    
    // Step 3: Generate TypeScript file
    generateTypeScriptFile(geocodedCities);
    
    console.log('🎉 Done! Your location database is ready to use.\n');
    console.log('📝 Next steps:');
    console.log('   1. Import the new database in services/location-database.ts');
    console.log('   2. Test with: "What to do in [any top 500 city]?"');
    console.log('   3. Run again later to geocode more cities\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { parseCensusData, geocodeCity, geocodeTopCities, generateTypeScriptFile };




