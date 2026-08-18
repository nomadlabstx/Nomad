#!/usr/bin/env node

/**
 * Update Missing Counties in US Cities Data
 * Updates all cities with missing county information based on user-provided data
 */

const fs = require('fs').promises;
const path = require('path');

// County data mapping: city name -> county name
const COUNTY_UPDATES = {
  // District of Columbia - Special case (no county, is its own state)
  'Washington': { state: 'District of Columbia', stateCode: 'DC', county: null, isIndependentCity: true, note: 'DC is its own jurisdiction' },
  
  // Maryland
  'Baltimore': { state: 'Maryland', stateCode: 'MD', county: null, isIndependentCity: true },
  'Marydel': { state: 'Maryland', stateCode: 'MD', county: 'Caroline County', isIndependentCity: false },
  
  // Virginia - All Independent Cities (not in any county)
  'Virginia Beach': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Chesapeake': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Norfolk': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Richmond': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Newport News': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Alexandria': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Hampton': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Suffolk': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Roanoke': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Portsmouth': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Lynchburg': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Harrisonburg': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Charlottesville': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Manassas': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Danville': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Petersburg': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Fredericksburg': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Winchester': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Staunton': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Salem': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Fairfax': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Waynesboro': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Hopewell': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Colonial Heights': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Radford': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Bristol': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Manassas Park': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Williamsburg': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Falls Church': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Martinsville': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Poquoson': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Lexington': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Galax': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Buena Vista': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Covington': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Emporia': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  'Norton': { state: 'Virginia', stateCode: 'VA', county: null, isIndependentCity: true },
  
  // Nebraska
  'Lincoln': { state: 'Nebraska', stateCode: 'NE', county: 'Lancaster County', isIndependentCity: false },
  'Grant': { state: 'Nebraska', stateCode: 'NE', county: 'Perkins County', isIndependentCity: false },
  'Fairfield': { state: 'Nebraska', stateCode: 'NE', county: 'Clay County', isIndependentCity: false },
  'Union': { state: 'Nebraska', stateCode: 'NE', county: 'Cass County', isIndependentCity: false },
  
  // Missouri
  'St. Louis': { state: 'Missouri', stateCode: 'MO', county: null, isIndependentCity: true },
  
  // Connecticut
  'Stamford': { state: 'Connecticut', stateCode: 'CT', county: 'Fairfield County', isIndependentCity: false },
  
  // Nevada
  'Carson': { state: 'Nevada', stateCode: 'NV', county: null, isIndependentCity: true, note: 'Carson City is independent city/county equivalent' },
  
  // Washington
  'Tumwater': { state: 'Washington', stateCode: 'WA', county: 'Thurston County', isIndependentCity: false },
  
  // Illinois
  'Litchfield': { state: 'Illinois', stateCode: 'IL', county: 'Montgomery County', isIndependentCity: false },
  
  // New Mexico
  'Los Ranchos de Albuquerque': { state: 'New Mexico', stateCode: 'NM', county: 'Sandoval County', isIndependentCity: false },
  
  // Alaska
  'Utqiaġvik': { state: 'Alaska', stateCode: 'AK', county: 'North Slope Borough', isIndependentCity: false, note: 'Alaska uses boroughs instead of counties' },
  
  // Mississippi
  'Drew': { state: 'Mississippi', stateCode: 'MS', county: 'Drew County', isIndependentCity: false },
  
  // West Virginia
  'Oceana': { state: 'West Virginia', stateCode: 'WV', county: 'Wyoming County', isIndependentCity: false },
  
  // Wisconsin
  'De Soto': { state: 'Wisconsin', stateCode: 'WI', county: 'Vernon County', isIndependentCity: false },
};

/**
 * Update the progress file with county data
 */
