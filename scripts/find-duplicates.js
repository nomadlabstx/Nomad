/**
 * Find duplicate counties in states
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../data/us-states-json');

const states = {
  'ca': { name: 'California', expected: 58 },
  'co': { name: 'Colorado', expected: 64 },
  'ct': { name: 'Connecticut', expected: 9 }
};

for (const [code, info] of Object.entries(states)) {
  const file = path.join(outputDir, `${code}-cities.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  console.log(`\n${info.name} (${code.toUpperCase()}): ${data.counties.length} counties (expected: ${info.expected})`);
  console.log('='.repeat(60));
  
  // Check for exact duplicates
  const countyNames = data.counties.map(c => c.name);
  const exactDups = countyNames.filter((name, idx) => countyNames.indexOf(name) !== idx);
  
  if (exactDups.length > 0) {
    console.log(`Exact duplicates: ${exactDups.length}`);
    [...new Set(exactDups)].forEach(d => console.log(`  - ${d}`));
  }
  
  // Check for " County" vs without " County"
  const potentialDups = [];
  for (const county of data.counties) {
    if (county.name.endsWith(' County')) {
      const withoutSuffix = county.name.replace(' County', '');
      const match = data.counties.find(c => c.name === withoutSuffix && c !== county);
      if (match) {
        potentialDups.push({ with: county.name, without: withoutSuffix });
      }
    }
  }
  
  if (potentialDups.length > 0) {
    console.log(`\nPotential duplicates (with/without " County"): ${potentialDups.length}`);
    potentialDups.slice(0, 10).forEach(d => console.log(`  - "${d.with}" vs "${d.without}"`));
  }
  
  // List all county names
  if (data.counties.length <= 70) {
    console.log(`\nAll counties (${data.counties.length}):`);
    data.counties.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}`));
  } else {
    console.log(`\nFirst 20 counties:`);
    data.counties.slice(0, 20).forEach((c, i) => console.log(`  ${i + 1}. ${c.name}`));
  }
}
