#!/usr/bin/env node

/**
 * Add missing places from TIGER data
 * Handles encoding issues and geocodes missing cities
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
  cleaned = cleaned.replace(/CaÃ±oncito/g, 'Cañoncito');
  cleaned = cleaned.replace(/CaÃ±ones/g, 'Cañones');
  cleaned = cleaned.replace(/PeÃ±a Blanca/g, 'Peña Blanca');
  cleaned = cleaned.replace(/PeÃ±asco/g, 'Peñasco');
  cleaned = cleaned.replace(/DoÃ±a Ana/g, 'Doña Ana');
  cleaned = cleaned.replace(/EspaÃ±ola/g, 'Española');
  
  return cleaned.trim();
}

/**
 * Geocode a place
 */
function geocodePlace(place) {
  return new Promise((resolve) => {
    const cleanName = cleanCityName(place.name);
    const query = `${cleanName}, ${place.stateCode}`;
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
              name: cleanName,
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
  console.log('🔧 Adding Missing Places');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  // Load missing places
  const missingPath = path.join(__dirname, '..', 'data', 'missing-places-to-add.json');
  let missingPlaces = [];
  
  try {
    missingPlaces = JSON.parse(await fs.readFile(missingPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Could not load missing places: ${error.message}`);
    console.log('   Run: node scripts/find-missing-cities.js first');
    process.exit(1);
  }
  
  console.log(`\n📊 Processing ${missingPlaces.length} missing places...`);
  
  let successCount = 0;
  let failCount = 0;
  const failed = [];
  
  for (let i = 0; i < missingPlaces.length; i++) {
    const place = missingPlaces[i];
    const cleanName = cleanCityName(place.name);
    
    console.log(`\n[${i + 1}/${missingPlaces.length}] Processing ${cleanName}, ${place.stateCode}...`);
    
    const geocoded = await geocodePlace(place);
    
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
      console.log(`   ❌ Geocoding failed`);
      failCount++;
      failed.push({ place, geocoded: null, error: 'Geocoding failed' });
    }
    
    // Rate limiting
    if (i < missingPlaces.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('\n✅ Processing Complete!');
  console.log('='.repeat(70));
  console.log(`📊 Final Statistics:`);
  console.log(`   Total processed: ${missingPlaces.length}`);
  console.log(`   Successfully added: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Success rate: ${((successCount / missingPlaces.length) * 100).toFixed(1)}%`);
  
  if (failed.length > 0) {
    const failedPath = path.join(__dirname, '..', 'data', 'failed-missing-places.json');
    await fs.writeFile(failedPath, JSON.stringify(failed, null, 2));
    console.log(`\n❌ Saved ${failed.length} failed places to: data/failed-missing-places.json`);
  }
}

main().catch(console.error);

