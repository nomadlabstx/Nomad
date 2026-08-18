#!/usr/bin/env node

/**
 * Fix Wall Lake, IN and Lake Santee, IN using reverse geocoding
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
 * Reverse geocode coordinates to get county
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
            
            resolve(county || null);
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
function updateCityCounty(filePath, cityName, stateCode, newCounty) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Pattern to find the city entry with Unknown County
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
    
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

/**
 * Move city from Unknown County section to proper county section
 */
function moveCityToCounty(filePath, cityName, stateCode, county) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // First, find and extract the city entry from Unknown County
  const cityPattern = new RegExp(
    `\\{\\s*name:\\s*['"]${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*,\\s*state:\\s*['"]${stateCode}['"]\\s*,\\s*stateCode:\\s*['"]${stateCode}['"]\\s*,\\s*county:\\s*['"]Unknown County['"]\\s*,[^}]+\\}`,
    'i'
  );
  
  const cityMatch = content.match(cityPattern);
  if (!cityMatch) {
    return false;
  }
  
  const cityEntry = cityMatch[0].replace(/county:\s*['"]Unknown County['"]/, `county: '${county}'`);
  
  // Remove city from Unknown County section
  content = content.replace(cityPattern, '');
  
  // Clean up empty Unknown County sections
  content = content.replace(
    /{\s*name:\s*['"]Unknown County['"]\s*,\s*cities:\s*\[\s*\]\s*}/g,
    ''
  );
  
  // Find the state and county section
  const stateCodeEscaped = stateCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const countyEscaped = county.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Pattern to find the county section within the state
  const countyPattern = new RegExp(
    `(code:\\s*['"]${stateCodeEscaped}['"][\\s\\S]*?counties:\\s*\\[[\\s\\S]*?)(\\{\\s*name:\\s*['"]${countyEscaped}['"]\\s*,\\s*cities:\\s*\\[)`,
    'i'
  );
  
  const countyMatch = content.match(countyPattern);
  if (countyMatch) {
    // County exists, add city to it
    content = content.replace(
      countyPattern,
      `$1$2\n          ${cityEntry},`
    );
  } else {
    // County doesn't exist, need to create it
    // Find where to insert it (after the last county in the state)
    const stateEndPattern = new RegExp(
      `(code:\\s*['"]${stateCodeEscaped}['"][\\s\\S]*?counties:\\s*\\[)([\\s\\S]*?)(\\]\\s*\\})`,
      'i'
    );
    
    const stateMatch = content.match(stateEndPattern);
    if (stateMatch) {
      const countiesSection = stateMatch[2];
      const lastCountyMatch = countiesSection.match(/}\s*$/);
      
      if (lastCountyMatch) {
        // Insert new county before the closing bracket
        content = content.replace(
          stateEndPattern,
          `$1$2      {
        name: '${county}',
        cities: [
          ${cityEntry},
        ]
      },
$3`
        );
      }
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Fixing Wall Lake, IN and Lake Santee, IN (Reverse Geocoding)');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  
  const cities = [
    { name: 'Wall Lake', stateCode: 'IN', lat: 41.7278677, lng: -85.2023569 },
    { name: 'Lake Santee', stateCode: 'IN', lat: 39.418872, lng: -85.3191724 }
  ];
  
  for (const city of cities) {
    console.log(`\n📍 Reverse geocoding ${city.name}, ${city.stateCode}...`);
    console.log(`   Coordinates: ${city.lat}, ${city.lng}`);
    
    const county = await reverseGeocode(city.lat, city.lng);
    
    if (county && county !== 'Unknown County') {
      console.log(`   ✅ Found county: ${county}`);
      
      // Try to update in place first
      let updated = updateCityCounty(filePath, city.name, city.stateCode, county);
      
      if (!updated) {
        // If that fails, try moving the city to the proper county section
        console.log(`   🔄 Moving city to proper county section...`);
        updated = moveCityToCounty(filePath, city.name, city.stateCode, county);
      }
      
      if (updated) {
        console.log(`   ✅ Successfully updated ${city.name} to ${county}`);
      } else {
        console.log(`   ❌ Could not update city in database`);
      }
    } else {
      console.log(`   ❌ Could not determine county`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);

