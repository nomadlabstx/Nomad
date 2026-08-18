#!/usr/bin/env node

/**
 * Fix remaining corrupted entries (apostrophe escaping issues)
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
let dbContent = fs.readFileSync(dbPath, 'utf8');

// Find all corrupted entries
const corrupted = [];
const lines = dbContent.split('\n');

lines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const name = nameMatch[1];
      if (name.endsWith('\\') && name.length > 2) {
        corrupted.push({
          originalName: name,
          cleanName: name.slice(0, -1), // Remove trailing backslash
          stateCode: stateCodeMatch[1],
          lineNumber: index + 1,
          fullLine: line
        });
      }
    }
  }
});

console.log('🔧 Fixing Remaining Corrupted Entries');
console.log('='.repeat(70));
console.log(`\n📊 Found ${corrupted.length} corrupted entries to fix`);

// Common patterns for apostrophe cities
const apostrophePatterns = {
  'Port O': 'Port O\'Connor',
  'Carl': 'Carl\'s Corner',
  'Miller': 'Miller\'s Cove',
  'Martin': 'Martin\'s Additions',
  'Spivey': 'Spivey\'s Corner',
  'Cajah': 'Cajah\'s Mountain',
  'St. John': 'St. John\'s',
  'Chain O': 'Chain O\'Lakes',
  'Golden': 'Golden\'s',
  'Prince': 'Prince\'s',
  'Barney': 'Barney\'s',
  'Bayou L': 'Bayou L\'Ourse',
};

// Try to match with TIGER data or common patterns
const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
let tigerPlaces = [];
try {
  tigerPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
} catch (e) {
  console.log('   (Could not load TIGER data for matching)');
}

const fixes = [];

corrupted.forEach(c => {
  let fixedName = null;
  let fixed = false;
  
  // Try pattern matching
  for (const [pattern, replacement] of Object.entries(apostrophePatterns)) {
    if (c.cleanName.startsWith(pattern)) {
      // Check if this matches a real city in TIGER
      const possibleMatches = tigerPlaces.filter(p => 
        p.stateCode === c.stateCode && 
        (p.name.toLowerCase().includes(pattern.toLowerCase()) || 
         p.name.toLowerCase().includes(replacement.toLowerCase()))
      );
      
      if (possibleMatches.length > 0) {
        // Use the TIGER name if it matches
        const match = possibleMatches.find(p => 
          p.name.toLowerCase().includes(replacement.toLowerCase()) ||
          p.name.toLowerCase().includes(c.cleanName.toLowerCase())
        );
        fixedName = match ? match.name : replacement;
        fixed = true;
        break;
      } else if (c.cleanName === pattern) {
        // Direct pattern match
        fixedName = replacement;
        fixed = true;
        break;
      }
    }
  }
  
  // If no pattern match, try to find similar city in TIGER
  if (!fixed && tigerPlaces.length > 0) {
    const similar = tigerPlaces.find(p => 
      p.stateCode === c.stateCode &&
      (p.name.toLowerCase().includes(c.cleanName.toLowerCase()) ||
       c.cleanName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]))
    );
    
    if (similar) {
      fixedName = similar.name;
      fixed = true;
    }
  }
  
  // If still no match, try adding apostrophe + common suffix
  if (!fixed) {
    // Common suffixes after apostrophes
    const suffixes = ['s', 's Corner', 's Cove', 's Crossing', '\'s Additions'];
    for (const suffix of suffixes) {
      const testName = c.cleanName + '\'' + suffix;
      const match = tigerPlaces.find(p => 
        p.stateCode === c.stateCode && 
        p.name.toLowerCase() === testName.toLowerCase()
      );
      
      if (match) {
        fixedName = match.name;
        fixed = true;
        break;
      }
    }
  }
  
  // If still no match, use clean name with apostrophe + 's' as default
  if (!fixed) {
    // Only add apostrophe if it makes sense (not for single words ending in common letters)
    if (c.cleanName.length > 3 && !c.cleanName.endsWith('s')) {
      fixedName = c.cleanName + '\'s';
    } else {
      fixedName = c.cleanName; // Just remove the backslash
    }
  }
  
  fixes.push({
    original: c.originalName,
    fixed: fixedName,
    stateCode: c.stateCode,
    lineNumber: c.lineNumber,
    wasMatched: fixed || tigerPlaces.length === 0
  });
});

console.log(`\n📊 Fixes prepared: ${fixes.length}`);

// Apply fixes
let fixCount = 0;
fixes.forEach(fix => {
  // Escape the original name for regex
  const escapedOriginal = fix.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`name:\\s*['"]${escapedOriginal}['"]`, 'g');
  
  if (pattern.test(dbContent)) {
    dbContent = dbContent.replace(pattern, `name: '${fix.fixed.replace(/'/g, "\\'")}'`);
    fixCount++;
  }
});

// Write back
fs.writeFileSync(dbPath, dbContent, 'utf8');

console.log(`\n✅ Fixed ${fixCount} corrupted entries`);

// Show what was fixed
console.log(`\n📋 Fixed entries:`);
fixes.forEach((fix, i) => {
  console.log(`   ${i + 1}. "${fix.original}" → "${fix.fixed}" (${fix.stateCode})`);
});

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

