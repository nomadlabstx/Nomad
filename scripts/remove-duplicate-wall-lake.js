#!/usr/bin/env node

/**
 * Remove duplicate Wall Lake entry from Unknown County section
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');

console.log('🔧 Removing duplicate Wall Lake entry');
console.log('='.repeat(70));

let content = fs.readFileSync(filePath, 'utf8');

// Find and remove the Unknown County section that contains Wall Lake
const unknownSectionPattern = /{\s*name:\s*['"]Unknown County['"]\s*,\s*cities:\s*\[\s*{\s*name:\s*['"]Wall Lake['"][^}]+\}\s*\]\s*}/;

if (unknownSectionPattern.test(content)) {
  content = content.replace(unknownSectionPattern, '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Removed duplicate Wall Lake from Unknown County section');
} else {
  console.log('⚠️  Could not find duplicate Wall Lake in Unknown County section');
  
  // Try a more flexible pattern
  const flexiblePattern = /{\s*name:\s*['"]Unknown County['"]\s*,\s*cities:\s*\[([\s\S]*?)\]\s*}/g;
  const matches = [...content.matchAll(flexiblePattern)];
  
  for (const match of matches) {
    if (match[1] && match[1].includes('Wall Lake')) {
      // This Unknown County section contains Wall Lake, remove it
      content = content.replace(match[0], '');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('✅ Removed Unknown County section containing Wall Lake');
      break;
    }
  }
}

// Also clean up any empty Unknown County sections
const emptyUnknownPattern = /{\s*name:\s*['"]Unknown County['"]\s*,\s*cities:\s*\[\s*\]\s*}/g;
const beforeClean = content.length;
content = content.replace(emptyUnknownPattern, '');
if (content.length < beforeClean) {
  console.log('✅ Removed empty Unknown County sections');
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Done!');

