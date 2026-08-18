#!/usr/bin/env node

/**
 * Add the 51 missing CDPs to complete Census coverage
 */

const fs = require('fs');
const path = require('path');

const missingPath = path.join(__dirname, '..', 'data', 'missing-census-places.json');
const missingPlaces = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const fixScriptPath = path.join(__dirname, 'fix-failed-cities-robust.js');

console.log('📊 Adding Missing CDPs');
console.log('='.repeat(70));
console.log(`\n📊 Found ${missingPlaces.length} missing CDPs to add`);

// Use the robust add script's functions
const fixScript = fs.readFileSync(fixScriptPath, 'utf8');
eval(fixScript.replace(/^#!/, '//'));

// Load the robust add functions
const https = require('https');
const GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

if (!GEOCODING_API_KEY) {
  console.error('❌ Error: GOOGLE_GEOCODING_API_KEY or GOOGLE_PLACES_API_KEY not set');
  process.exit(1);
}

async function geocodePlace(place) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(`${place.name}, ${place.stateCode}`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GEOCODING_API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === 'OK' && result.results.length > 0) {
            const location = result.results[0].geometry.location;
            const components = result.results[0].address_components;
            
            let county = null;
            let state = null;
            let stateCode = null;
            
            components.forEach(comp => {
              if (comp.types.includes('administrative_area_level_2')) {
                county = comp.long_name.replace(' County', '');
              }
              if (comp.types.includes('administrative_area_level_1')) {
                state = comp.long_name;
                stateCode = comp.short_name;
              }
            });
            
            resolve({
              name: place.name,
              state: state || place.stateCode,
              stateCode: stateCode || place.stateCode,
              county: county ? `${county} County` : 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: 50000, // Default placeholder
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
    }).on('error', reject);
  });
}

// Add places one by one
async function addMissingCDPs() {
  console.log(`\n🔍 Geocoding and adding ${missingPlaces.length} missing CDPs...`);
  
  let success = 0;
  let failed = 0;
  const failedPlaces = [];
  
  for (let i = 0; i < missingPlaces.length; i++) {
    const place = missingPlaces[i];
    process.stdout.write(`\r   Processing ${i + 1}/${missingPlaces.length}: ${place.name}, ${place.stateCode}...`);
    
    try {
      // Small delay to avoid rate limiting
      if (i > 0 && i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const geocoded = await geocodePlace(place);
      
      // Use the robust add function
      const addResult = await addCityRobust(geocoded);
      
      if (addResult.success) {
        success++;
      } else {
        failed++;
        failedPlaces.push({ place, error: addResult.error });
      }
    } catch (error) {
      failed++;
      failedPlaces.push({ place, error: error.message });
    }
  }
  
  console.log(`\n\n📊 Results:`);
  console.log(`   Successfully added: ${success}`);
  console.log(`   Failed: ${failed}`);
  
  if (failedPlaces.length > 0) {
    const failedPath = path.join(__dirname, '..', 'data', 'failed-cdps.json');
    fs.writeFileSync(failedPath, JSON.stringify(failedPlaces, null, 2), 'utf8');
    console.log(`\n💾 Saved ${failed} failed places to: data/failed-cdps.json`);
  }
  
  return { success, failed, failedPlaces };
}

// Note: We need to import the addCityRobust function properly
// For now, let's use a simpler approach that directly modifies the file
console.log(`\n⚠️  Note: This script requires the robust add function.`);
console.log(`   For now, let's use the existing geocode-extracted-places.js approach.`);
console.log(`   Or we can manually add these using the fix-failed-cities-robust.js script.`);

// Let's create a simpler version that uses the existing infrastructure
process.exit(0);

