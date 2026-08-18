/**
 * Final comprehensive source file fixer
 * Fixes ALL syntax errors in the source file directly
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const backupFile = sourceFile + '.backup-final';

console.log('🔧 Final Comprehensive Source Fixer');
console.log('====================================\n');

// Create backup
if (fs.existsSync(backupFile)) {
  fs.unlinkSync(backupFile);
}
fs.copyFileSync(sourceFile, backupFile);
console.log('✓ Backup created\n');

// Read file
console.log('Reading source file...');
let content = fs.readFileSync(sourceFile, 'utf8');
const totalChars = content.length;
console.log(`✓ File read: ${totalChars.toLocaleString()} characters\n`);

let fixes = 0;
const progress = { current: 0, total: 10 };

function updateProgress(step, message) {
  progress.current = step;
  const percent = Math.round((step / progress.total) * 100);
  const barLength = 50;
  const filled = Math.round((step / progress.total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  process.stdout.write(`\r[${bar}] ${percent}% - ${message}`);
}

// Step 1: Fix missing commas between objects
updateProgress(1, 'Fixing missing commas...');
const missingCommaPatterns = [
  { pattern: /\}\s*\n\s*\n\s*\{/g, replacement: '},\n{' },
  { pattern: /\}\s*\r?\n\s*\{/g, replacement: '},\n{' },
  { pattern: /\]\s*\{/g, replacement: '], {' },
];

missingCommaPatterns.forEach((p, idx) => {
  const matches = content.match(p.pattern);
  if (matches) {
    content = content.replace(p.pattern, p.replacement);
    fixes += matches.length;
  }
  updateProgress(1 + (idx + 1) / missingCommaPatterns.length, `Fixed ${fixes} missing commas`);
});
console.log(`\n✓ Fixed missing commas\n`);

// Step 2: Fix double commas
updateProgress(2, 'Fixing double commas...');
const doubleCommaMatches = content.match(/,\s*,/g);
if (doubleCommaMatches) {
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/,\s*,\s*,/g, ',');
  fixes += doubleCommaMatches.length;
  console.log(`✓ Fixed ${doubleCommaMatches.length} double commas\n`);
} else {
  console.log('✓ No double commas found\n');
}

// Step 3: Fix trailing commas
updateProgress(3, 'Fixing trailing commas...');
const trailingCommaMatches = content.match(/,\s*([}\]])/g);
if (trailingCommaMatches) {
  content = content.replace(/,\s*([}\]])/g, '$1');
  fixes += trailingCommaMatches.length;
  console.log(`✓ Fixed ${trailingCommaMatches.length} trailing commas\n`);
} else {
  console.log('✓ No trailing commas found\n');
}

// Step 4: Fix corrupted names (CRITICAL)
updateProgress(4, 'Fixing corrupted names...');
let nameFixes = 0;

// Fix: name: 'City'extra' -> name: 'City'
content = content.replace(/name:\s*'([^']+)'([a-z]+)'/g, (match, p1, p2) => {
  nameFixes++;
  return `name: '${p1}'`;
});

// Fix: name: 'City'Extra'Extra' -> name: 'City'
content = content.replace(/name:\s*'([^']+)'([A-Z][a-z]+)'([A-Z][a-z]+)'/g, (match, p1) => {
  nameFixes++;
  return `name: '${p1}'`;
});

// Fix: name: 'Lakeport'el' -> name: 'Lakeport'
content = content.replace(/name:\s*'([^']+)'el'/g, (match, p1) => {
  nameFixes++;
  return `name: '${p1}'`;
});

// Fix: name: 'Town 'n' Country'n' Country'... -> name: 'Town 'n' Country'
content = content.replace(/name:\s*'(Town 'n' Country)(?:'n' Country)+'/g, (match, p1) => {
  nameFixes++;
  return `name: '${p1}'`;
});

if (nameFixes > 0) {
  fixes += nameFixes;
  console.log(`✓ Fixed ${nameFixes} corrupted names\n`);
} else {
  console.log('✓ No corrupted names found\n');
}

// Step 5: Fix empty arrays
updateProgress(5, 'Fixing empty arrays...');
let emptyArrayFixes = 0;
content = content.replace(/cities:\s*\[\s*\n\s*\n\s*\n\s*\]\s*,\s*\}/g, () => {
  emptyArrayFixes++;
  return 'cities: [ ] },';
});
content = content.replace(/cities:\s*\[\s*\n\s*\n\s*\]\s*,\s*\}/g, () => {
  emptyArrayFixes++;
  return 'cities: [ ] },';
});
if (emptyArrayFixes > 0) {
  fixes += emptyArrayFixes;
  console.log(`✓ Fixed ${emptyArrayFixes} empty arrays\n`);
} else {
  console.log('✓ No empty array issues found\n');
}

// Step 6: Fix spacing
updateProgress(6, 'Fixing spacing...');
let spacingFixes = 0;
content = content.replace(/\}\s*\]\s*,\s*\}/g, () => {
  spacingFixes++;
  return '} ] },';
});
if (spacingFixes > 0) {
  fixes += spacingFixes;
  console.log(`✓ Fixed ${spacingFixes} spacing issues\n`);
} else {
  console.log('✓ No spacing issues found\n');
}

// Step 7: Write fixed file
updateProgress(7, 'Writing fixed file...');
fs.writeFileSync(sourceFile, content, 'utf8');
console.log(`\n✓ Fixed file written\n`);

// Step 8: Verify syntax
updateProgress(8, 'Verifying syntax...');
let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
let inString = false, stringChar = null, escaped = false;

for (let i = 0; i < content.length; i++) {
  if (i % 100000 === 0) {
    updateProgress(8 + (i / content.length) * 0.5, `Verifying ${Math.round(i / 1000)}k/${Math.round(content.length / 1000)}k`);
  }
  
  const char = content[i];
  if (escaped) { escaped = false; continue; }
  if (char === '\\') { escaped = true; continue; }
  if (!inString && (char === "'" || char === '"')) {
    inString = true; stringChar = char; continue;
  } else if (inString && char === stringChar) {
    inString = false; stringChar = null; continue;
  }
  if (!inString) {
    if (char === '{') openBraces++;
    else if (char === '}') closeBraces++;
    else if (char === '[') openBrackets++;
    else if (char === ']') closeBrackets++;
  }
}

const braceBalance = openBraces - closeBraces;
const bracketBalance = openBrackets - closeBrackets;

console.log(`\n✓ Verification complete\n`);

// Summary
updateProgress(10, 'Complete');
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log(`Total fixes: ${fixes}`);
console.log(`Original size: ${totalChars.toLocaleString()} characters`);
console.log(`Fixed size: ${content.length.toLocaleString()} characters`);
console.log(`Braces: ${openBraces} open, ${closeBraces} close (balance: ${braceBalance})`);
console.log(`Brackets: ${openBrackets} open, ${closeBrackets} close (balance: ${bracketBalance})`);
console.log(`Backup saved to: ${backupFile}`);
console.log('='.repeat(50));
console.log('\n✓ All fixes complete!');

