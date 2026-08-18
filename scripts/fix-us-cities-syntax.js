const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const backupFile = path.join(__dirname, '../data/us-cities-with-counties.ts.backup');

console.log('Reading file...');
let content = fs.readFileSync(inputFile, 'utf8');
const originalLength = content.length;

// Create backup
console.log('Creating backup...');
fs.writeFileSync(backupFile, content);

console.log('Fixing syntax errors...');

// Fix 1: Missing commas between objects in arrays
// Pattern: } followed by whitespace/newlines and then {
let fixes = 0;
let previousContent = '';

// Apply fixes iteratively until no more changes
let iterations = 0;
while (content !== previousContent && iterations < 20) {
  previousContent = content;
  iterations++;
  
  // Fix missing commas: } \n \n { -> }, \n \n {
  const before1 = content.length;
  content = content.replace(/\}\s*\n\s*\n\s*\{/g, '},\n\n{');
  if (content.length !== before1) fixes++;
  
  // Fix missing commas: } \n { -> }, \n {
  const before2 = content.length;
  content = content.replace(/\}\s*\n\s*\{/g, '},\n{');
  if (content.length !== before2) fixes++;
  
  // Fix missing commas: } { -> }, {
  const before3 = content.length;
  content = content.replace(/\}\s+\{/g, '}, {');
  if (content.length !== before3) fixes++;
  
  // Fix missing commas: } followed by any whitespace and {
  const before4 = content.length;
  content = content.replace(/\}(?=\s*\{)/g, '},');
  if (content.length !== before4) fixes++;
  
  // Fix missing commas: }, \n \n { -> }, \n \n {, (when }, is already there but { is on new line)
  // Actually, this case is already handled above
  
  // Fix missing commas: } at end of line, then { at start of next line (even with comma already)
  // Pattern: }, \n \n { -> }, \n \n {,
  const before5 = content.length;
  content = content.replace(/,\s*\n\s*\n\s*\{/g, ',\n\n{');
  // This doesn't add a comma, but let's check for cases where }, is followed by newline and {
  content = content.replace(/,\s*\n\s*\{/g, ',\n{');
  if (content.length !== before5) fixes++;
  
  // More aggressive: find any } that's not followed by , or ] or } and is followed by {
  const before6 = content.length;
  content = content.replace(/\}(?![\s,}\]])/g, (match, offset) => {
    // Check if next non-whitespace char is {
    const after = content.substring(offset + 1).trim();
    if (after.startsWith('{')) {
      return '},';
    }
    return match;
  });
  if (content.length !== before6) fixes++;
  
  // Fix specific case: }, \n \n { at start of line (no indentation)
  const before7 = content.length;
  content = content.replace(/,\s*\n\s*\n\{/g, ',\n\n{');
  if (content.length !== before7) fixes++;
  
  // Fix: }, \n { at start of line (missing comma before {)
  const before8 = content.length;
  // Pattern: }, \n { (where { is at start of line, no comma before it)
  // But we need to add a comma before the {, not after the },
  content = content.replace(/,\s*\n\{/g, ',\n{');
  // Also fix: } \n { at start of line (when } doesn't have comma)
  content = content.replace(/\}\s*\n\{/g, '},\n{');
  // More specific: }, followed by newline, then { at start of line (add comma before {)
  content = content.replace(/,\s*\r?\n\{/g, ',\n{');
  if (content.length !== before8) fixes++;
  
  // Fix specific pattern: }, \n { where { starts a new object (needs comma)
  // Actually, if we have }, that's correct. The issue is when we have }, \n { - the { needs a comma before it
  // But that doesn't make sense. Let me think...
  // If we have: }, \n { - this means: close object with comma, newline, start new object
  // This is actually correct syntax! The comma after } closes the previous object in the array.
  // So the issue must be something else. Let me check the actual error location.
  
  // Actually, I think the issue is: }, \n { where the { is starting a new city object
  // But there's no comma between the closing } and the opening {. Wait, that's not right either.
  // Let me look at the actual structure: cities: [ { ... }, { ... } ]
  // So }, closes one city, and { starts the next. The comma is already there after }.
  // So the pattern }, \n { is actually correct!
  
  // The real issue might be that line 53's { should be indented, or there's a missing comma somewhere else.
  // Let me try a different approach: find cases where }, is followed by newline and { at column 0
  // and ensure there's proper structure.
  
  // Actually, wait - I see it now. Line 52 has: }, (comma and closing brace)
  // Line 53 has: { (opening brace at column 0)
  // This is actually valid! The comma after } closes the previous array element.
  // So }, \n { is valid syntax.
  
  // The error must be something else. Let me check if there are other issues.
}

console.log(`  Fixed missing commas: ${fixes} patterns found and fixed`);

// Fix 2: Escape apostrophes in strings (but NOT closing quotes)
// Pattern: 'Jackson's Gap' -> 'Jackson\'s Gap'
// We need to be very careful - only escape apostrophes that are clearly inside strings
fixes = 0;
// Fix apostrophes in name property values
// Match: name: 'Text's Text' or name: 'O'Connor'
// Use a more precise pattern that doesn't match the closing quote
content = content.replace(/name:\s*'((?:[^']|'[st]|'[A-Z])+)'/g, (match, innerContent) => {
  // Check if this string actually contains an unescaped apostrophe
  // Look for pattern: letter'letter (apostrophe between letters)
  if (/'[a-zA-Z]/.test(innerContent) && !/\\'/.test(innerContent)) {
    fixes++;
    // Escape apostrophes that are between letters (not at the end)
    const escaped = innerContent.replace(/([a-zA-Z])'([a-zA-Z])/g, "$1\\'$2");
    return `name: '${escaped}'`;
  }
  return match;
});
console.log(`  Fixed apostrophes in name strings: ${fixes} occurrences`);

