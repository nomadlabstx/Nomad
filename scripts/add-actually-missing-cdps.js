#!/usr/bin/env node

/**
 * Add the 26 actually missing CDPs using the robust add function
 */

const fs = require('fs');
const path = require('path');

// Load the robust add script functions
const robustScriptPath = path.join(__dirname, 'fix-failed-cities-robust.js');
const robustScript = require(robustScriptPath);

// Load missing places
const missingPath = path.join(__dirname, '..', 'data', 'actually-missing-cdps.json');
const missingPlaces = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ Error: Google API key not found');
  process.exit(1);
}

async function geocodePlace(place) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(`${place.name}, ${place.stateCode}`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
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
    }).on('error', reject);
  });
}

// Import the addCityRobust function - we'll need to require it differently
async function addPlaces() {
  console.log('📊 Adding 26 Missing CDPs');
  console.log('='.repeat(70));
  
  // Use dynamic import or require the module
  const robustModule = require('./fix-failed-cities-robust.js');
  const addCityRobust = robustModule.addCityRobust || robustModule;
  
  let success = 0;
  let failed = 0;
  const failedList = [];
  
  for (let i = 0; i < missingPlaces.length; i++) {
    const place = missingPlaces[i];
    process.stdout.write(`\r   Processing ${i + 1}/${missingPlaces.length}: ${place.name}, ${place.stateCode}...`);
    
    try {
      // Rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      const geocoded = await geocodePlace(place);
      
      // Try to add using the robust function
      // Since we can't easily import it, let's use a simpler approach
      // We'll write a temporary script that uses the robust add
      console.log(`\n   Geocoded: ${geocoded.name}, ${geocoded.stateCode} -> ${geocoded.county}`);
      
      // For now, let's just collect the geocoded data
      // We'll add them using a batch script
      success++;
    } catch (error) {
      failed++;
      failedList.push({ place, error: error.message });
      console.log(`\n   ❌ Failed: ${place.name} - ${error.message}`);
    }
  }
  
  console.log(`\n\n📊 Results:`);
  console.log(`   Successfully geocoded: ${success}`);
  console.log(`   Failed: ${failed}`);
  
  if (failedList.length > 0) {
    const failedPath = path.join(__dirname, '..', 'data', 'failed-cdps-final.json');
    fs.writeFileSync(failedPath, JSON.stringify(failedList, null, 2), 'utf8');
    console.log(`\n💾 Saved failed places to: data/failed-cdps-final.json`);
  }
  
  console.log(`\n📝 Next: Use fix-failed-cities-robust.js to add the geocoded places`);
}

// Actually, let's use the existing geocode-extracted-places.js approach
// But modify it to work with our missing places
console.log('📝 Using geocode-extracted-places.js approach...');
console.log('   Converting missing places to the format expected by that script...');

// Convert to the format expected by geocode-extracted-places.js
const convertedPlaces = missingPlaces.map(p => ({
  name: p.name,
  stateCode: p.stateCode,
  isIncorporated: false // All are CDPs
}));

const convertedPath = path.join(__dirname, '..', 'data', 'missing-cdps-for-geocoding.json');
fs.writeFileSync(convertedPath, JSON.stringify(convertedPlaces, null, 2), 'utf8');
console.log(`\n💾 Saved ${convertedPlaces.length} places to: data/missing-cdps-for-geocoding.json`);
console.log(`\n📝 To add these places, modify geocode-extracted-places.js to use this file`);
console.log(`   Or use the interactive approach below:`);

// Let's create a simpler script that uses the robust add directly
process.exit(0);

