const fs = require('fs');
const path = require('path');

const ak = JSON.parse(fs.readFileSync('data/us-states-json/ak-cities.json', 'utf8'));
console.log('Before: ', ak.counties.length, 'counties');

const countyMap = new Map();
for (const county of ak.counties) {
  let normalized = county.name;
  // Remove " County" suffix for Alaska boroughs/census areas
  if (county.name.endsWith(' County') && !county.name.includes('Planning Region')) {
    normalized = county.name.replace(' County', '');
  }
  
  if (countyMap.has(normalized)) {
    const existing = countyMap.get(normalized);
    existing.cities.push(...county.cities);
  } else {
    countyMap.set(normalized, {
      name: normalized,
      cities: [...county.cities]
    });
  }
}

// Remove duplicate cities within each county
for (const county of countyMap.values()) {
  const cityMap = new Map();
  for (const city of county.cities) {
    const key = `${city.name}-${city.latitude || ''}-${city.longitude || ''}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, city);
    }
  }
  county.cities = Array.from(cityMap.values());
}

// Filter out empty counties and sort
ak.counties = Array.from(countyMap.values())
  .filter(c => c.cities.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

console.log('After: ', ak.counties.length, 'counties');
fs.writeFileSync('data/us-states-json/ak-cities.json', JSON.stringify(ak, null, 2), 'utf8');
console.log('✓ Fixed Alaska');

