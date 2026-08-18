const fs = require('fs');
const path = require('path');

// Official county counts
const expectedCounts = {
  'AK': 19, 'AL': 67, 'AR': 75, 'AZ': 15, 'CA': 58, 'CO': 64, 'CT': 9, 'DE': 3,
  'FL': 67, 'GA': 159, 'HI': 5, 'ID': 44, 'IL': 102, 'IN': 92, 'IA': 99, 'KS': 105,
  'KY': 120, 'LA': 64, 'ME': 16, 'MD': 24, 'MA': 14, 'MI': 83, 'MN': 87, 'MS': 82,
  'MO': 114, 'MT': 56, 'NE': 93, 'NV': 17, 'NH': 10, 'NJ': 21, 'NM': 33, 'NY': 62,
  'NC': 100, 'ND': 53, 'OH': 88, 'OK': 77, 'OR': 36, 'PA': 67, 'RI': 5, 'SC': 46,
  'SD': 66, 'TN': 95, 'TX': 254, 'UT': 29, 'VT': 14, 'VA': 133, 'WA': 39, 'WV': 55,
  'WI': 72, 'WY': 23, 'DC': 1
};

const jsonDir = 'data/us-states-json';
const files = fs.readdirSync(jsonDir)
  .filter(f => f.endsWith('-cities.json') && !f.includes('PART'))
  .sort();

console.log('Verifying all states...\n');

let issues = [];
for (const file of files) {
  const code = file.replace('-cities.json', '').toUpperCase();
  const expected = expectedCounts[code];
  
  if (!expected) continue;
  
  try {
    const data = JSON.parse(fs.readFileSync(path.join(jsonDir, file), 'utf8'));
    const actual = data.counties.length;
    
    if (actual !== expected) {
      issues.push({ code, file, actual, expected });
    }
  } catch (error) {
    issues.push({ code, file, error: error.message });
  }
}

if (issues.length === 0) {
  console.log('✓ All states have correct county counts!');
  process.exit(0);
}

console.log(`Found ${issues.length} states with issues:\n`);
issues.forEach(issue => {
  if (issue.error) {
    console.log(`  ${issue.code}: ERROR - ${issue.error}`);
  } else {
    console.log(`  ${issue.code}: ${issue.actual}/${issue.expected} (${issue.actual > issue.expected ? '+' : ''}${issue.actual - issue.expected})`);
  }
});

process.exit(1);

