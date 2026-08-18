#!/usr/bin/env node

/**
 * Fix a Single Failed City
 * Usage: node scripts/fix-single-city.js "City Name" "State Code"
 */

const path = require('path');
const https = require('https');
const fs = require('fs').promises;

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Geocode a city
 */
async function geocodeCity(cityName, stateCode) {
  const query = `${cityName}, ${stateCode}`;
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
              name: cityName,
              state: stateCode,
              stateCode: stateCode,
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: 50000,
              size: 'small',
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

/**
 * Main execution
 */
async function main() {
  const cityName = process.argv[2];
  const stateCode = process.argv[3];
  
  if (!cityName || !stateCode) {
    console.log('Usage: node scripts/fix-single-city.js "City Name" "State Code"');
    console.log('Example: node scripts/fix-single-city.js "Springfield" "IL"');
    process.exit(1);
  }
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  console.log(`🔍 Processing ${cityName}, ${stateCode}...`);
  
  const geocoded = await geocodeCity(cityName, stateCode);
  if (!geocoded) {
    console.log('❌ Geocoding failed');
    process.exit(1);
  }
  
  console.log(`✅ Geocoded: ${geocoded.county}`);
  
  // Use the robust script's function
  const { addCityRobust } = require('./fix-failed-cities-robust.js');
  const added = await addCityRobust(geocoded);
  
  if (added) {
    console.log('✅ Successfully added to database!');
  } else {
    console.log('❌ Failed to add to database');
    console.log('City data:', JSON.stringify(geocoded, null, 2));
  }
}

if (require.main === module) {
  main().catch(console.error);
}
