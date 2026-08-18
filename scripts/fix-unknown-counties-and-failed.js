#!/usr/bin/env node

/**
 * Fix Unknown Counties and Failed Cities
 * Re-geocodes cities with "Unknown County" and fixes encoding issues
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
 * Geocode with better query
 */
async function geocodeCityImproved(cityName, stateCode, coordinates) {
  // Try multiple query formats
  const queries = [
    `${cityName}, ${stateCode}`,
    `${cityName}, ${stateCode}, USA`,
    coordinates ? `${coordinates.latitude}, ${coordinates.longitude}` : null
  ].filter(Boolean);
  
  for (const query of queries) {
    const url = `/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
    
    const result = await new Promise((resolve) => {
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
              resolve(jsonData.results[0]);
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
    
    if (result) {
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
      
      if (county && county !== 'Unknown County') {
        return {
          name: cityName,
          state: stateCode,
          stateCode: stateCode,
          county: county,
          latitude: location.lat,
          longitude: location.lng,
          population: 50000,
          size: 'small',
          confidence: 'medium'
        };
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Delay between queries
  }
  
  return null;
}

/**
 * Extract cities with Unknown County from database
 */
async function findUnknownCountyCities() {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const content = await fs.readFile(filePath, 'utf8');
  
  const cities = [];
  const unknownPattern = /county:\s*['"]Unknown County['"][^}]*name:\s*['"]([^'"]+)['"][^}]*stateCode:\s*['"]([^'"]+)['"][^}]*latitude:\s*([0-9.]+)[^}]*longitude:\s*([0-9.-]+)/g;
  
  let match;
  while ((match = unknownPattern.exec(content)) !== null) {
    cities.push({
      name: match[1],
      stateCode: match[2],
      latitude: parseFloat(match[3]),
      longitude: parseFloat(match[4])
    });
  }
  
  return cities;
}

/**
 * Update city county in database
 */
async function updateCityCounty(cityName, stateCode, oldCounty, newCounty) {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  // Find and replace the county
  const escapedName = cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedOldCounty = oldCounty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedNewCounty = newCounty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const pattern = new RegExp(
    `(name:\\s*['"]${escapedName}['"][^}]*stateCode:\\s*['"]${stateCode}['"][^}]*county:\\s*['"])${escapedOldCounty}(['"])`,
    'g'
  );
  
  if (pattern.test(content)) {
    content = content.replace(pattern, `$1${escapedNewCounty}$2`);
    await fs.writeFile(filePath, content);
    return true;
  }
  
  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Fix Unknown Counties and Failed Cities');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  // Find cities with Unknown County
  console.log('\n📊 Finding cities with Unknown County...');
  const unknownCities = await findUnknownCountyCities();
  console.log(`   Found ${unknownCities.length} cities with Unknown County`);
  
  // Load failed cities
  let failedPlaces = [];
  try {
    const failedData = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'data', 'failed-tiger-places.json'), 'utf8'));
    failedPlaces = Array.isArray(failedData) ? failedData : [];
  } catch (e) {
    console.log('   No failed cities file found');
  }
  
  console.log(`   Found ${failedPlaces.length} failed cities to retry`);
  
  const allToFix = [
    ...unknownCities.map(c => ({ ...c, type: 'unknown-county' })),
    ...failedPlaces.map(p => ({ ...p, type: 'failed' }))
  ];
  
  if (allToFix.length === 0) {
    console.log('\n✅ No cities to fix!');
    return;
  }
  
  console.log(`\n📦 Processing ${allToFix.length} cities to fix...\n`);
  
  const stats = { updated: 0, failed: 0 };
  
  for (let i = 0; i < allToFix.length; i++) {
    const city = allToFix[i];
    const cleanName = city.name.replace(/Ã±/g, 'ñ').replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã§/g, 'ç').replace(/Ã‰/g, 'É').replace(/Ì‡/g, '');
    
    console.log(`[${i + 1}/${allToFix.length}] ${city.type === 'unknown-county' ? 'Updating' : 'Fixing'} ${cleanName}, ${city.stateCode}...`);
    
    try {
      const geocoded = await geocodeCityImproved(
        cleanName, 
        city.stateCode, 
        city.latitude && city.longitude ? { latitude: city.latitude, longitude: city.longitude } : null
      );
      
      if (geocoded && geocoded.county && geocoded.county !== 'Unknown County') {
        if (city.type === 'unknown-county') {
          // Update existing city
          const updated = await updateCityCounty(city.name, city.stateCode, 'Unknown County', geocoded.county);
          if (updated) {
            stats.updated++;
            console.log(`   ✅ Updated county to: ${geocoded.county}`);
          } else {
            stats.failed++;
            console.log(`   ⚠️  Could not update (not found in database)`);
          }
        } else {
          // Add failed city
          const added = await addCityRobust(geocoded);
          if (added) {
            stats.updated++;
            console.log(`   ✅ Added with county: ${geocoded.county}`);
          } else {
            stats.failed++;
            console.log(`   ⚠️  Failed to add`);
          }
        }
      } else {
        stats.failed++;
        console.log(`   ❌ Could not geocode or find county`);
      }
      
      if (i < allToFix.length - 1) {
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
  console.log(`   Total processed: ${allToFix.length}`);
  console.log(`   Successfully updated/added: ${stats.updated}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Success rate: ${((stats.updated / allToFix.length) * 100).toFixed(1)}%`);
}

if (require.main === module) {
  main().catch(console.error);
}