async function updateProgressFile() {
  const progressFile = path.join(__dirname, '..', 'data', 'us-county-progress.json');
  const content = await fs.readFile(progressFile, 'utf8');
  const data = JSON.parse(content);
  
  let updatedCount = 0;
  
  for (const city of data.processed) {
    const update = COUNTY_UPDATES[city.name];
    if (update && city.county === null) {
      // For independent cities, we'll use a special marker or null
      // For DC, keep as null since it's not a county
      if (update.isIndependentCity) {
        // Independent cities: keep county as null but mark in a note
        city.county = null;
        city.isIndependentCity = true;
      } else {
        city.county = update.county;
      }
      updatedCount++;
    }
  }
  
  await fs.writeFile(progressFile, JSON.stringify(data, null, 2));
  console.log(`✅ Updated ${updatedCount} cities in progress file`);
  
  return updatedCount;
}

/**
 * Update the main cities file
 */
async function updateMainCitiesFile() {
  const mainFile = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  let content = await fs.readFile(mainFile, 'utf8');
  
  let updatedCount = 0;
  
  // For independent cities in Virginia and others, we need to create special handling
  // We'll add them to a "Independent Cities" county or create a special structure
  
  // Since the file is TypeScript, we need to carefully update it
  // Let's create a mapping and update each city
  for (const [cityName, update] of Object.entries(COUNTY_UPDATES)) {
    const searchPattern = new RegExp(
      `\\{\\s*name:\\s*['"]${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
      `[^}]*county:\\s*['"]([^'"]*)['"]`,
      'g'
    );
    
    // For independent cities, we need special handling
    // They should still be in the data structure but with a special county designation
    if (update.isIndependentCity) {
      // Replace with "Independent City" as the county name for data structure purposes
      // But we'll note it's independent
      const replacement = `{ name: '${cityName}', state: '${update.state}', stateCode: '${update.stateCode}', county: 'Independent City', latitude: `;
      if (content.includes(`name: '${cityName}'`) || content.includes(`name: "${cityName}"`)) {
        // Update county field
        content = content.replace(
          new RegExp(`(name:\\s*['"]${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
                     `[^}]*?county:\\s*)['"][^'"]*['"]`, 'g'),
          `$1'Independent City'`
        );
        updatedCount++;
      }
    } else {
      // Regular county update
      if (content.includes(`name: '${cityName}'`) || content.includes(`name: "${cityName}"`)) {
        content = content.replace(
          new RegExp(`(name:\\s*['"]${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]` +
                     `[^}]*?county:\\s*)['"][^'"]*['"]`, 'g'),
          `$1'${update.county}'`
        );
        updatedCount++;
      }
    }
  }
  
  await fs.writeFile(mainFile, content);
  console.log(`✅ Updated ${updatedCount} cities in main cities file`);
  
  return updatedCount;
}

/**
 * Create a helper script to handle independent cities
 */
