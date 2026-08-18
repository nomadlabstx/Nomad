/**
 * Direct source file fixer - fixes errors at exact line numbers
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const backupFile = sourceFile + '.backup-direct';

console.log('🔧 Direct Source File Fixer');
console.log('===========================\n');

if (fs.existsSync(backupFile)) {
  fs.unlinkSync(backupFile);
}
fs.copyFileSync(sourceFile, backupFile);
console.log('✓ Backup created\n');

let lines = fs.readFileSync(sourceFile, 'utf8').split('\n');
let fixes = 0;

// Error locations from JSON parser
const errorLocations = [
  { state: 'Arkansas', line: 17003 + 1316 - 1 },
  { state: 'California', line: 18680 + 30 - 1 },
  { state: 'Colorado', line: 24950 + 1511 - 1 },
  { state: 'Connecticut', line: 26717 + 767 - 1 },
  { state: 'Florida', line: 27775 + 19 - 1 },
];

console.log('Inspecting error locations...\n');

for (const err of errorLocations) {
  if (err.line < 1 || err.line > lines.length) {
    console.log(`⚠ ${err.state}: Line ${err.line} out of range\n`);
    continue;
  }
  
  const lineIdx = err.line - 1;
  const line = lines[lineIdx];
  const prevLine = lineIdx > 0 ? lines[lineIdx - 1] : '';
  const nextLine = lineIdx < lines.length - 1 ? lines[lineIdx + 1] : '';
  
  console.log(`${err.state} (line ${err.line}):`);
  console.log(`  Before: ${prevLine.substring(0, 80)}`);
  console.log(`  Error:  ${line.substring(0, 80)}`);
  console.log(`  After:  ${nextLine.substring(0, 80)}`);
  
  // Fix: If line ends with } or ] and next line starts with { or [, add comma
  if (line.trim().endsWith('}') && nextLine.trim().startsWith('{')) {
    lines[lineIdx] = line.trim() + ',';
    fixes++;
    console.log(`  ✓ Added comma after closing brace\n`);
  } else if (line.trim().endsWith(']') && nextLine.trim().startsWith('{')) {
    lines[lineIdx] = line.trim() + ',';
    fixes++;
    console.log(`  ✓ Added comma after closing bracket\n`);
  } else if (line.trim().endsWith('}') && nextLine.trim().startsWith('[')) {
    lines[lineIdx] = line.trim() + ',';
    fixes++;
    console.log(`  ✓ Added comma after closing brace\n`);
  } else {
    console.log(`  ⚠ Could not auto-fix (manual inspection needed)\n`);
  }
}

// Write fixed file
console.log('Writing fixed file...');
fs.writeFileSync(sourceFile, lines.join('\n'), 'utf8');
console.log(`✓ Fixed file written (${fixes} fixes)\n`);

console.log('='.repeat(50));
console.log(`Total fixes: ${fixes}`);
console.log('='.repeat(50));

