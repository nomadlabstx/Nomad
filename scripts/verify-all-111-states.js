/**
 * Verify ALL 111 state JSON files for issues
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('🔍 Verifying ALL States');
console.log('========================\n');

// Get all JSON files
const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.json') && f.includes('-cities.json'));

console.log(`Found ${files.length} state files\n`);

const issues = [];
const stats = {
  total: 0,
  withIssues: 0,
  duplicates: 0,
  invalidCounties: 0,
  emptyCounties: 0
};

// Known invalid county names
const invalidCounties = [
  'Unknown County',
  'Regional Municipality of Halton County', // Canada, not US
];

// Expected county counts for major states (for reference)
const expectedCounties = {
  'al': 67, 'ak': 19, 'az': 15, 'ar': 75, 'ca': 58,
  'co': 64, 'ct': 9, 'de': 3, 'fl': 67, 'ga': 159,
  'hi': 5, 'id': 44, 'il': 102, 'in': 92, 'ia': 99,
  'ks': 105, 'ky': 120, 'la': 64, 'me': 16, 'md': 23,
  'ma': 14, 'mi': 83, 'mn': 87, 'ms': 82, 'mo': 114,
  'mt': 56, 'ne': 93, 'nv': 17, 'nh': 10, 'nj': 21,
  'nm': 33, 'ny': 62, 'nc': 100, 'nd': 53, 'oh': 88,
  'ok': 77, 'or': 36, 'pa': 67, 'ri': 5, 'sc': 46,
  'sd': 66, 'tn': 95, 'tx': 254, 'ut': 29, 'vt': 14,
  'va': 133, 'wa': 39, 'wv': 55, 'wi': 72, 'wy': 23,
  'dc': 1
};

for (const file of files.sort()) {
  const filePath = path.join(outputDir, file);
  const stateCode = file.replace('-cities.json', '').toLowerCase();
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    stats.total++;
    
    const stateIssues = [];
    
    // Check for invalid counties
    const invalid = data.counties.filter(c => invalidCounties.includes(c.name));
    if (invalid.length > 0) {
      stateIssues.push(`Has ${invalid.length} invalid county(ies): ${invalid.map(i => i.name).join(', ')}`);
      stats.invalidCounties += invalid.length;
    }
    
    // Check for exact duplicate county names
    const countyNames = data.counties.map(c => c.name);
    const exactDups = countyNames.filter((name, idx) => countyNames.indexOf(name) !== idx);
    if (exactDups.length > 0) {
      stateIssues.push(`Has ${exactDups.length} exact duplicate county name(s): ${[...new Set(exactDups)].join(', ')}`);
      stats.duplicates += exactDups.length;
    }
    
    // Check for " County" vs without " County" duplicates
    const potentialDups = [];
    for (const county of data.counties) {
      if (county.name.endsWith(' County')) {
        const withoutSuffix = county.name.replace(' County', '');
        const match = data.counties.find(c => c.name === withoutSuffix && c !== county);
        if (match && !county.name.includes('Planning Region')) {
          potentialDups.push({ with: county.name, without: withoutSuffix });
        }
      }
    }
    if (potentialDups.length > 0) {
      stateIssues.push(`Has ${potentialDups.length} potential duplicate(s) (with/without " County"): ${potentialDups.slice(0, 3).map(d => `"${d.with}" vs "${d.without}"`).join(', ')}`);
      stats.duplicates += potentialDups.length;
    }
    
    // Check for empty counties
    const empty = data.counties.filter(c => !c.cities || c.cities.length === 0);
    if (empty.length > 0) {
      stateIssues.push(`Has ${empty.length} empty county(ies): ${empty.map(e => e.name).slice(0, 5).join(', ')}`);
      stats.emptyCounties += empty.length;
    }
    
    // Check county count if we have expected value
    if (expectedCounties[stateCode]) {
      const expected = expectedCounties[stateCode];
      const actual = data.counties.length;
      if (actual !== expected) {
        stateIssues.push(`County count mismatch: ${actual} (expected: ${expected})`);
      }
    }
    
    // Check for duplicate cities within counties
    let duplicateCities = 0;
    for (const county of data.counties) {
      if (county.cities && county.cities.length > 0) {
        const cityKeys = county.cities.map(c => `${c.name}-${c.latitude || ''}-${c.longitude || ''}`);
        const uniqueCities = new Set(cityKeys);
        if (cityKeys.length !== uniqueCities.size) {
          duplicateCities += cityKeys.length - uniqueCities.size;
        }
      }
    }
    if (duplicateCities > 0) {
      stateIssues.push(`Has ${duplicateCities} duplicate cities across counties`);
    }
    
    if (stateIssues.length > 0) {
      stats.withIssues++;
      issues.push({
        state: data.name || stateCode.toUpperCase(),
        code: stateCode.toUpperCase(),
        file: file,
        issues: stateIssues,
        countyCount: data.counties.length,
        cityCount: data.counties.reduce((sum, c) => sum + (c.cities?.length || 0), 0)
      });
    } else {
      const cityCount = data.counties.reduce((sum, c) => sum + (c.cities?.length || 0), 0);
      console.log(`✓ ${data.name || stateCode.toUpperCase()} (${stateCode.toUpperCase()}): ${data.counties.length} counties, ${cityCount} cities - OK`);
    }
    
  } catch (error) {
    stats.withIssues++;
    issues.push({
      state: stateCode.toUpperCase(),
      code: stateCode.toUpperCase(),
      file: file,
      issues: [`ERROR: ${error.message}`]
    });
  }
}

console.log('\n' + '='.repeat(70));
console.log('ISSUES FOUND:');
console.log('='.repeat(70));

if (issues.length === 0) {
  console.log('✓ No issues found! All states are clean.');
} else {
  for (const issue of issues) {
    console.log(`\n✗ ${issue.state} (${issue.code}):`);
    console.log(`  File: ${issue.file}`);
    if (issue.countyCount !== undefined) {
      console.log(`  Counties: ${issue.countyCount}, Cities: ${issue.cityCount}`);
    }
    issue.issues.forEach(i => console.log(`  - ${i}`));
  }
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY:');
console.log('='.repeat(70));
console.log(`Total states checked: ${stats.total}`);
console.log(`States with issues: ${stats.withIssues}`);
console.log(`Total duplicate counties: ${stats.duplicates}`);
console.log(`Total invalid counties: ${stats.invalidCounties}`);
console.log(`Total empty counties: ${stats.emptyCounties}`);
console.log('='.repeat(70));

