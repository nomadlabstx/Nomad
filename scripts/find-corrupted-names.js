#!/usr/bin/env node

/**
 * Find cities with corrupted names (ending in backslash, etc.)
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

const corrupted = [];
const corruptedNames = new Set();

dbLines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const name = nameMatch[1];
      
      // Check for corrupted patterns
      if (name.endsWith('\\') || 
          name.match(/^[a-z]\\$/i) || 
          name.length < 3 ||
          name.includes('\\') && !name.includes('\\\'')) {
        corrupted.push({
          name,
          stateCode: stateCodeMatch[1],
          lineNumber: index + 1,
          fullLine: line.trim()
        });
        corruptedNames.add(name.toLowerCase());
      }
    }
  }
});

console.log('🔍 Finding Corrupted City Names');
console.log('='.repeat(70));

console.log(`\n📊 Found ${corrupted.length} entries with potentially corrupted names`);
console.log(`   Unique corrupted names: ${corruptedNames.size}`);

if (corrupted.length > 0) {
  console.log(`\n   Examples:`);
  corrupted.slice(0, 20).forEach((c, i) => {
    console.log(`   ${i + 1}. "${c.name}", ${c.stateCode} (line ${c.lineNumber})`);
  });
  
  // Group by state
  const byState = new Map();
  corrupted.forEach(c => {
    if (!byState.has(c.stateCode)) {
      byState.set(c.stateCode, []);
    }
    byState.get(c.stateCode).push(c);
  });
  
  console.log(`\n   By state:`);
  Array.from(byState.entries()).sort((a, b) => b[1].length - a[1].length).forEach(([state, cities]) => {
    console.log(`   ${state}: ${cities.length} corrupted entries`);
  });
  
  // Check if these might match real cities
  console.log(`\n🔍 Checking if these match real city names...`);
  
  const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
  const extractedPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
  
  corruptedNames.forEach(corruptedName => {
    // Try to find matching real city names
    const possibleMatches = extractedPlaces.filter(p => {
      const cleanName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanCorrupted = corruptedName.replace(/[^a-z0-9]/g, '').replace(/\\/g, '');
      return cleanName.includes(cleanCorrupted) || cleanCorrupted.includes(cleanName);
    });
    
    if (possibleMatches.length > 0) {
      console.log(`   "${corruptedName}" might be: ${possibleMatches.map(p => p.name).join(', ')}`);
    }
  });
}

