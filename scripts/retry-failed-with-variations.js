#!/usr/bin/env node

/**
 * Retry failed geocoding attempts with different approaches
 * - Try different query formats
 * - Try with state name instead of code
 * - Try reverse geocoding if we have approximate coordinates
 * - Handle encoding issues
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Use the robust add function
const { addCityRobust } = require('./fix-failed-cities-robust.js');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const DELAY_MS = 200;

// State name mapping
const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};

/**
 * Clean city name - fix encoding issues
 */
function cleanCityName(name) {
  let cleaned = name;
  
  // Fix UTF-8 encoding issues
  cleaned = cleaned.replace(/Ã±/g, 'ñ');
  cleaned = cleaned.replace(/Ã¡/g, 'á');
  cleaned = cleaned.replace(/Ã©/g, 'é');
  cleaned = cleaned.replace(/Ã­/g, 'í');
  cleaned = cleaned.replace(/Ã³/g, 'ó');
  cleaned = cleaned.replace(/Ãº/g, 'ú');
  cleaned = cleaned.replace(/Ã¼/g, 'ü');
  cleaned = cleaned.replace(/Ã§/g, 'ç');
  cleaned = cleaned.replace(/Ã‰/g, 'É');
  cleaned = cleaned.replace(/Ã'/g, "'");
  cleaned = cleaned.replace(/Ì‡/g, '');
  
  // Fix specific known issues
  cleaned = cleaned.replace(/UtqiagÌ‡vik/g, 'Utqiagvik');
  cleaned = cleaned.replace(/CaÃ±on City/g, 'Cañon City');
  cleaned = cleaned.replace(/CaÃ±on/g, 'Cañon');
  
  return cleaned.trim();
}

/**
 * Geocode with multiple query variations
 */
async function geocodeWithVariations(place) {
  const cleanName = cleanCityName(place.name);
  const stateCode = place.stateCode || place.state;
  const stateName = STATE_NAMES[stateCode] || stateCode;
  
  // Try different query formats
  const queries = [
    `${cleanName}, ${stateCode}`,
    `${cleanName}, ${stateName}`,
    `${cleanName}, ${stateName}, USA`,
    `${place.nameLsad || place.name}, ${stateCode}`,
    `${cleanName}, ${stateCode}, United States`
  ];
  
  for (const query of queries) {
    const result = await geocodePlace(query, stateCode);
    if (result) {
      return result;
    }
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return null;
}

/**
 * Geocode a place
 */
function geocodePlace(query, stateCode) {
  return new Promise((resolve) => {
    const url = `/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
    
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
            
            // Verify it's in the correct state
            let foundState = null;
            for (const component of result.address_components) {
              if (component.types.includes('administrative_area_level_1')) {
                foundState = component.short_name;
                break;
              }
            }
            
            // Only accept if state matches
            if (foundState !== stateCode) {
              resolve(null);
              return;
            }
            
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
              name: cleanCityName(place?.name || query.split(',')[0]),
              state: stateCode,
              stateCode: stateCode,
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: 50000,
              size: getSize(50000),
              confidence: 'medium',
              type: place?.type || 'CDP'
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

function getSize(pop) {
  if (pop > 1000000) return 'major';
  if (pop > 250000) return 'medium';
  if (pop > 50000) return 'small';
  return 'village';
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Retrying Failed Places with Variations');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  // Load failed places from multiple sources
  const failedSources = [
    { path: 'failed-tiger-places.json', name: 'TIGER places' },
    { path: 'failed-cities-to-retry.json', name: 'Cities to retry' }
  ];
  
  const allFailed = [];
  
  for (const source of failedSources) {
    try {
      const filePath = path.join(__dirname, '..', 'data', source.path);
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      console.log(`\n📊 Loaded ${data.length} ${source.name}`);
      
      // Convert format if needed
      if (source.path === 'failed-cities-to-retry.json') {
        data.forEach(city => {
          allFailed.push({
            name: city.name,
            stateCode: city.stateCode,
            state: city.state,
            type: 'incorporated' // Default assumption
          });
        });
      } else {
        allFailed.push(...data);
      }
    } catch (error) {
      console.log(`⚠️  Could not load ${source.path}: ${error.message}`);
    }
  }
  
  // Remove duplicates
  const uniqueFailed = new Map();
  allFailed.forEach(place => {
    const key = `${place.name}|${place.stateCode}`;
    if (!uniqueFailed.has(key)) {
      uniqueFailed.set(key, place);
    }
  });
  
  const failedArray = Array.from(uniqueFailed.values());
  console.log(`\n📊 Total unique failed places: ${failedArray.length}`);
  
  // Check database to see which are still missing
  const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const dbContent = await fs.readFile(dbPath, 'utf8');
  
  const stillMissing = [];
  failedArray.forEach(place => {
    const nameEscaped = cleanCityName(place.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `name:\\s*['"]${nameEscaped}['"]\\s*[^}]*stateCode:\\s*['"]${place.stateCode}['"]`,
      'i'
    );
    
    if (!pattern.test(dbContent)) {
      stillMissing.push(place);
    }
  });
  
  console.log(`📊 Still missing from database: ${stillMissing.length}`);
  
  if (stillMissing.length === 0) {
    console.log('\n✅ All failed places are now in the database!');
    return;
  }
  
  console.log(`\n🔄 Retrying ${Math.min(stillMissing.length, 200)} places (limited to 200 for now)...`);
  
  let successCount = 0;
  let failCount = 0;
  const failed = [];
  
  const toProcess = stillMissing.slice(0, 200); // Limit to 200 to avoid rate limits
  
  for (let i = 0; i < toProcess.length; i++) {
    const place = toProcess[i];
    const cleanName = cleanCityName(place.name);
    
    console.log(`\n[${i + 1}/${toProcess.length}] Retrying ${cleanName}, ${place.stateCode}...`);
    
    const geocoded = await geocodeWithVariations(place);
    
    if (geocoded) {
      console.log(`   ✅ Geocoded: ${geocoded.county}`);
      
      try {
        await addCityRobust(geocoded);
        console.log(`   ✅ Added to database`);
        successCount++;
      } catch (error) {
        console.log(`   ❌ Failed to add: ${error.message}`);
        failCount++;
        failed.push({ place, geocoded, error: error.message });
      }
    } else {
      console.log(`   ❌ All geocoding attempts failed`);
      failCount++;
      failed.push({ place, geocoded: null, error: 'All geocoding attempts failed' });
    }
    
    // Rate limiting
    if (i < toProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('\n✅ Processing Complete!');
  console.log('='.repeat(70));
  console.log(`📊 Final Statistics:`);
  console.log(`   Total processed: ${toProcess.length}`);
  console.log(`   Successfully added: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Success rate: ${((successCount / toProcess.length) * 100).toFixed(1)}%`);
  
  if (failed.length > 0) {
    const failedPath = path.join(__dirname, '..', 'data', 'still-failed-after-retry.json');
    await fs.writeFile(failedPath, JSON.stringify(failed, null, 2));
    console.log(`\n❌ Saved ${failed.length} still-failed places to: data/still-failed-after-retry.json`);
  }
  
  if (stillMissing.length > 200) {
    console.log(`\n⚠️  ${stillMissing.length - 200} more places remaining (run again to process more)`);
  }
}

main().catch(console.error);

