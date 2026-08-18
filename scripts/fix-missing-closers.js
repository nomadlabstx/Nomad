/**
 * Fix missing closing brackets and braces in source file
 * Adds missing ] and } to balance the structure
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const backupFile = sourceFile + '.backup-closers';

console.log('🔧 Fixing Missing Closers');
console.log('==========================\n');

// Create backup
console.log('Step 1: Creating backup...');
if (fs.existsSync(backupFile)) {
  fs.unlinkSync(backupFile);
}
fs.copyFileSync(sourceFile, backupFile);
console.log('✓ Backup created\n');

// Read file
console.log('Step 2: Reading source file...');
const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');
console.log(`✓ File read: ${lines.length} lines\n`);

// States that need fixing
const statesToFix = [
  { name: 'Arkansas', code: 'AR', missingBrackets: 2, missingBraces: 3 },
  { name: 'California', code: 'CA', missingBrackets: 1, missingBraces: 1 },
  { name: 'Colorado', code: 'CO', missingBrackets: 2, missingBraces: 3 },
  { name: 'Connecticut', code: 'CT', missingBrackets: 2, missingBraces: 3 },
  { name: 'Florida', code: 'FL', missingBrackets: 1, missingBraces: 1 },
];

let totalFixes = 0;

// Find state boundaries and fix
function findStateEnd(stateName) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`name: '${stateName}'`)) {
      // Find the end - look for ] }, followed by next state
      for (let j = i + 10; j < lines.length; j++) {
        if (lines[j].trim() === '] },') {
          // Check if next state
          for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
            if (lines[k].trim() === '{' && lines[k+1] && lines[k+1].includes("name: '") && lines[k+2] && lines[k+2].includes("code: '")) {
              const nextStateName = lines[k+1].match(/name:\s*'([^']+)'/);
              if (nextStateName && nextStateName[1] !== stateName) {
                return j - 1; // The } line before ] },
              }
            }
          }
        }
      }
    }
  }
  return -1;
}

console.log('Step 3: Fixing missing closers...\n');

for (const state of statesToFix) {
  console.log(`Fixing ${state.name} (${state.code})...`);
  
  const endLine = findStateEnd(state.name);
  if (endLine === -1) {
    console.log(`  ⚠ Could not find end`);
    continue;
  }
  
  console.log(`  Found end at line ${endLine + 1}`);
  
  // The state should end with: ] on line endLine-1, } on line endLine
  // But we're missing brackets/braces, so we need to add them
  
  // Check what's actually on these lines
  const lineBeforeEnd = lines[endLine - 1]?.trim();
  const endLineContent = lines[endLine]?.trim();
  const lineAfterEnd = lines[endLine + 1]?.trim();
  
  console.log(`  Line ${endLine}: "${endLineContent}"`);
  console.log(`  Line ${endLine - 1}: "${lineBeforeEnd}"`);
  console.log(`  Line ${endLine + 1}: "${lineAfterEnd}"`);
  
  // Add missing brackets before the }
  if (state.missingBrackets > 0) {
    // Insert ] lines before the } line
    const insertPos = endLine;
    for (let i = 0; i < state.missingBrackets; i++) {
      lines.splice(insertPos, 0, ']');
      totalFixes++;
    }
    console.log(`  ✓ Added ${state.missingBrackets} closing bracket(s)`);
  }
  
  // Add missing braces after the brackets
  if (state.missingBraces > 0) {
    // The } should already be there, but we might need more
    // Actually, we need to add } after the ]
    const newEndLine = endLine + state.missingBrackets;
    for (let i = 0; i < state.missingBraces; i++) {
      lines.splice(newEndLine + 1, 0, '}');
      totalFixes++;
    }
    console.log(`  ✓ Added ${state.missingBraces} closing brace(s)`);
  }
  
  console.log(`  ✓ Fixed ${state.name}\n`);
}

// Write fixed file
console.log('Step 4: Writing fixed file...');
const fixedContent = lines.join('\n');
fs.writeFileSync(sourceFile, fixedContent, 'utf8');
console.log('✓ Fixed file written\n');

// Summary
console.log('='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log(`Total fixes: ${totalFixes}`);
console.log(`Backup saved to: ${backupFile}`);
console.log('='.repeat(50));
console.log('\n✓ All fixes complete!');

