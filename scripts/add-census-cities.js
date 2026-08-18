#!/usr/bin/env node

/**
 * Add missing cities from Census data
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
 * Geocode a place
 */
function geocodePlace(place) {
  return new Promise((resolve) => {
    const query = `${place.name}, ${place.stateCode}`;
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
            
            // Verify state
            let foundState = null;
            for (const component of result.address_components) {
              if (component.types.includes('administrative_area_level_1')) {
                foundState = component.short_name;
                break;
              }
            }
            
            if (foundState !== place.stateCode) {
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
              name: place.name,
              state: place.state || '',
              stateCode: place.stateCode,
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: place.population || 50000,
              size: getSize(place.population || 50000),
              confidence: 'medium'
            });
          } else {
            // Use coordinates from Census data if available
            if (place.latitude && place.longitude) {
              resolve({
                name: place.name,
                state: place.state || '',
                stateCode: place.stateCode,
                county: 'Unknown County', // Will need to reverse geocode
                latitude: place.latitude,
                longitude: place.longitude,
                population: place.population || 50000,
                size: getSize(place.population || 50000),
                confidence: 'low'
              });
            } else {
              resolve(null);
            }
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
 * Reverse geocode to get county
 */
function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    
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
            
            resolve(county);
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
  console.log('🔧 Adding Missing Cities from Census Data');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  // Load missing cities
  const missingPath = path.join(__dirname, '..', 'data', 'missing-from-census.json');
  let missingCities = [];
  
  try {
    missingCities = JSON.parse(await fs.readFile(missingPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Could not load missing cities: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`\n📊 Processing ${missingCities.length} missing cities...`);
  
  let successCount = 0;
  let failCount = 0;
  const failed = [];
  
  for (let i = 0; i < missingCities.length; i++) {
    const city = missingCities[i];
    
    console.log(`\n[${i + 1}/${missingCities.length}] Processing ${city.name}, ${city.stateCode}...`);
    
    let geocoded = await geocodePlace(city);
    
    // If geocoding failed but we have coordinates, use them and reverse geocode for county
    if (!geocoded && city.latitude && city.longitude) {
      console.log(`   ⚠️  Geocoding failed, using Census coordinates and reverse geocoding...`);
      const county = await reverseGeocode(city.latitude, city.longitude);
      
      geocoded = {
        name: city.name,
        state: city.state || '',
        stateCode: city.stateCode,
        county: county || 'Unknown County',
        latitude: city.latitude,
        longitude: city.longitude,
        population: city.population || 50000,
        size: getSize(city.population || 50000),
        confidence: 'low'
      };
    }
    
    if (geocoded) {
      console.log(`   ✅ Geocoded: ${geocoded.county}`);
      
      try {
        await addCityRobust(geocoded);
        console.log(`   ✅ Added to database`);
        successCount++;
      } catch (error) {
        console.log(`   ❌ Failed to add: ${error.message}`);
        failCount++;
        failed.push({ city, geocoded, error: error.message });
      }
    } else {
      console.log(`   ❌ Could not geocode`);
      failCount++;
      failed.push({ city, geocoded: null, error: 'Geocoding failed' });
    }
    
    // Rate limiting
    if (i < missingCities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('\n✅ Processing Complete!');
  console.log('='.repeat(70));
  console.log(`📊 Final Statistics:`);
  console.log(`   Total processed: ${missingCities.length}`);
  console.log(`   Successfully added: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Success rate: ${((successCount / missingCities.length) * 100).toFixed(1)}%`);
  
  if (failed.length > 0) {
    const failedPath = path.join(__dirname, '..', 'data', 'failed-census-cities.json');
    await fs.writeFile(failedPath, JSON.stringify(failed, null, 2));
    console.log(`\n❌ Saved ${failed.length} failed cities to: data/failed-census-cities.json`);
  }
}

main().catch(console.error);

