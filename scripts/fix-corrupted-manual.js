#!/usr/bin/env node

/**
 * Manually fix remaining corrupted entries by exact line replacement
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
let dbContent = fs.readFileSync(dbPath, 'utf8');

// Known corrupted entries with their correct names
const fixes = [
  { corrupted: "Port O\\", correct: "Port O'Connor", state: "TX" },
  { corrupted: "Carl\\", correct: "Carl's Corner", state: "TX" },
  { corrupted: "Miller\\", correct: "Miller's Cove", state: "TX" },
  { corrupted: "Martin\\", correct: "Martin's Additions", state: "MD" },
  { corrupted: "Spivey\\", correct: "Spivey's Corner", state: "NC" },
  { corrupted: "Cajah\\", correct: "Cajah's Mountain", state: "NC" },
  { corrupted: "St. John\\", correct: "St. John", state: "MN" },
  { corrupted: "Chain O\\", correct: "Chain O'Lakes", state: "WI" },
  { corrupted: "Golden\\", correct: "Golden", state: "NY" },
  { corrupted: "Barney\\", correct: "Barney", state: "WA" },
  { corrupted: "Bayou L\\", correct: "Bayou L'Ourse", state: "LA" },
  { corrupted: "Rocky Boy\\", correct: "Rocky Boy's Agency", state: "MT" },
  { corrupted: "Fountain N\\", correct: "Fountain N' Lakes", state: "MO" },
  { corrupted: "Reile\\", correct: "Reile's Acres", state: "ND" },
  { corrupted: "Parker\\", correct: "Parker's Crossroads", state: "TN" },
  { corrupted: "Thompson\\", correct: "Thompson's Station", state: "TN" },
  { corrupted: "Boswell\\", correct: "Boswell's Corner", state: "VA" },
  { corrupted: "Bailey\\", correct: "Bailey's Crossroads", state: "VA" },
  { corrupted: "Coeur d\\", correct: "Coeur d'Alene", state: "ID" },
  { corrupted: "Sewall\\", correct: "Sewall's Point", state: "FL" },
  { corrupted: "Clark\\", correct: "Clark's Point", state: "AK" },
  { corrupted: "Kep\\", correct: "Kep'el", state: "CA" },
  { corrupted: "St. Mary\\", correct: "St. Mary's", state: "AK" },
  { corrupted: "Town \\", correct: "Town 'n' Country", state: "FL" },
  { corrupted: "Land O\\", correct: "Land O' Lakes", state: "FL" },
  { corrupted: "Hill \\", correct: "Hill 'n Dale", state: "FL" },
  { corrupted: "Campbell\\", correct: "Campbell", state: "IL" },
];

console.log('🔧 Manually Fixing Corrupted Entries');
console.log('='.repeat(70));

let fixCount = 0;
const lines = dbContent.split('\n');

// Process each line
const fixedLines = lines.map((line, index) => {
  if (!line.includes('name:') || !line.includes('stateCode:')) {
    return line;
  }
  
  // Check each fix
  for (const fix of fixes) {
    // Check if this line contains the corrupted name
    const corruptedPattern = new RegExp(`name:\\s*['"]${fix.corrupted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
    const statePattern = new RegExp(`stateCode:\\s*['"]${fix.state}['"]`);
    
    if (corruptedPattern.test(line) && statePattern.test(line)) {
      // Replace the corrupted name with the correct one
      const escapedCorrupted = fix.corrupted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(name:\\s*['"])${escapedCorrupted}(['"])`);
      const replacement = `$1${fix.correct.replace(/'/g, "\\'")}$2`;
      
      const fixed = line.replace(pattern, replacement);
      if (fixed !== line) {
        fixCount++;
        console.log(`   Fixed: "${fix.corrupted}" → "${fix.correct}" (${fix.state}) - line ${index + 1}`);
        return fixed;
      }
    }
  }
  
  return line;
});

if (fixCount > 0) {
  dbContent = fixedLines.join('\n');
  fs.writeFileSync(dbPath, dbContent, 'utf8');
  console.log(`\n✅ Fixed ${fixCount} corrupted entries`);
} else {
  console.log(`\n⚠️  No fixes applied (entries may have already been fixed)`);
}

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

console.log(`\n📊 Final Counts:`);
console.log(`   Total entries: ${totalEntries}`);
console.log(`   Unique cities: ${uniqueCities.size}`);
console.log(`   TIGER unique: 31,830`);
console.log(`   Status: ${uniqueCities.size >= 31830 ? '✅ EXCEEDS TIGER' : '❌ Below TIGER'}`);
console.log(`   Difference: ${uniqueCities.size - 31830} ${uniqueCities.size >= 31830 ? 'extra' : 'missing'}`);

