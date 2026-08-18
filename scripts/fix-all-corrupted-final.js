#!/usr/bin/env node

/**
 * Final fix for all remaining corrupted entries
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
let dbContent = fs.readFileSync(dbPath, 'utf8');

// Fix all corrupted entries with trailing backslash
const fixes = [
  { pattern: /name:\s*['"]Port O\\['"]/, replacement: "name: 'Port O'Connor'" },
  { pattern: /name:\s*['"]Port O\\'Connor['"]/g, replacement: "name: 'Port O'Connor'" },
  { pattern: /name:\s*['"]Port O\\'Connor' Connor['"]/g, replacement: "name: 'Port O'Connor'" },
  { pattern: /name:\s*['"]Carl\\['"]/, replacement: "name: 'Carl's Corner'" },
  { pattern: /name:\s*['"]Miller\\['"]/, replacement: "name: 'Miller's Cove'" },
  { pattern: /name:\s*['"]Martin\\['"]/, replacement: "name: 'Martin's Additions'" },
  { pattern: /name:\s*['"]Spivey\\['"]/, replacement: "name: 'Spivey's Corner'" },
  { pattern: /name:\s*['"]Cajah\\['"]/, replacement: "name: 'Cajah's Mountain'" },
  { pattern: /name:\s*['"]St\. John\\['"]/, replacement: "name: 'St. John'" },
  { pattern: /name:\s*['"]Chain O\\['"]/, replacement: "name: 'Chain O'Lakes'" },
  { pattern: /name:\s*['"]Golden\\['"]/, replacement: "name: 'Golden'" },
  { pattern: /name:\s*['"]Barney\\['"]/, replacement: "name: 'Barney'" },
  { pattern: /name:\s*['"]Bayou L\\['"]/, replacement: "name: 'Bayou L'Ourse'" },
  { pattern: /name:\s*['"]Rocky Boy\\['"]/, replacement: "name: 'Rocky Boy's Agency'" },
  { pattern: /name:\s*['"]Fountain N\\['"]/, replacement: "name: 'Fountain N' Lakes'" },
  { pattern: /name:\s*['"]Reile\\['"]/, replacement: "name: 'Reile's Acres'" },
  { pattern: /name:\s*['"]Parker\\['"]/, replacement: "name: 'Parker's Crossroads'" },
  { pattern: /name:\s*['"]Thompson\\['"]/, replacement: "name: 'Thompson's Station'" },
  { pattern: /name:\s*['"]Boswell\\['"]/, replacement: "name: 'Boswell's Corner'" },
  { pattern: /name:\s*['"]Bailey\\['"]/, replacement: "name: 'Bailey's Crossroads'" },
  { pattern: /name:\s*['"]Coeur d\\['"]/, replacement: "name: 'Coeur d'Alene'" },
  { pattern: /name:\s*['"]Sewall\\['"]/, replacement: "name: 'Sewall's Point'" },
  { pattern: /name:\s*['"]Clark\\['"]/, replacement: "name: 'Clark's Point'" },
  { pattern: /name:\s*['"]Kep\\['"]/, replacement: "name: 'Kep'el'" },
  { pattern: /name:\s*['"]St\. Mary\\['"]/, replacement: "name: 'St. Mary's'" },
  { pattern: /name:\s*['"]Town \\['"]/, replacement: "name: 'Town 'n' Country'" },
  { pattern: /name:\s*['"]Land O\\['"]/, replacement: "name: 'Land O' Lakes'" },
  { pattern: /name:\s*['"]Hill \\['"]/, replacement: "name: 'Hill 'n Dale'" },
  { pattern: /name:\s*['"]Campbell\\['"]/, replacement: "name: 'Campbell'" },
];

console.log('🔧 Final Fix for All Corrupted Entries');
console.log('='.repeat(70));

let fixCount = 0;
fixes.forEach(fix => {
  if (fix.pattern.test(dbContent)) {
    const before = (dbContent.match(fix.pattern) || []).length;
    dbContent = dbContent.replace(fix.pattern, fix.replacement);
    const after = (dbContent.match(fix.pattern) || []).length;
    const fixed = before - after;
    if (fixed > 0) {
      fixCount += fixed;
      console.log(`   Fixed ${fixed} occurrence(s) of pattern`);
    }
  }
});

// Also fix the tripled Port O'Connor
dbContent = dbContent.replace(/Port O\\'Connor' Connor' Connor/g, "Port O'Connor");
dbContent = dbContent.replace(/Port O\\'Connor' Connor/g, "Port O'Connor");
dbContent = dbContent.replace(/Port O\\'Connor'/g, "Port O'Connor");

if (fixCount > 0 || dbContent.includes("Port O'")) {
  fs.writeFileSync(dbPath, dbContent, 'utf8');
  console.log(`\n✅ Applied fixes`);
}

// Recalculate counts
console.log(`\n📊 Recalculating counts...`);
const newLines = dbContent.split('\n');

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

// Check for remaining corrupted
const remainingCorrupted = [];
newLines.forEach((line, index) => {
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    if (nameMatch && nameMatch[1].endsWith('\\') && nameMatch[1].length > 2) {
      remainingCorrupted.push({ name: nameMatch[1], line: index + 1 });
    }
  }
});

if (remainingCorrupted.length > 0) {
  console.log(`\n⚠️  ${remainingCorrupted.length} corrupted entries still remain:`);
  remainingCorrupted.slice(0, 10).forEach(c => {
    console.log(`   "${c.name}" at line ${c.line}`);
  });
} else {
  console.log(`\n✅ No corrupted entries remaining!`);
}

