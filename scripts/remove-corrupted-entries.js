#!/usr/bin/env node

/**
 * Remove corrupted entries (trailing backslash) from database
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const lines = dbContent.split('\n');

// First pass: identify all corrupted entries
const corrupted = [];
const allNames = new Map();

// Build map of all clean names
lines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    if (nameMatch && stateCodeMatch) {
      const name = nameMatch[1].trim();
      if (!name.endsWith('\\')) {
        const key = `${name.toLowerCase()}|${stateCodeMatch[1]}`;
        allNames.set(key, true);
      }
    }
  }
});

// Find corrupted entries
const linesToRemove = new Set();
const removed = [];

lines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const name = nameMatch[1];
      if (name.endsWith('\\') && name.length > 1) {
        const cleanName = name.slice(0, -1).trim();
        const cleanKey = `${cleanName.toLowerCase()}|${stateCodeMatch[1]}`;
        
        // Remove if:
        // 1. It's a duplicate (clean version exists), OR
        // 2. It's clearly invalid (single letter, very short, etc.)
        const isDuplicate = allNames.has(cleanKey);
        const isInvalid = cleanName.length <= 2 || /^[A-Z]$/i.test(cleanName);
        
        if (isDuplicate || isInvalid) {
          linesToRemove.add(index);
          removed.push({
            name,
            cleanName,
            stateCode: stateCodeMatch[1],
            reason: isDuplicate ? 'duplicate' : 'invalid',
            lineNumber: index + 1
          });
        }
      }
    }
  }
});

console.log('🧹 Removing Corrupted Entries');
console.log('='.repeat(70));
console.log(`\n📊 Found ${removed.length} corrupted entries to remove`);

// Show breakdown
const duplicates = removed.filter(r => r.reason === 'duplicate');
const invalid = removed.filter(r => r.reason === 'invalid');

console.log(`   Duplicates: ${duplicates.length}`);
console.log(`   Invalid: ${invalid.length}`);

if (duplicates.length > 0) {
  console.log(`\n   Duplicate examples (first 10):`);
  duplicates.slice(0, 10).forEach((r, i) => {
    console.log(`   ${i + 1}. "${r.name}" → "${r.cleanName}" (${r.stateCode})`);
  });
}

if (invalid.length > 0) {
  console.log(`\n   Invalid examples (first 10):`);
  invalid.slice(0, 10).forEach((r, i) => {
    console.log(`   ${i + 1}. "${r.name}" → "${r.cleanName}" (${r.stateCode})`);
  });
}

// Remove lines (in reverse order to maintain indices)
const sortedIndices = Array.from(linesToRemove).sort((a, b) => b - a);
let removedCount = 0;

sortedIndices.forEach(index => {
  // Check if line contains a city entry (has name, stateCode, latitude)
  if (lines[index].includes('name:') && lines[index].includes('stateCode:')) {
    // Also need to remove the comma if it's the last item in an array
    // Or handle the closing bracket properly
    lines.splice(index, 1);
    removedCount++;
  }
});

// Clean up trailing commas before closing brackets
const cleanedContent = lines.join('\n')
  .replace(/,\s*\n\s*\]/g, '\n]')  // Remove trailing comma before closing bracket
  .replace(/,\s*\n\s*\}/g, '\n}');   // Remove trailing comma before closing brace

// Write back
fs.writeFileSync(dbPath, cleanedContent, 'utf8');

console.log(`\n✅ Removed ${removedCount} corrupted entries`);
console.log(`   File updated: ${dbPath}`);

// Recalculate counts
console.log(`\n📊 Recalculating counts...`);
const newContent = fs.readFileSync(dbPath, 'utf8');
const newLines = newContent.split('\n');

const uniqueCities = new Set();
newLines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].trim().toLowerCase()}|${stateCodeMatch[1].trim()}`;
      uniqueCities.add(key);
    }
  }
});

const totalEntries = newLines.filter(line => 
  line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')
).length;

console.log(`\n📊 New Counts:`);
console.log(`   Total entries: ${totalEntries}`);
console.log(`   Unique cities: ${uniqueCities.size}`);
console.log(`   TIGER unique: 31,830`);
console.log(`   Status: ${uniqueCities.size >= 31830 ? '✅ EXCEEDS TIGER' : '❌ Below TIGER'}`);
console.log(`   Difference: ${uniqueCities.size - 31830} ${uniqueCities.size >= 31830 ? 'extra' : 'missing'}`);

