/**
 * Fix Connecticut to only have the 9 official planning regions
 */

const fs = require('fs');
const path = require('path');

const ctFile = path.join(__dirname, '../data/us-states-json/ct-cities.json');

console.log('🔧 Fixing Connecticut to 9 Planning Regions');
console.log('============================================\n');

const ct = JSON.parse(fs.readFileSync(ctFile, 'utf8'));

// The 9 official Connecticut planning regions
const officialRegions = [
  'Capitol Planning Region',
  'Naugatuck Valley Planning Region',
  'Northeastern Connecticut Planning Region',
  'Northwest Hills Planning Region',
  'Western Connecticut Planning Region',
  'Southeastern Connecticut Planning Region',
  'Lower Connecticut River Valley Planning Region',
  'South Central Connecticut Planning Region',
  'Greater Bridgeport Planning Region'
];

// County to planning region mapping (approximate)
const countyToRegion = {
  'Hartford': 'Capitol Planning Region',
  'Litchfield': 'Northwest Hills Planning Region',
  'Middlesex': 'Lower Connecticut River Valley Planning Region',
  'New Haven': 'South Central Connecticut Planning Region',
  'Fairfield': 'Western Connecticut Planning Region',
  'New London': 'Southeastern Connecticut Planning Region',
  'Tolland': 'Northeastern Connecticut Planning Region',
  'Windham': 'Northeastern Connecticut Planning Region'
};

// Create map of official regions
const regionMap = new Map();
for (const regionName of officialRegions) {
  regionMap.set(regionName, {
    name: regionName,
    cities: []
  });
}

// Process all counties
for (const county of ct.counties) {
  let targetRegion = null;
  
  // Check if it's already a planning region
  if (officialRegions.includes(county.name)) {
    targetRegion = county.name;
  } else {
    // Try to map county name to planning region
    for (const [countyName, regionName] of Object.entries(countyToRegion)) {
      if (county.name.includes(countyName)) {
        targetRegion = regionName;
        break;
      }
    }
    
    // If no mapping found, skip "Unknown" entries
    if (!targetRegion && county.name !== 'Unknown') {
      // Try to find by city data
      for (const city of county.cities) {
        if (city.county) {
          for (const [countyName, regionName] of Object.entries(countyToRegion)) {
            if (city.county.includes(countyName)) {
              targetRegion = regionName;
              break;
            }
          }
          if (targetRegion) break;
        }
      }
    }
  }
  
  if (targetRegion && regionMap.has(targetRegion)) {
    const region = regionMap.get(targetRegion);
    region.cities.push(...county.cities);
  }
}

// Remove duplicate cities within each region
for (const region of regionMap.values()) {
  const cityMap = new Map();
  for (const city of region.cities) {
    const key = `${city.name}-${city.latitude || ''}-${city.longitude || ''}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, city);
    }
  }
  region.cities = Array.from(cityMap.values());
}

// Set counties to only the 9 official regions
ct.counties = Array.from(regionMap.values());

console.log('Connecticut planning regions:', ct.counties.length);
console.log('\nRegions:');
ct.counties.forEach(c => {
  console.log(`  - ${c.name}: ${c.cities.length} cities`);
});

const totalCities = ct.counties.reduce((sum, c) => sum + c.cities.length, 0);
console.log(`\nTotal cities: ${totalCities}`);

// Write back
fs.writeFileSync(ctFile, JSON.stringify(ct, null, 2), 'utf8');
console.log(`\n✓ Fixed and saved to ${ctFile}`);

