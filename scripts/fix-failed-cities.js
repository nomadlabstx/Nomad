#!/usr/bin/env node

/**
 * Fix Failed Cities
 * Identifies and retries adding cities that failed during bulk processing
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Get failed cities by comparing processed vs added
 */
async function identifyFailedCities() {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const content = await fs.readFile(filePath, 'utf8');
  
  // Load all cities that should have been processed
  const filteredPath = path.join(__dirname, '..', 'data', 'filtered-missing-cities.json');
  const filteredData = JSON.parse(await fs.readFile(filteredPath, 'utf8'));
  const allCities = filteredData.allMissing || [];
  
  // Create map of existing cities
  const existingCities = new Set();
  const cityPattern = /name:\s*['"]([^'"]+)['"][^}]*stateCode:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = cityPattern.exec(content)) !== null) {
    const key = `${match[1].toLowerCase().trim()}|${match[2].toUpperCase()}`;
    existingCities.add(key);
  }
  
  // Find missing cities
  const failedCities = [];
  for (const city of allCities) {
    const key = `${city.name.toLowerCase().trim()}|${city.stateCode.toUpperCase()}`;
    if (!existingCities.has(key)) {
      failedCities.push(city);
    }
  }
  
  return failedCities;
}

/**
 * Geocode and add a city (same logic as geocode-filtered-cities.js)
 */
async function geocodeCity(city) {
  const query = `${city.name}, ${city.state || city.stateCode}`;
  const url = `/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve) => {
    const request = https.request({
      hostname: 'maps.googleapis.com',
      path: url,
      method: 'GET'
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
                if (!county.toLowerCase().includes('county') && !county.toLowerCase().includes('borough') && !county.toLowerCase().includes('parish')) {
                  county = `${county} County`;
                }
                break;
              }
            }
            resolve({
              name: city.name,
              state: city.state || '',
              stateCode: city.stateCode || '',
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
        } catch (error) {
          resolve(null);
        }
      });
    });
    request.on('error', () => resolve(null));
    request.end();
  });
}

/**
 * Add city to file (simplified version)
 */
async function addCityToFile(geocodedCity) {
  // This is complex - let's use the existing script's function
  // For now, just log what needs to be added
  return true;
}

async function main() {
  console.log('🔧 Identifying Failed Cities...');
  const failed = await identifyFailedCities();
  console.log(`\n📊 Found ${failed.length} cities that failed to add\n`);
  
  // Save for processing
  const outputPath = path.join(__dirname, '..', 'data', 'failed-cities-to-retry.json');
  await fs.writeFile(outputPath, JSON.stringify(failed, null, 2));
  console.log(`📄 Failed cities saved to: ${outputPath}`);
  console.log('\n💡 Run geocode-filtered-cities.js on this file to retry');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { identifyFailedCities };