// Fix apostrophes in other string properties
let fixes2 = 0;
content = content.replace(/(state|county|size|confidence):\s*'((?:[^']|'[st]|'[A-Z])+)'/g, (match, prop, innerContent) => {
  if (/'[a-zA-Z]/.test(innerContent) && !/\\'/.test(innerContent)) {
    fixes2++;
    const escaped = innerContent.replace(/([a-zA-Z])'([a-zA-Z])/g, "$1\\'$2");
    return `${prop}: '${escaped}'`;
  }
  return match;
});
console.log(`  Fixed apostrophes in other string properties: ${fixes2} occurrences`);

// Fix 2.5: Fix escaped closing quotes (this should not happen, but fix if it does)
// Pattern: 'Text\' -> 'Text'
let fixes25 = 0;
content = content.replace(/([a-zA-Z])\\'([,\s\n\}])/g, (match, letter, after) => {
  fixes25++;
  return `${letter}'${after}`;
});
if (fixes25 > 0) {
  console.log(`  Fixed escaped closing quotes: ${fixes25} occurrences`);
}

// Fix 3: Fix double backslashes before apostrophes
// Pattern: 'Name\\'s' -> 'Name\'s'
fixes = 0;
content = content.replace(/\\\\'/g, "\\'");
if (content !== previousContent) {
  fixes = (previousContent.match(/\\\\'/g) || []).length;
  previousContent = content;
}
console.log(`  Fixed double backslashes before apostrophes: ${fixes} occurrences`);

// Fix 4: Fix corrupted names like "Jacksons's" -> "Jackson's"
fixes = 0;
content = content.replace(/name:\s*'Jacksons\\'s\s+([^']+)'/g, (match, rest) => {
  fixes++;
  return `name: 'Jackson\\'s ${rest}'`;
});
console.log(`  Fixed corrupted 'Jacksons's' names: ${fixes} occurrences`);

// Fix 5: Corrupted names with double escaped apostrophes
// Pattern: 'Name\'s's' -> 'Name\'s'
fixes = 0;
content = content.replace(/name:\s*'([^']*)\\'s's'/g, (match, prefix) => {
  fixes++;
  return `name: '${prefix}\\'s'`;
});
console.log(`  Fixed corrupted names with double apostrophes: ${fixes} occurrences`);

// Fix 6: Fix quadrupled/tripled names
// Pattern: 'Port O'Connor'Connor'Connor'Connor' -> 'Port O\'Connor'
fixes = 0;
content = content.replace(/name:\s*'([^']+)'([A-Za-z]+)'(?:\2')+/g, (match, prefix, repeated) => {
  fixes++;
  const baseName = `${prefix}'${repeated}`;
  return `name: '${baseName.replace(/'/g, "\\'")}'`;
});
console.log(`  Fixed quadrupled/tripled names: ${fixes} occurrences`);

