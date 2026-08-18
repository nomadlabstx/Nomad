const fs = require('fs');

// Counties that should exist but have empty cities arrays or only cities from other states
// These are valid counties that need to be added with empty cities arrays
const emptyCounties = {
  CA: ['San Francisco County'], // Consolidated city-county, empty in source
  CO: ['Broomfield County'], // Empty in source
  NY: ['Queens County'], // Not in source - need to add
  TX: ['Loving County', 'Kenedy County'] // Not in source or empty - need to add (Menard already added)
};

// Counties that only have cities from other states - these should be added with empty arrays
// since they're valid counties but source data doesn't have their cities
const otherStateCounties = {
  CO: ['Cheyenne County', 'Custer County', 'Jackson County', 'Mineral County', 'San Juan County', 'Sedgwick County'],
  TX: ['Franklin County', 'Martin County', 'Stephens County'],
  NY: ['Richmond County'] // Staten Island - only has NC cities in source
};

console.log('Adding missing counties...\n');

for (const [stateCode, counties] of Object.entries(emptyCounties)) {
  const file = `data/us-states-json/${stateCode.toLowerCase()}-cities.json`;
  if (!fs.existsSync(file)) {
    console.log(`  ${stateCode}: File not found`);
    continue;
  }
  
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  
  for (const countyName of counties) {
    const exists = data.counties.some(c => c.name === countyName);
    if (!exists) {
      data.counties.push({
        name: countyName,
        cities: []
      });
      added++;
      console.log(`  ${stateCode}: Added ${countyName}`);
    }
  }
  
  if (added > 0) {
    data.counties.sort((a, b) => a.name.localeCompare(b.name));
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ${stateCode}: Updated file with ${added} counties\n`);
  }
}

for (const [stateCode, counties] of Object.entries(otherStateCounties)) {
  const file = `data/us-states-json/${stateCode.toLowerCase()}-cities.json`;
  if (!fs.existsSync(file)) {
    console.log(`  ${stateCode}: File not found`);
    continue;
  }
  
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  
  for (const countyName of counties) {
    const exists = data.counties.some(c => c.name === countyName);
    if (!exists) {
      data.counties.push({
        name: countyName,
        cities: []
      });
      added++;
      console.log(`  ${stateCode}: Added ${countyName} (empty - only had cities from other states)`);
    }
  }
  
  if (added > 0) {
    data.counties.sort((a, b) => a.name.localeCompare(b.name));
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ${stateCode}: Updated file with ${added} counties\n`);
  }
}

console.log('Done!');