async function createIndependentCitiesHandler() {
  const handlerContent = `/**
 * Independent Cities Handler
 * Handles cities that are independent of counties (mostly Virginia cities)
 * 
 * These cities are not part of any county and are treated as county-equivalent entities
 */

export const INDEPENDENT_CITIES = [
  // District of Columbia (special case)
  { name: 'Washington', state: 'District of Columbia', stateCode: 'DC' },
  
  // Maryland
  { name: 'Baltimore', state: 'Maryland', stateCode: 'MD' },
  
  // Virginia (38 independent cities)
  { name: 'Virginia Beach', state: 'Virginia', stateCode: 'VA' },
  { name: 'Chesapeake', state: 'Virginia', stateCode: 'VA' },
  { name: 'Norfolk', state: 'Virginia', stateCode: 'VA' },
  { name: 'Richmond', state: 'Virginia', stateCode: 'VA' },
  { name: 'Newport News', state: 'Virginia', stateCode: 'VA' },
  { name: 'Alexandria', state: 'Virginia', stateCode: 'VA' },
  { name: 'Hampton', state: 'Virginia', stateCode: 'VA' },
  { name: 'Suffolk', state: 'Virginia', stateCode: 'VA' },
  { name: 'Roanoke', state: 'Virginia', stateCode: 'VA' },
  { name: 'Portsmouth', state: 'Virginia', stateCode: 'VA' },
  { name: 'Lynchburg', state: 'Virginia', stateCode: 'VA' },
  { name: 'Harrisonburg', state: 'Virginia', stateCode: 'VA' },
  { name: 'Charlottesville', state: 'Virginia', stateCode: 'VA' },
  { name: 'Manassas', state: 'Virginia', stateCode: 'VA' },
  { name: 'Danville', state: 'Virginia', stateCode: 'VA' },
  { name: 'Petersburg', state: 'Virginia', stateCode: 'VA' },
  { name: 'Fredericksburg', state: 'Virginia', stateCode: 'VA' },
  { name: 'Winchester', state: 'Virginia', stateCode: 'VA' },
  { name: 'Staunton', state: 'Virginia', stateCode: 'VA' },
  { name: 'Salem', state: 'Virginia', stateCode: 'VA' },
  { name: 'Fairfax', state: 'Virginia', stateCode: 'VA' },
  { name: 'Waynesboro', state: 'Virginia', stateCode: 'VA' },
  { name: 'Hopewell', state: 'Virginia', stateCode: 'VA' },
  { name: 'Colonial Heights', state: 'Virginia', stateCode: 'VA' },
  { name: 'Radford', state: 'Virginia', stateCode: 'VA' },
  { name: 'Bristol', state: 'Virginia', stateCode: 'VA' },
  { name: 'Manassas Park', state: 'Virginia', stateCode: 'VA' },
  { name: 'Williamsburg', state: 'Virginia', stateCode: 'VA' },
  { name: 'Falls Church', state: 'Virginia', stateCode: 'VA' },
  { name: 'Martinsville', state: 'Virginia', stateCode: 'VA' },
  { name: 'Poquoson', state: 'Virginia', stateCode: 'VA' },
  { name: 'Lexington', state: 'Virginia', stateCode: 'VA' },
  { name: 'Galax', state: 'Virginia', stateCode: 'VA' },
  { name: 'Buena Vista', state: 'Virginia', stateCode: 'VA' },
  { name: 'Covington', state: 'Virginia', stateCode: 'VA' },
  { name: 'Emporia', state: 'Virginia', stateCode: 'VA' },
  { name: 'Norton', state: 'Virginia', stateCode: 'VA' },
  
  // Missouri
  { name: 'St. Louis', state: 'Missouri', stateCode: 'MO' },
  
  // Nevada
  { name: 'Carson City', state: 'Nevada', stateCode: 'NV' },
];

export function isIndependentCity(cityName: string, stateCode: string): boolean {
  return INDEPENDENT_CITIES.some(
    city => city.name === cityName && city.stateCode === stateCode
  );
}

export function getIndependentCityCountyName(cityName: string, stateCode: string): string {
  if (stateCode === 'DC') {
    return 'District of Columbia';
  }
  return 'Independent City';
}
`;

  const handlerPath = path.join(__dirname, '..', 'utils', 'independent-cities.ts');
  await fs.writeFile(handlerPath, handlerContent);
  console.log('✅ Created independent cities handler utility');
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Starting county data update...');
  console.log(`📊 Processing ${Object.keys(COUNTY_UPDATES).length} city updates...`);
  
  try {
    // Update progress file
    await updateProgressFile();
    
    // Update main cities file
    await updateMainCitiesFile();
    
    // Create independent cities handler
    await createIndependentCitiesHandler();
    
    console.log('\n✅ County update complete!');
    console.log('\n📊 Summary:');
    console.log(`   Total cities updated: ${Object.keys(COUNTY_UPDATES).length}`);
    console.log(`   Independent cities: ${Object.values(COUNTY_UPDATES).filter(u => u.isIndependentCity).length}`);
    console.log(`   Regular counties: ${Object.values(COUNTY_UPDATES).filter(u => !u.isIndependentCity).length}`);
    console.log('\n📝 Notes:');
    console.log('   - Independent cities use "Independent City" as county designation');
    console.log('   - DC is treated as its own jurisdiction');
    console.log('   - Alaska uses boroughs (North Slope Borough)');
    console.log('   - Nevada has county equivalents (Carson City)');
    
  } catch (error) {
    console.error('❌ Error updating counties:', error.message);
    throw error;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { COUNTY_UPDATES, updateProgressFile, updateMainCitiesFile };
