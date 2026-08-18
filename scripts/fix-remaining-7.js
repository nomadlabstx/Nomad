#!/usr/bin/env node

/**
 * Fix the last 7 corrupted entries
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
let dbContent = fs.readFileSync(dbPath, 'utf8');

// Fix the remaining 7 - use exact patterns
const fixes = [
  { find: "name: 'Reile\\'", replace: "name: 'Reile's Acres'" },
  { find: 'name: "Reile\\"', replace: 'name: "Reile\'s Acres"' },
  { find: "name: 'Parker\\'", replace: "name: 'Parker's Crossroads'" },
  { find: 'name: "Parker\\"', replace: 'name: "Parker\'s Crossroads"' },
  { find: "name: 'Carl\\'", replace: "name: 'Carl's Corner'" },
  { find: 'name: "Carl\\"', replace: 'name: "Carl\'s Corner"' },
  { find: "name: 'Fountain N\\'", replace: "name: 'Fountain N' Lakes'" },
  { find: 'name: "Fountain N\\"', replace: 'name: "Fountain N\' Lakes"' },
  { find: "name: 'Miller\\'", replace: "name: 'Miller's Cove'" },
  { find: 'name: "Miller\\"', replace: 'name: "Miller\'s Cove"' },
  { find: "name: 'Clark\\'", replace: "name: 'Clark's Point'" },
  { find: 'name: "Clark\\"', replace: 'name: "Clark\'s Point"' },
  { find: "name: 'Sewall\\'", replace: "name: 'Sewall's Point'" },
  { find: 'name: "Sewall\\"', replace: 'name: "Sewall\'s Point"' },
];

console.log('🔧 Fixing Last 7 Corrupted Entries');
console.log('='.repeat(70));

let fixCount = 0;
fixes.forEach(fix => {
  if (dbContent.includes(fix.find)) {
    dbContent = dbContent.replace(new RegExp(fix.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.replace);
    fixCount++;
    console.log(`   Fixed: ${fix.find} → ${fix.replace}`);
  }
});

if (fixCount > 0) {
  fs.writeFileSync(dbPath, dbContent, 'utf8');
  console.log(`\n✅ Fixed ${fixCount} entries`);
}

// Final check
const lines = dbContent.split('\n');
const remainingCorrupted = [];
lines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    if (nameMatch && nameMatch[1].endsWith('\\') && nameMatch[1].length > 2) {
      remainingCorrupted.push({ name: nameMatch[1], line: index + 1 });
    }
  }
});

if (remainingCorrupted.length > 0) {
  console.log(`\n⚠️  ${remainingCorrupted.length} corrupted entries still remain:`);
  remainingCorrupted.forEach(c => {
    console.log(`   "${c.name}" at line ${c.line}`);
  });
} else {
  console.log(`\n✅ All corrupted entries fixed!`);
}

// Recalculate
const uniqueCities = new Set();
lines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].trim().toLowerCase()}|${stateCodeMatch[1].trim()}`;
      uniqueCities.add(key);
    }
  }
});

console.log(`\n📊 Final Count: ${uniqueCities.size} unique cities`);