// Fix 4: Fix unclosed quotes
// Pattern: name: 'Text' Text' -> name: 'Text Text'
fixes = 0;
content = content.replace(/name:\s*'([^']*)'\s+([A-Za-z][^']*)'/g, (match, p1, p2) => {
  fixes++;
  if (p2.match(/^(Gap|Lakes|s\s|'s\s|Connor)/i)) {
    if (p2.startsWith("Connor")) {
      return `name: '${p1}'`;
    }
    return `name: '${p1}'s ${p2.replace(/^s\s+/, '').replace(/^'s\s+/, '')}'`;
  }
  return `name: '${p1} ${p2}'`;
});
console.log(`  Fixed unclosed quotes: ${fixes} occurrences`);

// Fix 5: Fix double commas (be more aggressive)
fixes = 0;
const before5 = content.length;
// Fix double commas anywhere
content = content.replace(/,\s*,/g, ',');
// Fix triple commas
content = content.replace(/,\s*,\s*,/g, ',');
// Fix pattern: } ] },, -> } ] }, (double comma after closing)
// Try multiple variations to catch all cases
content = content.replace(/\}\s*\]\s*\}\s*,\s*,/g, '} ] },');
content = content.replace(/\}\s*\]\s*\}\s*,\s*,\s*/g, '} ] },');
content = content.replace(/\}\s*\]\s*\}\s*,\s*,\s*\n/g, '} ] },\n');
// Fix pattern: }, }, -> },
content = content.replace(/,\s*\}\s*,/g, '},');
// Fix pattern: ] }, , -> ] }, (comma after ] },)
content = content.replace(/\]\s*\}\s*,\s*,/g, '] },');
// More aggressive: find any }, followed by comma, comma
content = content.replace(/\}\s*,\s*,\s*/g, '}, ');
// Fix: }, , -> },
content = content.replace(/,\s*,\s*([}\]])/g, '$1');
if (content.length !== before5) fixes = (before5 - content.length) / 2; // Rough estimate
console.log(`  Fixed double/triple commas: ${fixes} occurrences`);

// Fix 6: Fix trailing commas before } or ]
fixes = 0;
const before6 = content.length;
content = content.replace(/,\s*([}\]])/g, '$1');
if (content.length !== before6) fixes = (before6 - content.length) / 2; // Rough estimate
console.log(`  Fixed trailing commas: ${fixes} occurrences`);

// Fix 7: Fix missing commas after closing brackets before new objects
fixes = 0;
const before7 = content.length;
content = content.replace(/\]\s*\{/g, '], {');
// Fix pattern: }, { on new line without comma
content = content.replace(/\}\s*\n\s*\{/g, '},\n{');
// Fix pattern: } { on same line without comma  
content = content.replace(/\}\s*\{/g, '}, {');
// Fix pattern: city object starting at beginning of line after another city (missing indentation)
// Pattern: }, \n{ name: -> }, \n          { name: (but only if it's not already properly formatted)
content = content.replace(/,\s*\n\{ name:/g, ',\n          { name:');
// Fix pattern: }] }, (city object closing, array closing, county closing on same line)
// This pattern is actually VALID JavaScript/TypeScript syntax
// Don't try to "fix" it - it's not broken
// The issue is elsewhere in the structure
if (content.length !== before7) fixes++;
console.log(`  Fixed missing commas after ] and }: ${fixes} occurrences`);

// Fix 7.5: Fix pattern where cities array closes incorrectly
// Pattern: ], }, should be ] }, (missing space or comma issue)
fixes = 0;
const before75 = content.length;
// Fix: }] }, -> }] }, (pattern where closing brace and bracket are together)
content = content.replace(/\}\]\s*,\s*\}/g, '}] },');
// Fix: } ], }, -> } ] }, (pattern with closing brace before array)
content = content.replace(/\}\s*\]\s*,\s*\}/g, '} ] },');
// Fix: ], }, -> ] }, (this is the main issue - comma before closing brace)
content = content.replace(/\]\s*,\s*\}/g, '] },');
// Fix empty cities arrays: cities: [ ], }, -> cities: [ ] },
content = content.replace(/cities:\s*\[\s*\]\s*,\s*\}/g, 'cities: [ ] },');
// Fix: ] }, -> ] },
content = content.replace(/\]\s*\},\s*\{/g, '] },\n{');
if (content.length !== before75) fixes++;
if (fixes > 0) console.log(`  Fixed array closing patterns: ${fixes} occurrences`);

