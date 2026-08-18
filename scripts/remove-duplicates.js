#!/usr/bin/env node

/**
 * Remove duplicate cities from the database
 * Keeps the first occurrence of each duplicate
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');

console.log('🧹 Removing Duplicate Cities');
console.log('='.repeat(70));

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Extract all city entries
const cities = [];
const cityMap = new Map(); // key: "name|stateCode|lat|lng" -> array of line indices

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    const latMatch = line.match(/latitude:\s*([0-9.-]+)/);
    const lngMatch = line.match(/longitude:\s*([0-9.-]+)/);
    
    if (nameMatch && stateCodeMatch && latMatch && lngMatch) {
      const name = nameMatch[1];
      const stateCode = stateCodeMatch[1];
      const lat = parseFloat(latMatch[1]);
      const lng = parseFloat(lngMatch[1]);
      
      // Create a key for exact duplicates (same name, state, coordinates within 0.0001)
      const key = `${name}|${stateCode}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
      
      if (!cityMap.has(key)) {
        cityMap.set(key, []);
      }
      
      cityMap.get(key).push({
        lineIndex: i,
        name: name,
        stateCode: stateCode,
        lat: lat,
        lng: lng,
        fullLine: line
      });
    }
  }
}

// Find duplicates (groups with more than 1 entry)
const duplicatesToRemove = new Set();
let totalDuplicates = 0;
let duplicateGroups = 0;

cityMap.forEach((group, key) => {
  if (group.length > 1) {
    duplicateGroups++;
    totalDuplicates += group.length - 1; // Keep first, remove rest
    
    // Keep the first occurrence, mark others for removal
    for (let i = 1; i < group.length; i++) {
      duplicatesToRemove.add(group[i].lineIndex);
    }
  }
});

console.log(`\n📊 Found ${duplicateGroups} duplicate groups`);
console.log(`   Total duplicate entries to remove: ${totalDuplicates}`);

if (duplicatesToRemove.size === 0) {
  console.log('\n✅ No duplicates found to remove!');
  process.exit(0);
}

// Remove duplicate lines
// We need to be careful - we need to remove the entire city entry, not just the line
// City entries can span multiple lines, but in this case they're on single lines

let removedCount = 0;
const newLines = [];
let skipNext = false;
let inDuplicateEntry = false;

for (let i = 0; i < lines.length; i++) {
  if (duplicatesToRemove.has(i)) {
    // This is a duplicate line - check if it's a complete city entry
    const line = lines[i];
    
    // Check if this line contains a complete city entry (ends with } or },)
    if (line.includes('name:') && line.includes('stateCode:') && line.trim().match(/},?\s*$/)) {
      // Complete city entry on one line - skip it
      removedCount++;
      continue;
    } else {
      // This might be part of a multi-line entry, but based on the pattern,
      // city entries appear to be single-line in this file
      // Skip it anyway
      removedCount++;
      continue;
    }
  }
  
  newLines.push(lines[i]);
}

// Write the cleaned content
const newContent = newLines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log(`\n✅ Removed ${removedCount} duplicate city entries`);
console.log(`   Original file: ${lines.length} lines`);
console.log(`   New file: ${newLines.length} lines`);
console.log(`   Lines removed: ${lines.length - newLines.length}`);

// Verify the removal
console.log('\n🔍 Verifying removal...');
const verifyContent = fs.readFileSync(filePath, 'utf8');
const verifyLines = verifyContent.split('\n');
const verifyCities = [];

for (let i = 0; i < verifyLines.length; i++) {
  const line = verifyLines[i];
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    const latMatch = line.match(/latitude:\s*([0-9.-]+)/);
    const lngMatch = line.match(/longitude:\s*([0-9.-]+)/);
    
    if (nameMatch && stateCodeMatch && latMatch && lngMatch) {
      const name = nameMatch[1];
      const stateCode = stateCodeMatch[1];
      const lat = parseFloat(latMatch[1]).toFixed(4);
      const lng = parseFloat(lngMatch[1]).toFixed(4);
      const key = `${name}|${stateCode}|${lat}|${lng}`;
      verifyCities.push(key);
    }
  }
}

const verifySet = new Set(verifyCities);
const remainingDuplicates = verifyCities.length - verifySet.size;

console.log(`   Remaining cities: ${verifySet.size}`);
console.log(`   Remaining duplicates: ${remainingDuplicates}`);

if (remainingDuplicates === 0) {
  console.log('\n✅ All duplicates successfully removed!');
} else {
  console.log(`\n⚠️  ${remainingDuplicates} duplicates still remain (may need manual cleanup)`);
}

