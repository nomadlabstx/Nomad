#!/usr/bin/env node

/**
 * Add the 26 actually missing CDPs
 * Uses the robust add approach from fix-failed-cities-robust.js
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ Error: Google API key not found');
  process.exit(1);
}

// Load missing places - will be loaded in main()

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');

async function geocodePlace(place) {
  const query = `${place.name}, ${place.stateCode}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'maps.googleapis.com',
      path: url.replace('https://maps.googleapis.com', ''),
      method: 'GET',
      timeout: 10000
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === 'OK' && result.results.length > 0) {
            const location = result.results[0].geometry.location;
            const components = result.results[0].address_components;
            
            let county = 'Unknown County';
            let state = null;
            let stateCode = place.stateCode;
            
            components.forEach(comp => {
              if (comp.types.includes('administrative_area_level_2')) {
                county = comp.long_name;
                if (!county.toLowerCase().includes('county') && 
                    !county.toLowerCase().includes('borough') && 
                    !county.toLowerCase().includes('parish')) {
                  county = `${county} County`;
                }
              }
              if (comp.types.includes('administrative_area_level_1')) {
                state = comp.long_name;
                stateCode = comp.short_name;
              }
            });
            
            resolve({
              name: place.name,
              state: state || place.stateCode,
              stateCode: stateCode,
              county: county,
              latitude: location.lat,
              longitude: location.lng,
              population: 50000,
              size: 'village',
              confidence: 'medium'
            });
          } else {
            reject(new Error(`Geocoding failed: ${result.status}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
    
    request.end();
  });
}

// Import the addCityRobust function - we need to require the module properly
// Since fix-failed-cities-robust.js doesn't export, let's use a simpler approach
// We'll use the geocode-extracted-places.js approach but modify it

async function main() {
  console.log('📊 Adding 26 Missing CDPs');
  console.log('='.repeat(70));
  
  // Load missing places
  const missingPath = path.join(__dirname, '..', 'data', 'actually-missing-cdps.json');
  const missingPlaces = JSON.parse(await fs.readFile(missingPath, 'utf8'));
  
  // Instead of trying to import, let's use the geocode-extracted-places.js script
  // by creating a temporary file with our missing places
  const tempPlaces = missingPlaces.map(p => ({
    name: p.name,
    stateCode: p.stateCode,
    isIncorporated: false
  }));
  
  const tempPath = path.join(__dirname, '..', 'data', 'temp-missing-cdps.json');
  await fs.writeFile(tempPath, JSON.stringify(tempPlaces, null, 2), 'utf8');
  
  console.log(`\n💾 Created temporary file: data/temp-missing-cdps.json`);
  console.log(`\n📝 To add these places:`);
  console.log(`   1. Modify geocode-extracted-places.js to use temp-missing-cdps.json`);
  console.log(`   2. Or use fix-failed-cities-robust.js with the geocoded data`);
  console.log(`\n   Alternatively, we can add them one by one using a simpler script.`);
  
  // Let's geocode them first
  console.log(`\n🔍 Geocoding ${missingPlaces.length} places...`);
  
  const geocoded = [];
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < missingPlaces.length; i++) {
    const place = missingPlaces[i];
    process.stdout.write(`\r   ${i + 1}/${missingPlaces.length}: ${place.name}, ${place.stateCode}...`);
    
    try {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      const geocodedPlace = await geocodePlace(place);
      geocoded.push(geocodedPlace);
      success++;
    } catch (error) {
      failed++;
      console.log(`\n   ❌ Failed: ${place.name} - ${error.message}`);
    }
  }
  
  console.log(`\n\n📊 Geocoding Results:`);
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
  
  if (geocoded.length > 0) {
    const geocodedPath = path.join(__dirname, '..', 'data', 'geocoded-missing-cdps.json');
    await fs.writeFile(geocodedPath, JSON.stringify(geocoded, null, 2), 'utf8');
    console.log(`\n💾 Saved ${geocoded.length} geocoded places to: data/geocoded-missing-cdps.json`);
    console.log(`\n📝 Next: Use fix-failed-cities-robust.js to add these places`);
    console.log(`   Or modify it to read from geocoded-missing-cdps.json`);
  }
}

main().catch(console.error);

