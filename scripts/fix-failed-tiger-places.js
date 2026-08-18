#!/usr/bin/env node

/**
 * Fix Failed TIGER Places
 * Handles cities with special characters, encoding issues, etc.
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
const DELAY_MS = 100;

/**
 * Clean city name - fix encoding issues
 */
function cleanCityName(name) {
  // Fix common encoding issues
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
  
  return cleaned.trim();
}

/**
 * Geocode a place
 */
async function geocodePlace(place) {
  const cleanName = cleanCityName(place.name);
  const query = `${cleanName}, ${place.stateCode}`;
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
              name: cleanName, // Use cleaned name
              state: place.stateCode,
              stateCode: place.stateCode,
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: 50000,
              size: getSize(50000),
              confidence: 'medium',
              type: place.type
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
  console.log('🔧 Fix Failed TIGER Places');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  // Load failed places
  const failedPath = path.join(__dirname, '..', 'data', 'failed-tiger-places.json');
  let failedPlaces = [];
  
  try {
    failedPlaces = JSON.parse(await fs.readFile(failedPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Could not load failed places: ${error.message}`);
    console.log('   Run: node scripts/find-failed-cities.js first');
    process.exit(1);
  }
  
  console.log(`\n📊 Found ${failedPlaces.length} failed places to fix`);
  
  const stats = { geocoded: 0, added: 0, failed: 0 };
  
  for (let i = 0; i < failedPlaces.length; i++) {
    const place = failedPlaces[i];
    const cleanName = cleanCityName(place.name);
    
    console.log(`\n[${i + 1}/${failedPlaces.length}] Processing ${cleanName}, ${place.stateCode}...`);
    
    try {
      const geocoded = await geocodePlace(place);
      if (geocoded) {
        stats.geocoded++;
        console.log(`   ✅ Geocoded: ${geocoded.county}`);
        
        const added = await addCityRobust(geocoded);
        if (added) {
          stats.added++;
          console.log(`   ✅ Added to database`);
        } else {
          stats.failed++;
          console.log(`   ⚠️  Failed to add`);
        }
      } else {
        stats.failed++;
        console.log(`   ❌ Geocoding failed`);
      }
      
      if (i < failedPlaces.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    } catch (error) {
      stats.failed++;
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Processing Complete!');
  console.log('='.repeat(70));
  console.log(`\n📊 Final Statistics:`);
  console.log(`   Total processed: ${failedPlaces.length}`);
  console.log(`   Successfully geocoded: ${stats.geocoded}`);
  console.log(`   Successfully added: ${stats.added}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Success rate: ${((stats.added / failedPlaces.length) * 100).toFixed(1)}%`);
}

if (require.main === module) {
  main().catch(console.error);
}

