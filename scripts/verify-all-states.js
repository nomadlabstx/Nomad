/**
 * Verify all states have correct county counts
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('🔍 Verifying All States');
console.log('========================\n');

// Expected county counts
const expectedCounties = {
  'ar': 75,  // Arkansas
  'ca': 58,  // California
  'co': 64,  // Colorado
  'ct': 9,   // Connecticut (planning regions)
  'fl': 67,  // Florida
  'il': 102  // Illinois
};

const stateNames = {
  'ar': 'Arkansas',
  'ca': 'California',
  'co': 'Colorado',
  'ct': 'Connecticut',
  'fl': 'Florida',
  'il': 'Illinois'
};

let allGood = true;

for (const [code, expected] of Object.entries(expectedCounties)) {
  const file = path.join(outputDir, `${code}-cities.json`);
  
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const actual = data.counties.length;
    const status = actual === expected ? '✓' : '✗';
    
    if (actual === expected) {
      console.log(`${status} ${stateNames[code]}: ${actual} counties - CORRECT`);
    } else {
      console.log(`${status} ${stateNames[code]}: ${actual} counties (expected: ${expected}) - WRONG`);
      allGood = false;
      
      // Check for duplicates
      const countyNames = data.counties.map(c => c.name);
      const duplicates = countyNames.filter((name, idx) => countyNames.indexOf(name) !== idx);
      
      if (duplicates.length > 0) {
        console.log(`  Found ${duplicates.length} duplicate county names:`);
        [...new Set(duplicates)].slice(0, 5).forEach(d => console.log(`    - ${d}`));
      }
      
      // Check for " County" vs without " County" duplicates
      const potentialDups = data.counties.filter(c => {
        if (!c.name.endsWith(' County')) return false;
        const withoutSuffix = c.name.replace(' County', '');
        return data.counties.some(c2 => c2.name === withoutSuffix && c2 !== c);
      });
      
      if (potentialDups.length > 0) {
        console.log(`  Found ${potentialDups.length} potential duplicates (with/without " County"):`);
        potentialDups.slice(0, 5).forEach(d => console.log(`    - ${d.name} vs ${d.name.replace(' County', '')}`));
      }
    }
  } catch (error) {
    console.log(`✗ ${stateNames[code]}: ERROR - ${error.message}`);
    allGood = false;
  }
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✓ All states have correct county counts!');
} else {
  console.log('✗ Some states have incorrect county counts - FIX NEEDED');
}
console.log('='.repeat(50));

