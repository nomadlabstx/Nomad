#!/usr/bin/env node

/**
 * Robust Fix for Failed Cities
 * Uses a simpler, more reliable approach to add cities
 * Avoids complex regex that fails on large files
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
const DELAY_MS = 100;

/**
 * Simple, reliable geocoding
 */
async function geocodeCity(city) {
  const query = `${city.name}, ${city.state || city.stateCode}`;
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
              name: city.name,
              state: city.state || '',
              stateCode: city.stateCode || '',
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: city.population || 50000,
              size: getSize(city.population || 50000),
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

function getSize(pop) {
  if (pop > 1000000) return 'major';
  if (pop > 250000) return 'medium';
  if (pop > 50000) return 'small';
  return 'village';
}

/**
 * Find insertion point using simple string search (more reliable than regex)
 */
async function findStateInsertionPoint(content, stateCode) {
  // Try multiple patterns to find the state code
  const patterns = [
    `code: '${stateCode}'`,
    `code: "${stateCode}"`,
    `code:'${stateCode}'`,
    `code:"${stateCode}"`
  ];
  
  let stateCodeIndex = -1;
  for (const pattern of patterns) {
    stateCodeIndex = content.indexOf(pattern);
    if (stateCodeIndex !== -1) break;
  }
  
  if (stateCodeIndex === -1) {
    return null;
  }
  
  // Find the start of this state object (go backwards to find opening brace)
  let stateStart = content.lastIndexOf('\n  {', stateCodeIndex);
  if (stateStart === -1) {
    stateStart = content.lastIndexOf('{', stateCodeIndex);
  }
  
  // Find the counties array start (should be after the code)
  let countiesIndex = content.indexOf('counties: [', stateCodeIndex);
  if (countiesIndex === -1) {
    return null;
  }
  
  // Find the end of this state section - simpler approach
  // Look for the closing brace of this state object (],\n for counties array, then },\n for state)
  let sectionEnd = content.length;
  
  // Try to find the end of this state object by looking for the pattern:
  // ],\n      },\n  (closing counties array, then closing state object)
  let testEnd = content.indexOf('],\n      },\n', countiesIndex);
  if (testEnd !== -1) {
    sectionEnd = testEnd + 13; // Include the closing pattern
  } else {
    // Fallback: look for next state start or end of file
    const nextStateStart = content.indexOf('\n  {', countiesIndex + 500);
    if (nextStateStart !== -1) {
      // Check if it's really a new state (has code: nearby)
      const nearbyCode = content.indexOf('code:', nextStateStart);
      if (nearbyCode !== -1 && nearbyCode < nextStateStart + 100) {
        // Find where current state ends (before next state)
        const beforeNext = content.lastIndexOf('},\n', nextStateStart);
        if (beforeNext > countiesIndex) {
          sectionEnd = beforeNext + 4;
        }
      }
    }
  }
  
  // Safety: ensure sectionEnd is reasonable
  if (sectionEnd < countiesIndex || sectionEnd > content.length) {
    sectionEnd = Math.min(countiesIndex + 50000, content.length); // Limit to 50k chars
  }
  
  return {
    start: countiesIndex,
    end: sectionEnd,
    section: content.substring(countiesIndex, sectionEnd),
    stateStart: stateStart,
    stateCodeIndex: stateCodeIndex
  };
}

/**
 * Find or create county within state section
 */
function findCountyInSection(section, countyName) {
  const countyPattern = `name: '${countyName.replace(/'/g, "\\'")}'`;
  const countyIndex = section.indexOf(countyPattern);
  
  if (countyIndex === -1) {
    return null; // County doesn't exist
  }
  
  // Find the cities array for this county
  let citiesStart = section.indexOf('cities: [', countyIndex);
  if (citiesStart === -1) {
    return null;
  }
  
  // Find the end of this county's cities array
  let citiesEnd = section.indexOf('],', citiesStart);
  if (citiesEnd === -1) {
    return null;
  }
  
  return {
    exists: true,
    citiesStart,
    citiesEnd: citiesEnd + 2, // Include '],'
    insertPoint: citiesEnd
  };
}

/**
 * State name mapping
 */
const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};

