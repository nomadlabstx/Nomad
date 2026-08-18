const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/us-states/in-cities.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('=== TESTING INDIANA PARSING ===\n');

// Find last Indiana state object
let lastMatch = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("name: 'Indiana'") && lines[i + 1] && lines[i + 1].includes("code: 'IN'")) {
    const nextFew = lines.slice(i, Math.min(i + 5, lines.length)).join('\n');
    if (nextFew.includes('counties: [')) {
      lastMatch = i;
    }
  }
}

if (lastMatch === -1) {
  console.log('Could not find Indiana state object');
  process.exit(1);
}

// Find opening brace
let stateStart = lastMatch - 1;
for (let j = lastMatch - 1; j >= Math.max(0, lastMatch - 3); j--) {
  if (lines[j].trim() === '{') {
    stateStart = j;
    break;
  }
}

console.log(`Found Indiana at line ${lastMatch + 1}, start at line ${stateStart + 1}`);

// Find end - look for } followed by ;
let stateEnd = -1;
for (let i = stateStart + 10; i < lines.length; i++) {
  if (lines[i].trim() === '}' && i + 1 < lines.length && lines[i + 1].trim() === ';') {
    // Look backwards for ]
    for (let j = i - 1; j >= Math.max(stateStart + 10, i - 5); j--) {
      if (lines[j].trim() === ']') {
        stateEnd = j;
        break;
      }
    }
    if (stateEnd === -1) {
      stateEnd = i - 1;
    }
    break;
  }
}

if (stateEnd === -1) {
  stateEnd = lines.length - 1;
}

console.log(`End at line ${stateEnd + 1}`);
console.log(`Would extract ${stateEnd - stateStart + 1} lines\n`);

const stateLines = lines.slice(stateStart, stateEnd + 1);

// Count counties with IN cities
const counties = new Set();
let currentCounty = null;
let inCounties = false;

for (let i = 0; i < stateLines.length; i++) {
  const line = stateLines[i].trim();
  
  if (line.includes('counties: [')) {
    inCounties = true;
    continue;
  }
  
  if (inCounties && line.match(/^\s*name:\s*'([^']+County[^']*)',/)) {
    const nameMatch = line.match(/name:\s*'([^']+)'/);
    if (nameMatch) {
      currentCounty = nameMatch[1];
    }
    continue;
  }
  
  if (currentCounty && (line.includes("state: 'Indiana'") || line.includes("stateCode: 'IN'"))) {
    counties.add(currentCounty);
  }
  
  if (line === ']') {
    inCounties = false;
  }
}

console.log(`Found ${counties.size} counties with IN cities`);
if (counties.size <= 100) {
  const sorted = Array.from(counties).sort();
  sorted.forEach(c => console.log(`  - ${c}`));
}

