#!/usr/bin/env node

/**
 * Fix tripled names (e.g., "Reile's Acres's Acres's Acres" → "Reile's Acres")
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
let dbContent = fs.readFileSync(dbPath, 'utf8');

console.log('🔧 Fixing Tripled Names');
console.log('='.repeat(70));

// Patterns to fix - look for repeated 's [Name]' patterns
const patterns = [
  { pattern: /(Reile's Acres)('s Acres)+/g, replacement: 'Reile\'s Acres' },
  { pattern: /(Parker's Crossroads)('s Crossroads)+/g, replacement: 'Parker\'s Crossroads' },
  { pattern: /(Carl's Corner)('s Corner)+/g, replacement: 'Carl\'s Corner' },
  { pattern: /(Fountain N' Lakes)(' Lakes)+/g, replacement: 'Fountain N\' Lakes' },
  { pattern: /(Miller's Cove)('s Cove)+/g, replacement: 'Miller\'s Cove' },
  { pattern: /(Clark's Point)('s Point)+/g, replacement: 'Clark\'s Point' },
  { pattern: /(Sewall's Point)('s Point)+/g, replacement: 'Sewall\'s Point' },
];

let fixCount = 0;
patterns.forEach(({ pattern, replacement }) => {
  const matches = dbContent.match(pattern);
  if (matches) {
    dbContent = dbContent.replace(pattern, replacement);
    fixCount += matches.length;
    console.log(`   Fixed ${matches.length} occurrence(s)`);
  }
});

if (fixCount > 0) {
  fs.writeFileSync(dbPath, dbContent, 'utf8');
  console.log(`\n✅ Fixed ${fixCount} tripled names`);
} else {
  console.log(`\n✅ No tripled names found`);
}

// Verify
const lines = dbContent.split('\n');
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
console.log(`   TIGER unique: 31,830`);
console.log(`   Status: ${uniqueCities.size >= 31830 ? '✅ EXCEEDS TIGER' : '❌ Below TIGER'}`);