/**
 * Create a new state entry if it doesn't exist
 */
function createStateEntry(content, stateCode, stateName) {
  // Find where to insert (before the closing bracket of the array)
  const lastBracket = content.lastIndexOf('];');
  if (lastBracket === -1) {
    return null;
  }
  
  // Create the new state entry
  const newState = `  {
    name: '${stateName}',
    code: '${stateCode}',
    counties: [
    ],
  },
`;
  
  // Insert before the closing bracket
  const beforeClose = content.substring(0, lastBracket);
  const afterClose = content.substring(lastBracket);
  
  // Check if we need a comma after the previous entry
  const needsComma = beforeClose.trimEnd().endsWith('},') || beforeClose.trimEnd().endsWith('}');
  const insertion = needsComma ? `,\n${newState}` : `\n${newState}`;
  
  return beforeClose + insertion + afterClose;
}

/**
 * Add city using simple string manipulation (more reliable)
 */
async function addCityRobust(geocodedCity) {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  // Find state section
  let stateSection = await findStateInsertionPoint(content, geocodedCity.stateCode);
  
  // If state doesn't exist, create it
  if (!stateSection) {
    const stateName = STATE_NAMES[geocodedCity.stateCode] || geocodedCity.state;
    const updatedContent = createStateEntry(content, geocodedCity.stateCode, stateName);
    
    if (!updatedContent) {
      console.log(`   ⚠️  Could not create state ${geocodedCity.stateCode}`);
      return false;
    }
    
    content = updatedContent;
    console.log(`   ✅ Created state ${geocodedCity.stateCode}`);
    
    // Try again to find the state
    stateSection = await findStateInsertionPoint(content, geocodedCity.stateCode);
    if (!stateSection) {
      console.log(`   ⚠️  State ${geocodedCity.stateCode} still not found after creation`);
      return false;
    }
  }
  
  // Find county in section
  const countyInfo = findCountyInSection(stateSection.section, geocodedCity.county);
  
  const escapedName = geocodedCity.name.replace(/'/g, "\\'");
  const escapedState = geocodedCity.state.replace(/'/g, "\\'");
  const escapedCounty = geocodedCity.county.replace(/'/g, "\\'");
  
  const newCityEntry = `\n          { name: '${escapedName}', state: '${escapedState}', stateCode: '${geocodedCity.stateCode}', county: '${escapedCounty}', latitude: ${geocodedCity.latitude}, longitude: ${geocodedCity.longitude}, population: ${geocodedCity.population}, size: '${geocodedCity.size}', confidence: '${geocodedCity.confidence}' },`;
  
  if (countyInfo && countyInfo.exists) {
    // County exists - add city to it
    const before = stateSection.section.substring(0, countyInfo.insertPoint);
    const after = stateSection.section.substring(countyInfo.insertPoint);
    
    const updatedSection = before + newCityEntry + '\n        ' + after;
    
    // Replace in full content
    content = content.substring(0, stateSection.start) + 
              updatedSection + 
              content.substring(stateSection.end);
  } else {
    // Create new county - check if counties array is empty
    const isEmpty = stateSection.section.trim() === 'counties: [' || 
                    stateSection.section.match(/counties:\s*\[\s*\]/);
    
    const newCounty = `\n      {\n        name: '${escapedCounty}',\n        cities: [\n          { name: '${escapedName}', state: '${escapedState}', stateCode: '${geocodedCity.stateCode}', county: '${escapedCounty}', latitude: ${geocodedCity.latitude}, longitude: ${geocodedCity.longitude}, population: ${geocodedCity.population}, size: '${geocodedCity.size}', confidence: '${geocodedCity.confidence}' },\n        ],\n      }`;
    
    if (isEmpty) {
      // Empty array - insert directly
      const countiesIndex = stateSection.section.indexOf('counties: [');
      const afterBracket = stateSection.section.indexOf('[', countiesIndex) + 1;
      
      const updatedSection = stateSection.section.substring(0, afterBracket) + 
                            newCounty + '\n    ' +
                            stateSection.section.substring(afterBracket);
      
      content = content.substring(0, stateSection.start) + 
                updatedSection + 
                content.substring(stateSection.end);
    } else {
      // Find last county in state
      const lastCountyMatch = stateSection.section.match(/(name:\s*['"][^'"]+['"][\s\S]*?cities:\s*\[[\s\S]*?\][\s\S]*?\},)/);
      
      if (lastCountyMatch) {
        const insertAfter = lastCountyMatch.index + lastCountyMatch[0].length;
        const updatedSection = stateSection.section.substring(0, insertAfter) + 
                              ',' + newCounty + 
                              stateSection.section.substring(insertAfter);
        
        content = content.substring(0, stateSection.start) + 
                  updatedSection + 
                  content.substring(stateSection.end);
      } else {
        return false;
      }
    }
  }
  
  await fs.writeFile(filePath, content);
  return true;
}

/**
 * Verify which states exist in the file
 */
async function verifyStates(content) {
  const stateCodes = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
  const existing = [];
  const missing = [];
  
  for (const code of stateCodes) {
    const patterns = [`code: '${code}'`, `code: "${code}"`, `code:'${code}'`, `code:"${code}"`];
    const found = patterns.some(p => content.indexOf(p) !== -1);
    if (found) {
      existing.push(code);
    } else {
      missing.push(code);
    }
  }
  
  console.log(`\n📋 State Verification:`);
  console.log(`   ✅ Found: ${existing.length} states`);
  if (missing.length > 0) {
    console.log(`   ⚠️  Missing: ${missing.length} states (${missing.join(', ')})`);
  }
  
  return { existing, missing };
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Robust Fix for Failed Cities');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  // Verify states exist first
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
    await verifyStates(content);
  } catch (error) {
    console.error('❌ Could not read cities file:', error.message);
    return;
  }
  
  // Load failed cities
  const failedPath = path.join(__dirname, '..', 'data', 'failed-cities-to-retry.json');
  let failedCities = [];
  
  try {
    const failedData = JSON.parse(await fs.readFile(failedPath, 'utf8'));
    failedCities = Array.isArray(failedData) ? failedData : (failedData.cities || []);
  } catch (error) {
    console.log('❌ Could not load failed cities file');
    return;
  }
  
  console.log(`\n📊 Found ${failedCities.length} failed cities to retry`);
  
  const stats = { geocoded: 0, added: 0, failed: 0 };
  
  for (let i = 0; i < failedCities.length; i++) {
    const city = failedCities[i];
    console.log(`\n[${i + 1}/${failedCities.length}] Processing ${city.name}, ${city.stateCode}...`);
    
    try {
      const geocoded = await geocodeCity(city);
      if (geocoded) {
        stats.geocoded++;
        console.log(`   ✅ Geocoded: ${geocoded.county}`);
        
        const added = await addCityRobust(geocoded);
        if (added) {
          stats.added++;
          console.log(`   ✅ Added to database`);
        } else {
          stats.failed++;
          console.log(`   ⚠️  Failed to add`);
        }
      } else {
        stats.failed++;
        console.log(`   ❌ Geocoding failed`);
      }
      
      if (i < failedCities.length - 1) {
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
  console.log(`   Total processed: ${failedCities.length}`);
  console.log(`   Successfully geocoded: ${stats.geocoded}`);
  console.log(`   Successfully added: ${stats.added}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Success rate: ${((stats.added / failedCities.length) * 100).toFixed(1)}%`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { geocodeCity, addCityRobust };
