#!/usr/bin/env node

/**
 * Analyze corrupted entries - are they duplicates or broken?
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');

// Find entries with corrupted names (ending in backslash)
const corrupted = [];
const lines = dbContent.split('\n');

lines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const name = nameMatch[1];
      if (name.endsWith('\\') && name.length > 1) {
        corrupted.push({
          name,
          cleanName: name.slice(0, -1), // Remove trailing backslash
          stateCode: stateCodeMatch[1],
          lineNumber: index + 1
        });
      }
    }
  }
});

console.log('🔍 Analyzing Corrupted Entries');
console.log('='.repeat(70));
console.log(`\n📊 Found ${corrupted.length} entries with trailing backslash`);

// Check if clean versions exist
const allNames = new Map();
lines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].trim().toLowerCase()}|${stateCodeMatch[1]}`;
      allNames.set(key, true);
    }
  }
});

const duplicates = [];
const uniqueCorrupted = [];

corrupted.forEach(c => {
  const cleanKey = `${c.cleanName.trim().toLowerCase()}|${c.stateCode}`;
  const originalKey = `${c.name.trim().toLowerCase()}|${c.stateCode}`;
  
  if (allNames.has(cleanKey)) {
    duplicates.push({
      corrupted: c.name,
      clean: c.cleanName,
      stateCode: c.stateCode,
      lineNumber: c.lineNumber
    });
  } else {
    uniqueCorrupted.push(c);
  }
});

console.log(`\n📊 Analysis:`);
console.log(`   Corrupted entries: ${corrupted.length}`);
console.log(`   Duplicates (clean version exists): ${duplicates.length}`);
console.log(`   Unique corrupted (no clean version): ${uniqueCorrupted.length}`);

if (duplicates.length > 0) {
  console.log(`\n   Examples of duplicates (first 20):`);
  duplicates.slice(0, 20).forEach((d, i) => {
    console.log(`   ${i + 1}. "${d.corrupted}" → "${d.clean}" (${d.stateCode}) - line ${d.lineNumber}`);
  });
}

if (uniqueCorrupted.length > 0) {
  console.log(`\n   Unique corrupted (might be real cities with issues):`);
  uniqueCorrupted.slice(0, 20).forEach((c, i) => {
    console.log(`   ${i + 1}. "${c.name}" → "${c.cleanName}" (${c.stateCode}) - line ${c.lineNumber}`);
  });
}

console.log(`\n💡 Recommendation:`);
if (duplicates.length > 0) {
  console.log(`   Remove ${duplicates.length} duplicate corrupted entries`);
  console.log(`   This will reduce our unique count by ~${duplicates.length}`);
}

