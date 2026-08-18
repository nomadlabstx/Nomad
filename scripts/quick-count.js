#!/usr/bin/env node

/**
 * Quick count - uses efficient file reading
 */

const fs = require('fs');

const dbPath = 'data/us-cities-with-counties.ts';
const content = fs.readFileSync(dbPath, 'utf8');

// Fast count using string matching
const nameMatches = content.match(/name:\s*['"][^'"]+['"]/g);
const stateMatches = content.match(/stateCode:\s*['"][^'"]+['"]/g);

const totalEntries = Math.min(nameMatches?.length || 0, stateMatches?.length || 0);

// Count unique - use a simpler approach
const uniqueSet = new Set();
const lines = content.split('\n');

// Process in chunks to avoid memory issues
let processed = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    // Extract name and state quickly
    const nameIdx = line.indexOf('name:');
    const stateIdx = line.indexOf('stateCode:');
    
    if (nameIdx !== -1 && stateIdx !== -1) {
      const nameMatch = line.substring(nameIdx).match(/name:\s*['"]([^'"]+)['"]/);
      const stateMatch = line.substring(stateIdx).match(/stateCode:\s*['"]([^'"]+)['"]/);
      
      if (nameMatch && stateMatch) {
        const key = `${nameMatch[1].trim().toLowerCase()}|${stateMatch[1].trim()}`;
        uniqueSet.add(key);
        processed++;
      }
    }
  }
  
  // Progress indicator every 10000 lines
  if (i % 10000 === 0 && i > 0) {
    process.stdout.write(`\rProcessed ${i} lines, found ${processed} cities...`);
  }
}

console.log('\n'); // New line after progress
console.log('📊 Final Count:');
console.log(`   Total entries: ${totalEntries}`);
console.log(`   Unique cities: ${uniqueSet.size}`);
console.log(`   TIGER unique: 31,830`);
console.log(`   Status: ${uniqueSet.size >= 31830 ? '✅ EXCEEDS TIGER' : '❌ Below TIGER'}`);
console.log(`   Difference: ${uniqueSet.size - 31830} ${uniqueSet.size >= 31830 ? 'extra' : 'missing'}`);

