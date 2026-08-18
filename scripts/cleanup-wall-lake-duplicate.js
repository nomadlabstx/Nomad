#!/usr/bin/env node

/**
 * Remove duplicate Wall Lake entry from Unknown County section
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');

console.log('🔧 Removing duplicate Wall Lake entry from Unknown County section');
console.log('='.repeat(70));

let content = fs.readFileSync(filePath, 'utf8');

// Find the Unknown County section that contains Wall Lake
const pattern = /{\s*name:\s*['"]Unknown County['"]\s*,\s*cities:\s*\[\s*{\s*name:\s*['"]Wall Lake['"][^}]+}\s*,\s*\]\s*}/;

if (pattern.test(content)) {
  content = content.replace(pattern, '');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Removed duplicate Wall Lake from Unknown County section');
} else {
  // Try without the comma after the closing brace
  const pattern2 = /{\s*name:\s*['"]Unknown County['"]\s*,\s*cities:\s*\[\s*{\s*name:\s*['"]Wall Lake['"][^}]+}\s*\]\s*}/;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Removed duplicate Wall Lake from Unknown County section');
  } else {
    console.log('⚠️  Could not find exact pattern, trying manual removal...');
    
    // Find the line number and remove manually
    const lines = content.split('\n');
    let found = false;
    let inUnknownSection = false;
    let unknownStart = -1;
    let unknownEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('name: \'Unknown County\'') || lines[i].includes('name: "Unknown County"')) {
        inUnknownSection = true;
        unknownStart = i;
      }
      if (inUnknownSection && lines[i].includes('Wall Lake') && lines[i].includes('IN')) {
        found = true;
      }
      if (inUnknownSection && lines[i].trim() === '},') {
        unknownEnd = i;
        if (found) {
          // Remove this entire section
          lines.splice(unknownStart, unknownEnd - unknownStart + 1);
          content = lines.join('\n');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log('✅ Removed Unknown County section containing Wall Lake');
          break;
        }
        inUnknownSection = false;
        found = false;
      }
    }
  }
}

console.log('✅ Done!');