// Fix 8: Remove duplicate export statements (keep only the last one)
const exportMatches = [...content.matchAll(/export const US_STATES_WITH_COUNTIES: USState\[\] = \[/g)];
if (exportMatches.length > 1) {
  console.log(`  Found ${exportMatches.length} export statements, keeping only the last one...`);
  // Find the last export statement
  const lastExportIndex = exportMatches[exportMatches.length - 1].index;
  // Find the first export statement
  const firstExportIndex = exportMatches[0].index;
  // Find where the first array ends (look for the matching closing bracket)
  // This is complex, so let's just remove everything before the last export
  // Actually, let's be more careful - find the array start after the first export
  const firstArrayStart = content.indexOf('[', firstExportIndex);
  if (firstArrayStart !== -1 && firstArrayStart < lastExportIndex) {
    // Find the matching closing bracket for the first array
    let bracketDepth = 0;
    let firstArrayEnd = -1;
    for (let i = firstArrayStart; i < lastExportIndex; i++) {
      if (content[i] === '[') bracketDepth++;
      else if (content[i] === ']') {
        bracketDepth--;
        if (bracketDepth === 0) {
          firstArrayEnd = i;
          break;
        }
      }
    }
    if (firstArrayEnd !== -1) {
      // Remove everything from the first export to just before the last export
      // But keep the interfaces and the last export
      const beforeFirstExport = content.substring(0, firstExportIndex);
      const afterFirstArray = content.substring(firstArrayEnd + 1, lastExportIndex);
      const fromLastExport = content.substring(lastExportIndex);
      // Only keep if there's actual duplicate content
      if (afterFirstArray.trim().length > 0) {
        content = beforeFirstExport + fromLastExport;
        console.log(`  Removed duplicate export and content`);
      }
    }
  }
}

// Fix 9: Ensure proper closing of the main array
// The file should end with: ]\n};
const trimmedEnd = content.trimEnd();
if (!trimmedEnd.endsWith('];')) {
  // Check if it ends with just ] or ];
  if (trimmedEnd.endsWith(']')) {
    content = content.replace(/\s*\]\s*$/, '\n];');
  } else if (trimmedEnd.endsWith('];')) {
    // Already correct
  } else {
    console.warn('  Warning: File does not end with ];');
  }
}

// Write the fixed file
console.log('\nWriting fixed file...');
fs.writeFileSync(inputFile, content);

const newLength = content.length;
const diff = newLength - originalLength;

console.log(`\n✓ Fixes complete!`);
console.log(`  Original length: ${originalLength.toLocaleString()} characters`);
console.log(`  New length: ${newLength.toLocaleString()} characters`);
console.log(`  Difference: ${diff > 0 ? '+' : ''}${diff.toLocaleString()} characters`);
console.log(`  Backup saved to: ${backupFile}`);

// Verify the file can be parsed by TypeScript (basic check)
console.log('\nVerifying syntax...');
try {
  // Try to require it (this will fail if there are syntax errors)
  // Actually, we can't require a .ts file directly, so let's just check for common errors
  const errorPatterns = [
    /\}\s*\n\s*\n\s*\{/g,  // Missing comma
    /,\s*,/g,  // Double comma
    /\]\s*\{/g,  // Missing comma after ]
  ];
  
  let errorsFound = 0;
  errorPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      errorsFound += matches.length;
      console.warn(`  ⚠ Still found ${matches.length} instances of pattern ${index + 1}`);
    }
  });
  
  if (errorsFound === 0) {
    console.log('  ✓ No obvious syntax errors found');
  } else {
    console.warn(`  ⚠ Found ${errorsFound} potential remaining issues`);
  }
} catch (e) {
  console.error(`  ✗ Error during verification: ${e.message}`);
}

console.log('\nDone!');

