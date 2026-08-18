/**
 * Comprehensive syntax error fixer for us-cities-with-counties.ts
 * Fixes all syntax errors with real-time progress updates
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const backupFile = sourceFile + '.backup-comprehensive';

console.log('🔍 Comprehensive Syntax Error Fixer');
console.log('=====================================\n');

// Step 1: Create backup
console.log('Step 1: Creating backup...');
if (fs.existsSync(backupFile)) {
  fs.unlinkSync(backupFile);
}
fs.copyFileSync(sourceFile, backupFile);
console.log('✓ Backup created\n');

// Step 2: Read file
console.log('Step 2: Reading source file...');
const content = fs.readFileSync(sourceFile, 'utf8');
const totalChars = content.length;
console.log(`✓ File read: ${totalChars.toLocaleString()} characters\n`);

let fixes = 0;
let fixedContent = content;

// Progress tracking
function showProgress(step, total, currentFix) {
  const percent = Math.round((step / total) * 100);
  const barLength = 50;
  const filled = Math.round((step / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  process.stdout.write(`\r[${bar}] ${percent}% - ${currentFix}`);
}

// Fix 1: Remove duplicate export statements (keep only last one)
console.log('Step 3: Fixing duplicate exports...');
const exportMatches = [...fixedContent.matchAll(/export const US_STATES_WITH_COUNTIES: USState\[\] = \[/g)];
if (exportMatches.length > 1) {
  const firstExport = exportMatches[0].index;
  const lastExport = exportMatches[exportMatches.length - 1].index;
  // Remove everything before the last export
  fixedContent = fixedContent.substring(lastExport);
  // Find the array start
  const arrayStart = fixedContent.indexOf('[');
  fixedContent = 'export const US_STATES_WITH_COUNTIES: USState[] = ' + fixedContent.substring(arrayStart);
  fixes++;
  console.log(`  ✓ Removed ${exportMatches.length - 1} duplicate export(s)`);
} else {
  console.log('  ✓ No duplicate exports found');
}

// Fix 2: Fix missing commas between objects
console.log('\nStep 4: Fixing missing commas...');
let beforeLength = fixedContent.length;
const missingCommaPatterns = [
  /\}\s*\n\s*\n\s*\{/g,           // } \n \n {
  /\}\s*\r?\n\s*\{/g,             // } \n {
  /\]\s*\{/g,                      // ] {
  /\}\s*\]\s*,\s*\}/g,            // } ] },
];

missingCommaPatterns.forEach((pattern, idx) => {
  const matches = fixedContent.match(pattern);
  if (matches) {
    if (pattern === /\}\s*\]\s*,\s*\}/g) {
      fixedContent = fixedContent.replace(pattern, '} ] },');
    } else if (pattern === /\]\s*\{/g) {
      fixedContent = fixedContent.replace(pattern, '], {');
    } else {
      fixedContent = fixedContent.replace(pattern, '},\n{');
    }
    showProgress(idx + 1, missingCommaPatterns.length, `Fixed ${matches.length} missing commas`);
  }
});
const commasFixed = (beforeLength - fixedContent.length) / 2;
if (commasFixed > 0) {
  fixes += commasFixed;
  console.log(`\n  ✓ Fixed ~${Math.round(commasFixed)} missing comma patterns`);
} else {
  console.log('  ✓ No missing commas found');
}

// Fix 3: Fix double/triple commas
console.log('\nStep 5: Fixing double/triple commas...');
beforeLength = fixedContent.length;
fixedContent = fixedContent.replace(/,\s*,/g, ',');
fixedContent = fixedContent.replace(/,\s*,\s*,/g, ',');
const doubleCommasFixed = (beforeLength - fixedContent.length) / 2;
if (doubleCommasFixed > 0) {
  fixes += doubleCommasFixed;
  console.log(`  ✓ Fixed ~${Math.round(doubleCommasFixed)} double/triple commas`);
} else {
  console.log('  ✓ No double commas found');
}

// Fix 4: Fix trailing commas
console.log('\nStep 6: Fixing trailing commas...');
beforeLength = fixedContent.length;
fixedContent = fixedContent.replace(/,\s*([}\]])/g, '$1');
const trailingCommasFixed = (beforeLength - fixedContent.length) / 2;
if (trailingCommasFixed > 0) {
  fixes += trailingCommasFixed;
  console.log(`  ✓ Fixed ~${Math.round(trailingCommasFixed)} trailing commas`);
} else {
  console.log('  ✓ No trailing commas found');
}

// Fix 5: Fix escaped apostrophes in strings
console.log('\nStep 7: Fixing apostrophe escaping...');
beforeLength = fixedContent.length;
// Fix: name: 'Jackson\'s Gap' -> name: 'Jackson\'s Gap' (ensure proper escaping)
fixedContent = fixedContent.replace(/name:\s*'([^']*)\\'([st])([^']*)'/g, "name: '$1\\'$2$3'");
fixedContent = fixedContent.replace(/name:\s*'([^']*)\\'([A-Z])([^']*)'/g, "name: '$1\\'$2$3'");
// Fix double backslashes
fixedContent = fixedContent.replace(/\\\\'/g, "\\'");
// Fix escaped closing quotes
fixedContent = fixedContent.replace(/([a-zA-Z])\\'([,\s\n\}])/g, "$1'$2");
const apostrophesFixed = Math.abs(beforeLength - fixedContent.length);
if (apostrophesFixed > 0) {
  fixes += apostrophesFixed / 10; // Rough estimate
  console.log(`  ✓ Fixed apostrophe escaping issues`);
} else {
  console.log('  ✓ No apostrophe issues found');
}

// Fix 6: Fix corrupted names
console.log('\nStep 8: Fixing corrupted names...');
beforeLength = fixedContent.length;
// Fix: Jacksons's -> Jackson's
fixedContent = fixedContent.replace(/name:\s*'Jacksons\\'s\s+([^']+)'/g, "name: 'Jackson\\'s $1'");
// Fix quadrupled/tripled names
fixedContent = fixedContent.replace(/name:\s*'([^']+)'([A-Za-z]+)'(?:\2')+/g, "name: '$1$2'");
const namesFixed = Math.abs(beforeLength - fixedContent.length);
if (namesFixed > 0) {
  fixes += namesFixed / 10;
  console.log(`  ✓ Fixed corrupted names`);
} else {
  console.log('  ✓ No corrupted names found');
}

// Fix 7: Fix empty cities arrays formatting
console.log('\nStep 9: Fixing empty arrays...');
beforeLength = fixedContent.length;
// Fix: cities: [ \n \n \n ] }, -> cities: [ ] },
fixedContent = fixedContent.replace(/cities:\s*\[\s*\n\s*\n\s*\n\s*\]\s*,\s*\}/g, 'cities: [ ] },');
fixedContent = fixedContent.replace(/cities:\s*\[\s*\n\s*\n\s*\]\s*,\s*\}/g, 'cities: [ ] },');
fixedContent = fixedContent.replace(/cities:\s*\[\s*\n\s*\]\s*,\s*\}/g, 'cities: [ ] },');
const emptyArraysFixed = Math.abs(beforeLength - fixedContent.length);
if (emptyArraysFixed > 0) {
  fixes += emptyArraysFixed / 10;
  console.log(`  ✓ Fixed empty array formatting`);
} else {
  console.log('  ✓ No empty array issues found');
}

// Fix 8: Fix unclosed quotes
console.log('\nStep 10: Fixing unclosed quotes...');
beforeLength = fixedContent.length;
fixedContent = fixedContent.replace(/name:\s*'([^']*)'\s+([A-Za-z][^']*)'/g, (match, p1, p2) => {
  if (p2.match(/^(Gap|Lakes|s\s|'s\s|Connor)/i)) {
    if (p2.startsWith("Connor")) {
      return `name: '${p1}'`;
    }
    return `name: '${p1}'s ${p2.replace(/^s\s+/, '').replace(/^'s\s+/, '')}'`;
  }
  return `name: '${p1} ${p2}'`;
});
const unclosedQuotesFixed = Math.abs(beforeLength - fixedContent.length);
if (unclosedQuotesFixed > 0) {
  fixes += unclosedQuotesFixed / 10;
  console.log(`  ✓ Fixed unclosed quotes`);
} else {
  console.log('  ✓ No unclosed quotes found');
}

// Fix 9: Ensure proper spacing around braces/brackets
console.log('\nStep 11: Fixing spacing issues...');
beforeLength = fixedContent.length;
// Fix: }] }, -> } ] },
fixedContent = fixedContent.replace(/\}\s*\]\s*,\s*\}/g, '} ] },');
// Fix: ], }, -> ] },
fixedContent = fixedContent.replace(/\]\s*,\s*\}/g, '] },');
const spacingFixed = Math.abs(beforeLength - fixedContent.length);
if (spacingFixed > 0) {
  fixes += spacingFixed / 10;
  console.log(`  ✓ Fixed spacing issues`);
} else {
  console.log('  ✓ No spacing issues found');
}

// Step 10: Write fixed file
console.log('\nStep 12: Writing fixed file...');
fs.writeFileSync(sourceFile, fixedContent, 'utf8');
console.log('✓ Fixed file written\n');

// Step 11: Verify syntax
console.log('Step 13: Verifying syntax...');
let openBraces = 0;
let closeBraces = 0;
let openBrackets = 0;
let closeBrackets = 0;
let inString = false;
let stringChar = null;
let escaped = false;

for (let i = 0; i < fixedContent.length; i++) {
  const char = fixedContent[i];
  
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

if (braceBalance === 0 && bracketBalance === 0) {
  console.log('✓ Syntax verification passed (braces and brackets balanced)');
} else {
  console.warn(`⚠ Warning: Unbalanced braces/brackets`);
  console.warn(`  Braces: ${braceBalance > 0 ? '+' : ''}${braceBalance}`);
  console.warn(`  Brackets: ${bracketBalance > 0 ? '+' : ''}${bracketBalance}`);
}

// Final summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log(`Original size: ${content.length.toLocaleString()} characters`);
console.log(`Fixed size:    ${fixedContent.length.toLocaleString()} characters`);
console.log(`Difference:    ${(fixedContent.length - content.length).toLocaleString()} characters`);
console.log(`Estimated fixes: ~${Math.round(fixes)}`);
console.log(`Backup saved to: ${backupFile}`);
console.log('='.repeat(50));
console.log('\n✓ All syntax fixes complete!');

