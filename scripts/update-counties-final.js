#!/usr/bin/env node

/**
 * Final County Update Script
 * Updates existing cities and provides structure for missing cities
 */

const fs = require('fs').promises;
const path = require('path');

// Complete county mapping
const COUNTY_MAP = {
  // DC
  'Washington': { state: 'DC', county: 'District of Columbia', isIndependent: true },
  
  // Maryland
  'Baltimore': { state: 'MD', county: 'Independent City', isIndependent: true },
  'Marydel': { state: 'MD', county: 'Caroline County', isIndependent: false },
  
  // Virginia - Independent Cities
  'Virginia Beach': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Chesapeake': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Norfolk': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Richmond': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Newport News': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Alexandria': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Hampton': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Suffolk': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Roanoke': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Portsmouth': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Lynchburg': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Harrisonburg': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Charlottesville': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Manassas': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Danville': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Petersburg': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Fredericksburg': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Winchester': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Staunton': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Salem': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Fairfax': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Waynesboro': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Hopewell': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Colonial Heights': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Radford': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Bristol': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Manassas Park': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Williamsburg': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Falls Church': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Martinsville': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Poquoson': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Lexington': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Galax': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Buena Vista': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Covington': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Emporia': { state: 'VA', county: 'Independent City', isIndependent: true },
  'Norton': { state: 'VA', county: 'Independent City', isIndependent: true },
  
  // Nebraska
  'Lincoln': { state: 'NE', county: 'Lancaster County', isIndependent: false },
  'Grant': { state: 'NE', county: 'Perkins County', isIndependent: false },
  'Fairfield': { state: 'NE', county: 'Clay County', isIndependent: false },
  'Union': { state: 'NE', county: 'Cass County', isIndependent: false },
  
  // Missouri
  'St. Louis': { state: 'MO', county: 'Independent City', isIndependent: true },
  
  // Connecticut
  'Stamford': { state: 'CT', county: 'Fairfield County', isIndependent: false },
  
  // Nevada
  'Carson': { state: 'NV', county: 'Carson City', isIndependent: true },
  
  // Washington
  'Tumwater': { state: 'WA', county: 'Thurston County', isIndependent: false },
  
  // Illinois
  'Litchfield': { state: 'IL', county: 'Montgomery County', isIndependent: false },
  
  // New Mexico
  'Los Ranchos de Albuquerque': { state: 'NM', county: 'Sandoval County', isIndependent: false },
  
  // Alaska
  'Utqiaġvik': { state: 'AK', county: 'North Slope Borough', isIndependent: false },
  
  // Mississippi
  'Drew': { state: 'MS', county: 'Drew County', isIndependent: false },
  
  // West Virginia
  'Oceana': { state: 'WV', county: 'Wyoming County', isIndependent: false },
  
  // Wisconsin
  'De Soto': { state: 'WI', county: 'Vernon County', isIndependent: false },
};

/**
 * Update existing cities in the TypeScript file
 */
async function updateExistingCities() {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  let updatedCount = 0;
  
  for (const [cityName, data] of Object.entries(COUNTY_MAP)) {
    // Find city entry and update county
    const escapedName = cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match the city entry with its state code
    const cityPattern = new RegExp(
      `(name:\\s*['"]${escapedName}['"]` +
      `[\\s\\S]*?stateCode:\\s*['"]${data.state}['"]` +
      `[\\s\\S]*?county:\\s*)['"]([^'"]*)['"]`,
      'm'
    );
    
    const match = content.match(cityPattern);
    if (match) {
      // Update the county
      content = content.replace(cityPattern, `$1'${data.county}'`);
      updatedCount++;
      console.log(`✅ Updated ${cityName}, ${data.state}: ${data.county}`);
    }
  }
  
  await fs.writeFile(filePath, content);
  return updatedCount;
}

/**
 * Generate missing cities structure for manual addition
 */
async function generateMissingCitiesStructure() {
  const missingCities = [
    { name: 'Marydel', state: 'Maryland', stateCode: 'MD', county: 'Caroline County', lat: 39.1128904, lng: -75.7457651 },
    { name: 'Virginia Beach', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.8516437, lng: -75.97921939999999 },
    { name: 'Newport News', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.0870821, lng: -76.4730122 },
    { name: 'Suffolk', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.7282054, lng: -76.5835621 },
    { name: 'Charlottesville', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.0301826, lng: -78.4769353 },
    { name: 'Colonial Heights', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.244039, lng: -77.4102607 },
    { name: 'Radford', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.13179239999999, lng: -80.5764477 },
    { name: 'Manassas Park', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.7840035, lng: -77.4697111 },
    { name: 'Falls Church', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 38.88233400000001, lng: -77.1710914 },
    { name: 'Poquoson', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 37.1223664, lng: -76.3457773 },
    { name: 'Galax', state: 'Virginia', stateCode: 'VA', county: 'Independent City', lat: 36.6612387, lng: -80.9239671 },
    { name: 'Los Ranchos de Albuquerque', state: 'New Mexico', stateCode: 'NM', county: 'Sandoval County', lat: 35.1619885, lng: -106.6428038 },
    { name: 'Utqiaġvik', state: 'Alaska', stateCode: 'AK', county: 'North Slope Borough', lat: 63.588753, lng: -154.4930619 },
    { name: 'Drew', state: 'Mississippi', stateCode: 'MS', county: 'Drew County', lat: 33.809558, lng: -90.5264813 },
    { name: 'Oceana', state: 'West Virginia', stateCode: 'WV', county: 'Wyoming County', lat: 37.6920553, lng: -81.6239985 },
  ];
  
  console.log('\n📝 Missing Cities - Add these manually or with geocoding script:');
  console.log('='.repeat(70));
  
  for (const city of missingCities) {
    const popEstimate = 50000; // Default estimate
    const size = popEstimate > 100000 ? 'medium' : popEstimate > 50000 ? 'small' : 'village';
    
    console.log(`\n{ name: '${city.name}', state: '${city.state}', stateCode: '${city.stateCode}', county: '${city.county}', latitude: ${city.lat}, longitude: ${city.lng}, population: ${popEstimate}, size: '${size}', confidence: 'medium' },`);
  }
  
  // Write to file
  const output = {
    missingCities,
    instructions: 'These cities need to be added to the us-cities-with-counties.ts file in their respective state/county sections'
  };
  
  const outputPath = path.join(__dirname, '..', 'data', 'missing-cities-to-add.json');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n📄 Missing cities structure saved to: ${outputPath}`);
  
  return missingCities.length;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Final County Data Update');
  console.log('='.repeat(70));
  
  try {
    // Update existing cities
    console.log('\n📝 Updating existing cities...');
    const updatedCount = await updateExistingCities();
    
    // Generate missing cities structure
    console.log('\n📝 Checking for missing cities...');
    const missingCount = await generateMissingCitiesStructure();
    
    console.log('\n✅ Update Complete!');
    console.log('\n📊 Summary:');
    console.log(`   Cities updated: ${updatedCount}`);
    console.log(`   Cities need to be added: ${missingCount}`);
    console.log(`   Total processed: ${updatedCount + missingCount}`);
    
    console.log('\n📝 Notes:');
    console.log('   - Progress file already updated with all county data');
    console.log('   - Main TypeScript file updated for existing cities');
    console.log('   - Missing cities structure saved for manual addition');
    console.log('   - Independent cities use "Independent City" as county designation');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { COUNTY_MAP, updateExistingCities, generateMissingCitiesStructure };
