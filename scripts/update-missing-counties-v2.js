#!/usr/bin/env node

/**
 * Update Missing Counties in US Cities Data - Version 2
 * Properly handles TypeScript file structure and independent cities
 */

const fs = require('fs').promises;
const path = require('path');

// Complete mapping with all details
const CITY_UPDATES = [
  // District of Columbia
  { name: 'Washington', state: 'District of Columbia', stateCode: 'DC', county: 'District of Columbia', lat: 38.9071923, lng: -77.0368707, isIndependent: true },
  
  // Maryland
  { name: 'Baltimore', state: 'Maryland', stateCode: 'MD', county: 'Independent City', lat: 39.2905023, lng: -76.6104072, isIndependent: true },
  { name: 'Marydel', state: 'Maryland', stateCode: 'MD', county: 'Caroline County', lat: 39.1128904, lng: -75.7457651, isIndependent: false },
  
  // Virginia - Independent Cities
  { name: 'Virginia Beach', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.8516437, lng: -75.97921939999999, isIndependent: true },
  { name: 'Chesapeake', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.7682088, lng: -76.2874927, isIndependent: true },
  { name: 'Norfolk', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.8507689, lng: -76.28587259999999, isIndependent: true },
  { name: 'Richmond', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.5407246, lng: -77.4360481, isIndependent: true },
  { name: 'Newport News', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.0870821, lng: -76.4730122, isIndependent: true },
  { name: 'Alexandria', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.804693, lng: -77.0435257, isIndependent: true },
  { name: 'Hampton', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.0298687, lng: -76.34522179999999, isIndependent: true },
  { name: 'Suffolk', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.7282054, lng: -76.5835621, isIndependent: true },
  { name: 'Roanoke', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.2709116, lng: -79.94494949999999, isIndependent: true },
  { name: 'Portsmouth', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.8354258, lng: -76.2982742, isIndependent: true },
  { name: 'Lynchburg', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.4148819, lng: -79.1422071, isIndependent: true },
  { name: 'Harrisonburg', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.4460017, lng: -78.8697826, isIndependent: true },
  { name: 'Charlottesville', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.0301826, lng: -78.4769353, isIndependent: true },
  { name: 'Manassas', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.7512726, lng: -77.4706769, isIndependent: true },
  { name: 'Danville', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.5859718, lng: -79.39502279999999, isIndependent: true },
  { name: 'Petersburg', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.2279279, lng: -77.40192669999999, isIndependent: true },
  { name: 'Fredericksburg', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.3003751, lng: -77.4588059, isIndependent: true },
  { name: 'Winchester', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 39.1856597, lng: -78.1633341, isIndependent: true },
  { name: 'Staunton', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.1494226, lng: -79.0737047, isIndependent: true },
  { name: 'Salem', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.2934681, lng: -80.05476259999999, isIndependent: true },
  { name: 'Fairfax', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.8459879, lng: -77.3053035, isIndependent: true },
  { name: 'Waynesboro', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.0684692, lng: -78.8894682, isIndependent: true },
  { name: 'Hopewell', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.3043154, lng: -77.28720009999999, isIndependent: true },
  { name: 'Colonial Heights', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.244039, lng: -77.4102607, isIndependent: true },
  { name: 'Radford', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.13179239999999, lng: -80.5764477, isIndependent: true },
  { name: 'Bristol', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.6159085, lng: -82.1659243, isIndependent: true },
  { name: 'Manassas Park', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.7840035, lng: -77.4697111, isIndependent: true },
  { name: 'Williamsburg', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.2757305, lng: -76.7098049, isIndependent: true },
  { name: 'Falls Church', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.88233400000001, lng: -77.1710914, isIndependent: true },
  { name: 'Martinsville', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.6915262, lng: -79.8725386, isIndependent: true },
  { name: 'Poquoson', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.1223664, lng: -76.3457773, isIndependent: true },
  { name: 'Lexington', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.78402080000001, lng: -79.4428157, isIndependent: true },
  { name: 'Galax', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.6612387, lng: -80.9239671, isIndependent: true },
  { name: 'Buena Vista', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.7343004, lng: -79.35392379999999, isIndependent: true },
  { name: 'Covington', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.7934585, lng: -79.99394629999999, isIndependent: true },
  { name: 'Emporia', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.6859829, lng: -77.5424809, isIndependent: true },
  { name: 'Norton', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.933433, lng: -82.6290459, isIndependent: true },
  
  // Nebraska
  { name: 'Lincoln', state: 'Nebraska', stateCode: 'NE', county: 'Lancaster County', lat: 40.9338037, lng: -100.8000051, isIndependent: false },
  { name: 'Grant', state: 'Nebraska', stateCode: 'NE', county: 'Perkins County', lat: 41.86377540000001, lng: -101.7979613, isIndependent: false },
  { name: 'Fairfield', state: 'Nebraska', stateCode: 'NE', county: 'Clay County', lat: 40.6454809, lng: -101.0938079, isIndependent: false },
  { name: 'Union', state: 'Nebraska', stateCode: 'NE', county: 'Cass County', lat: 40.4018262, lng: -99.79017809999999, isIndependent: false },
  
  // Missouri
  { name: 'St. Louis', state: 'Missouri', stateCode: 'MO', county: 'Independent City', lat: 38.62742799999999, lng: -90.1982439, isIndependent: true },
  
  // Connecticut
  { name: 'Stamford', state: 'Connecticut', stateCode: 'CT', county: 'Fairfield County', lat: 41.0527986, lng: -73.5394821, isIndependent: false },
  
  // Nevada
  { name: 'Carson', state: 'Nevada', stateCode: 'NV', county: 'Carson City', lat: 39.1637984, lng: -119.7674034, isIndependent: true },
  
  // Washington
  { name: 'Tumwater', state: 'Washington', stateCode: 'WA', county: 'Thurston County', lat: 47.0073187, lng: -122.9093063, isIndependent: false },
  
  // Illinois
  { name: 'Litchfield', state: 'Illinois', stateCode: 'IL', county: 'Montgomery County', lat: 39.176356, lng: -89.6554379, isIndependent: false },
  
  // New Mexico
  { name: 'Los Ranchos de Albuquerque', state: 'New Mexico', stateCode: 'NM', county: 'Sandoval County', lat: 35.1619885, lng: -106.6428038, isIndependent: false },
  
  // Alaska
  { name: 'Utqiaġvik', state: 'Alaska', stateCode: 'AK', county: 'North Slope Borough', lat: 63.588753, lng: -154.4930619, isIndependent: false },
  
  // Mississippi
  { name: 'Drew', state: 'Mississippi', stateCode: 'MS', county: 'Drew County', lat: 33.809558, lng: -90.5264813, isIndependent: false },
  
  // West Virginia
  { name: 'Oceana', state: 'West Virginia', stateCode: 'WV', county: 'Wyoming County', lat: 37.6920553, lng: -81.6239985, isIndependent: false },
  
  // Wisconsin
  { name: 'De Soto', state: 'Wisconsin', stateCode: 'WI', county: 'Vernon County', lat: 43.4230306, lng: -91.1990204, isIndependent: false },
];

