/**
 * Fix Connecticut counties - deduplicate and normalize planning regions
 */

const fs = require('fs');
const path = require('path');

const ctFile = path.join(__dirname, '../data/us-states-json/ct-cities.json');

console.log('🔧 Fixing Connecticut Counties');
console.log('==============================\n');

const ct = JSON.parse(fs.readFileSync(ctFile, 'utf8'));

// Normalize county names - remove " County" suffix from planning regions
function normalizeCountyName(name) {
  // Remove " County" suffix
  if (name.endsWith(' County')) {
    return name.replace(' County', '');
  }
  return name;
}

// Group counties by normalized name
const countyMap = new Map();

for (const county of ct.counties) {
  const normalized = normalizeCountyName(county.name);
  
  if (countyMap.has(normalized)) {
    // Merge cities from duplicate
    const existing = countyMap.get(normalized);
    existing.cities.push(...county.cities);
  } else {
    // Create new entry with normalized name
    countyMap.set(normalized, {
      name: normalized,
      cities: [...county.cities]
    });
  }
}

// Convert back to array
ct.counties = Array.from(countyMap.values());

// Remove duplicate cities within each county
for (const county of ct.counties) {
  const cityMap = new Map();
  for (const city of county.cities) {
    const key = `${city.name}-${city.latitude}-${city.longitude}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, city);
    }
  }
  county.cities = Array.from(cityMap.values());
}

console.log(`Before: ${ct.counties.length} counties/regions`);
console.log(`After: ${ct.counties.length} unique planning regions\n`);

console.log('Planning regions:');
ct.counties.forEach(c => {
  console.log(`  - ${c.name}: ${c.cities.length} cities`);
});

const totalCities = ct.counties.reduce((sum, c) => sum + c.cities.length, 0);
console.log(`\nTotal cities: ${totalCities}`);

// Write back
fs.writeFileSync(ctFile, JSON.stringify(ct, null, 2), 'utf8');
console.log(`\n✓ Fixed and saved to ${ctFile}`);

