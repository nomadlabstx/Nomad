#!/usr/bin/env node

/**
 * Fix Wall Lake, IN and Lake Santee, IN
 * These two cities have "Unknown County" and need to be updated
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Geocode a place
 */
function geocodePlace(name, stateCode) {
  return new Promise((resolve) => {
    const query = `${name}, ${stateCode}`;
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
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng
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
 * Update city county in database
 */
function updateCityCounty(filePath, cityName, stateCode, newCounty, newLat, newLng) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the city entry and replace "Unknown County" with the actual county
  const cityPattern = new RegExp(
    `(\\{[^}]*name:\\s*['"]${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^}]*stateCode:\\s*['"]${stateCode}['"][^}]*county:\\s*['"])Unknown County(['"][^}]*\\})`,
    'i'
  );
  
  const match = content.match(cityPattern);
  if (match) {
    // Replace Unknown County with actual county
    content = content.replace(
      cityPattern,
      `$1${newCounty}$2`
    );
    
    // Also update coordinates if they're different
    if (newLat && newLng) {
      const coordPattern = new RegExp(
        `(\\{[^}]*name:\\s*['"]${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^}]*stateCode:\\s*['"]${stateCode}['"][^}]*county:\\s*['"]${newCounty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^}]*latitude:\\s*)[0-9.]+([^}]*longitude:\\s*)[0-9.]+`,
        'i'
      );
      content = content.replace(
        coordPattern,
        `$1${newLat}$2${newLng}`
      );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Fixing Wall Lake, IN and Lake Santee, IN');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  
  const cities = [
    { name: 'Wall Lake', stateCode: 'IN' },
    { name: 'Lake Santee', stateCode: 'IN' }
  ];
  
  for (const city of cities) {
    console.log(`\n📍 Geocoding ${city.name}, ${city.stateCode}...`);
    
    const geocoded = await geocodePlace(city.name, city.stateCode);
    
    if (geocoded && geocoded.county !== 'Unknown County') {
      console.log(`   ✅ Found: ${geocoded.county}`);
      console.log(`   📍 Coordinates: ${geocoded.latitude}, ${geocoded.longitude}`);
      
      const updated = updateCityCounty(
        filePath,
        city.name,
        city.stateCode,
        geocoded.county,
        geocoded.latitude,
        geocoded.longitude
      );
      
      if (updated) {
        console.log(`   ✅ Updated in database`);
      } else {
        console.log(`   ❌ Could not find city in database`);
      }
    } else {
      console.log(`   ❌ Geocoding failed`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);

