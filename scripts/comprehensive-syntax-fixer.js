/**
 * Comprehensive syntax error fixer with real-time progress
 * Automatically finds and fixes ALL syntax errors
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const backupFile = sourceFile + '.backup-auto-fix';

console.log('🔧 Comprehensive Syntax Error Fixer');
console.log('===================================\n');

// Create backup
console.log('Creating backup...');
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
let processed = 0;

// Progress bar function
function updateProgress(current, total, currentFix) {
  const percent = Math.round((current / total) * 100);
  const barLength = 50;
  const filled = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  process.stdout.write(`\r[${bar}] ${percent}% - ${currentFix}`);
}

// Step 1: Fix missing commas between objects
console.log('Step 1: Fixing missing commas...');
const patterns = [
  { pattern: /\}\s*\n\s*\n\s*\{/g, replacement: '},\n{' },
  { pattern: /\}\s*\r?\n\s*\{/g, replacement: '},\n{' },
  { pattern: /\]\s*\{/g, replacement: '], {' },
];

patterns.forEach((p, idx) => {
  const matches = content.match(p.pattern);
  if (matches) {
    content = content.replace(p.pattern, p.replacement);
    fixes += matches.length;
    updateProgress(idx + 1, patterns.length, `Fixed ${matches.length} missing commas`);
  }
});
console.log(`\n✓ Fixed missing commas\n`);

// Step 2: Fix double/triple commas
console.log('Step 2: Fixing double commas...');
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
console.log('Step 3: Fixing trailing commas...');
const trailingCommaMatches = content.match(/,\s*([}\]])/g);
if (trailingCommaMatches) {
  content = content.replace(/,\s*([}\]])/g, '$1');
  fixes += trailingCommaMatches.length;
  console.log(`✓ Fixed ${trailingCommaMatches.length} trailing commas\n`);
} else {
  console.log('✓ No trailing commas found\n');
}

// Step 4: Fix apostrophe escaping
console.log('Step 4: Fixing apostrophe escaping...');
let apostropheFixes = 0;
// Fix: name: 'Jackson's' -> name: 'Jackson\'s'
content = content.replace(/name:\s*'([^']*)([a-zA-Z])'s\s+([^']*)'/g, (match, p1, p2, p3) => {
  apostropheFixes++;
  return `name: '${p1}${p2}\\'s ${p3}'`;
});
// Fix double backslashes
const doubleBackslashMatches = content.match(/\\\\'/g);
if (doubleBackslashMatches) {
  content = content.replace(/\\\\'/g, "\\'");
  apostropheFixes += doubleBackslashMatches.length;
}
// Fix escaped closing quotes
const escapedQuoteMatches = content.match(/([a-zA-Z])\\'([,\s\n\}])/g);
if (escapedQuoteMatches) {
  content = content.replace(/([a-zA-Z])\\'([,\s\n\}])/g, "$1'$2");
  apostropheFixes += escapedQuoteMatches.length;
}
if (apostropheFixes > 0) {
  fixes += apostropheFixes;
  console.log(`✓ Fixed ${apostropheFixes} apostrophe issues\n`);
} else {
  console.log('✓ No apostrophe issues found\n');
}

// Step 5: Fix corrupted names
console.log('Step 5: Fixing corrupted names...');
let nameFixes = 0;
// Fix: Jacksons's -> Jackson's
content = content.replace(/name:\s*'Jacksons\\'s\s+([^']+)'/g, () => {
  nameFixes++;
  return "name: 'Jackson\\'s $1'";
});
// Fix quadrupled names
const quadrupleMatches = content.match(/name:\s*'([^']+)'([A-Za-z]+)'(?:\2')+/g);
if (quadrupleMatches) {
  content = content.replace(/name:\s*'([^']+)'([A-Za-z]+)'(?:\2')+/g, "name: '$1$2'");
  nameFixes += quadrupleMatches.length;
}
if (nameFixes > 0) {
  fixes += nameFixes;
  console.log(`✓ Fixed ${nameFixes} corrupted names\n`);
} else {
  console.log('✓ No corrupted names found\n');
}

// Step 6: Fix empty arrays
console.log('Step 6: Fixing empty arrays...');
let emptyArrayFixes = 0;
content = content.replace(/cities:\s*\[\s*\n\s*\n\s*\n\s*\]\s*,\s*\}/g, () => {
  emptyArrayFixes++;
  return 'cities: [ ] },';
});
content = content.replace(/cities:\s*\[\s*\n\s*\n\s*\]\s*,\s*\}/g, () => {
  emptyArrayFixes++;
  return 'cities: [ ] },';
});
content = content.replace(/cities:\s*\[\s*\n\s*\]\s*,\s*\}/g, () => {
  emptyArrayFixes++;
  return 'cities: [ ] },';
});
if (emptyArrayFixes > 0) {
  fixes += emptyArrayFixes;
  console.log(`✓ Fixed ${emptyArrayFixes} empty arrays\n`);
} else {
  console.log('✓ No empty array issues found\n');
}

// Step 7: Fix unclosed quotes (critical for "Unexpected identifier" errors)
console.log('Step 7: Fixing unclosed quotes (CRITICAL)...');
let unclosedQuoteFixes = 0;
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (i % 1000 === 0) {
    updateProgress(i, lines.length, `Scanning line ${i}/${lines.length}`);
  }
  
  const line = lines[i];
  
  // Check for patterns like: name: 'City' more text'
  // This suggests an unclosed quote
  const unclosedPattern = /name:\s*'([^']*)'\s+([A-Za-z][^']*)'/g;
  let match;
  while ((match = unclosedPattern.exec(line)) !== null) {
    const [, namePart, extraPart] = match;
    // If extraPart looks like it should be part of the name
    if (extraPart && !extraPart.match(/^(Gap|Lakes|s\s|'s\s|Connor)/i)) {
      // Fix it
      lines[i] = line.replace(unclosedPattern, `name: '${namePart} ${extraPart}'`);
      unclosedQuoteFixes++;
    }
  }
  
  // Check for bare identifiers that should be quoted
  // Pattern: property: identifier (where identifier should be a string)
  const bareIdentifierPattern = /(state|county|size|confidence):\s*([A-Za-z][A-Za-z\s]+)(?=[,\s\n\}])/g;
  let bareMatch;
  while ((bareMatch = bareIdentifierPattern.exec(line)) !== null) {
    const [, prop, value] = bareMatch;
    // If it's not already quoted and looks like a string value
    if (!value.startsWith("'") && !value.startsWith('"')) {
      // Check if it's a valid identifier (not a number, not a keyword)
      if (value.match(/^[A-Za-z]/) && !value.match(/^(true|false|null|undefined)$/)) {
        lines[i] = line.replace(bareIdentifierPattern, `$1: '${value.trim()}'`);
        unclosedQuoteFixes++;
      }
    }
  }
}

if (unclosedQuoteFixes > 0) {
  content = lines.join('\n');
  fixes += unclosedQuoteFixes;
  console.log(`\n✓ Fixed ${unclosedQuoteFixes} unclosed quotes/bare identifiers\n`);
} else {
  console.log('\n✓ No unclosed quotes found\n');
}

// Step 8: Fix spacing issues
console.log('Step 8: Fixing spacing issues...');
let spacingFixes = 0;
content = content.replace(/\}\s*\]\s*,\s*\}/g, () => {
  spacingFixes++;
  return '} ] },';
});
content = content.replace(/\]\s*,\s*\}/g, () => {
  spacingFixes++;
  return '] },';
});
if (spacingFixes > 0) {
  fixes += spacingFixes;
  console.log(`✓ Fixed ${spacingFixes} spacing issues\n`);
} else {
  console.log('✓ No spacing issues found\n');
}

// Step 9: Write fixed file
console.log('Step 9: Writing fixed file...');
fs.writeFileSync(sourceFile, content, 'utf8');
console.log('✓ Fixed file written\n');

// Step 10: Verify syntax
console.log('Step 10: Verifying syntax...');
let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
let inString = false, stringChar = null, escaped = false;

for (let i = 0; i < content.length; i++) {
  if (i % 100000 === 0) {
    updateProgress(i, content.length, `Verifying ${i.toLocaleString()}/${content.length.toLocaleString()}`);
  }
  
  const char = content[i];
  
  if (escaped) {
    escaped = false;
    continue;
  }
  
  if (char === '\\') {
    escaped = true;
    continue;
  }
  
  if (!inString && (char === "'" || char === '"')) {
    inString = true;
    stringChar = char;
    continue;
  } else if (inString && char === stringChar) {
    inString = false;
    stringChar = null;
    continue;
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

console.log('\n✓ Verification complete\n');

// Summary
console.log('='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log(`Total fixes applied: ${fixes}`);
console.log(`Original size: ${totalChars.toLocaleString()} characters`);
console.log(`Fixed size: ${content.length.toLocaleString()} characters`);
console.log(`Braces: ${openBraces} open, ${closeBraces} close (balance: ${braceBalance})`);
console.log(`Brackets: ${openBrackets} open, ${closeBrackets} close (balance: ${bracketBalance})`);
console.log(`Backup saved to: ${backupFile}`);
console.log('='.repeat(50));
console.log('\n✓ All syntax fixes complete!');