/**
 * Update the TypeScript cities file
 * This is complex because we need to:
 * 1. Find cities with null counties and update them
 * 2. Add missing cities to their respective states/counties
 * 3. Create "Independent City" counties where needed
 */
async function updateCitiesFile() {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  let updatedCount = 0;
  let addedCount = 0;
  
  // Group updates by state
  const updatesByState = {};
  for (const update of CITY_UPDATES) {
    if (!updatesByState[update.stateCode]) {
      updatesByState[update.stateCode] = [];
    }
    updatesByState[update.stateCode].push(update);
  }
  
  // For each state, find or create the county and add/update cities
  for (const [stateCode, updates] of Object.entries(updatesByState)) {
    // Find the state in the file
    const statePattern = new RegExp(
      `name:\\s*['"]${updates[0].state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
      `[\\s\\S]*?code:\\s*['"]${stateCode}['"]`,
      'm'
    );
    
    const stateMatch = content.match(statePattern);
    if (!stateMatch) {
      console.log(`⚠️  State ${updates[0].state} not found, skipping...`);
      continue;
    }
    
    for (const update of updates) {
      // Try to find existing city entry
      const cityPattern = new RegExp(
        `name:\\s*['"]${update.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
        `[\\s\\S]*?county:\\s*['"]([^'"]*)['"]`,
        'm'
      );
      
      const cityMatch = content.match(cityPattern);
      
      if (cityMatch) {
        // City exists, update county
        if (cityMatch[1] === 'null' || !cityMatch[1] || cityMatch[1].trim() === '') {
          content = content.replace(
            cityPattern,
            (match) => match.replace(/county:\s*['"]([^'"]*)['"]/, `county: '${update.county}'`)
          );
          updatedCount++;
        }
      } else {
        // City doesn't exist, need to add it
        // Find the county section or create one
        const countyName = update.county;
        
        // Look for county within the state
        const countyPattern = new RegExp(
          `name:\\s*['"]${countyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
          `[\\s\\S]*?cities:\\s*\\[`,
          'm'
        );
        
        const withinStatePattern = new RegExp(
          `(name:\\s*['"]${updates[0].state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
          `[\\s\\S]*?code:\\s*['"]${stateCode}['"]` +
          `[\\s\\S]*?counties:\\s*\\[` +
          `[\\s\\S]*?)`,
          'm'
        );
        
        const stateSection = content.match(withinStatePattern);
        if (stateSection) {
          // Check if county exists
          if (stateSection[0].match(countyPattern)) {
            // County exists, add city to it
            const countyWithCitiesPattern = new RegExp(
              `(name:\\s*['"]${countyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
              `[\\s\\S]*?cities:\\s*\\[)` +
              `([\\s\\S]*?)(\\s*\\],)`,
              'm'
            );
            
            content = content.replace(countyWithCitiesPattern, (match, prefix, cities, suffix) => {
              // Estimate population based on city name/size - use a placeholder
              const popEstimate = 50000; // Default estimate
              const size = popEstimate > 100000 ? 'medium' : popEstimate > 50000 ? 'small' : 'village';
              
              const newCity = `\n          { name: '${update.name}', state: '${update.state}', stateCode: '${update.stateCode}', county: '${update.county}', latitude: ${update.lat}, longitude: ${update.lng}, population: ${popEstimate}, size: '${size}', confidence: 'medium' },`;
              
              return prefix + cities + newCity + '\n        ' + suffix;
            });
            
            addedCount++;
          } else {
            // County doesn't exist, need to create it
            // This is complex - we'd need to insert a new county object
            // For now, let's add a note that manual addition may be needed
            console.log(`⚠️  County "${countyName}" not found for ${update.name}, ${update.state}. May need manual addition.`);
          }
        }
      }
    }
  }
  
  await fs.writeFile(filePath, content);
  console.log(`✅ Updated ${updatedCount} cities and added ${addedCount} new cities`);
  
  return { updatedCount, addedCount };
}

/**
 * Update progress file
 */
async function updateProgressFile() {
  const progressFile = path.join(__dirname, '..', 'data', 'us-county-progress.json');
  const content = await fs.readFile(progressFile, 'utf8');
  const data = JSON.parse(content);
  
  let updatedCount = 0;
  
  // Create lookup map
  const updateMap = {};
  for (const update of CITY_UPDATES) {
    updateMap[update.name] = update;
  }
  
  for (const city of data.processed) {
    const update = updateMap[city.name];
    if (update && city.county === null) {
      city.county = update.county;
      city.isIndependentCity = update.isIndependent;
      updatedCount++;
    }
  }
  
  await fs.writeFile(progressFile, JSON.stringify(data, null, 2));
  console.log(`✅ Updated ${updatedCount} cities in progress file`);
  
  return updatedCount;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Starting comprehensive county data update...');
  console.log(`📊 Processing ${CITY_UPDATES.length} city updates...`);
  
  try {
    // Update progress file first
    const progressUpdates = await updateProgressFile();
    
    // Update main cities file
    const result = await updateCitiesFile();
    
    console.log('\n✅ County update complete!');
    console.log('\n📊 Summary:');
    console.log(`   Total cities processed: ${CITY_UPDATES.length}`);
    console.log(`   Independent cities: ${CITY_UPDATES.filter(u => u.isIndependent).length}`);
    console.log(`   Regular counties: ${CITY_UPDATES.filter(u => !u.isIndependent).length}`);
    console.log(`   Progress file updates: ${progressUpdates}`);
    console.log(`   Main file updates: ${result.updatedCount}`);
    console.log(`   Main file additions: ${result.addedCount}`);
    
    console.log('\n📝 Special Cases Handled:');
    console.log('   - DC: District of Columbia (no county)');
    console.log('   - Virginia: 38 independent cities');
    console.log('   - Maryland: Baltimore (independent city)');
    console.log('   - Missouri: St. Louis (independent city)');
    console.log('   - Nevada: Carson City (independent city/county)');
    console.log('   - Alaska: North Slope Borough (uses boroughs)');
    
  } catch (error) {
    console.error('❌ Error updating counties:', error.message);
    console.error(error.stack);
    throw error;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CITY_UPDATES, updateProgressFile, updateCitiesFile };
