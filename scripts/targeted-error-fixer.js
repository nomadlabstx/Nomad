/**
 * Targeted error fixer - actually parses content to find exact errors
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const backupFile = sourceFile + '.backup-targeted';

console.log('🎯 Targeted Error Fixer');
console.log('========================\n');

// Create backup
if (fs.existsSync(backupFile)) {
  fs.unlinkSync(backupFile);
}
fs.copyFileSync(sourceFile, backupFile);
console.log('✓ Backup created\n');

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// States to fix
const statesToFix = [
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Florida', code: 'FL' },
  { name: 'Illinois', code: 'IL' },
];

let totalFixes = 0;

// Find state boundaries
function findStateBoundaries(stateName) {
  let startLine = -1;
  let endLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`name: '${stateName}'`)) {
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (lines[j].includes('{')) {
          startLine = j;
          break;
        }
      }
      if (startLine === -1) startLine = i - 1;
      break;
    }
  }
  
  if (startLine === -1) return null;
  
  for (let i = startLine + 10; i < lines.length; i++) {
    if (lines[i].trim() === '] },') {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() === '{' && lines[j+1] && lines[j+1].includes("name: '") && lines[j+2] && lines[j+2].includes("code: '")) {
          const nextStateName = lines[j+1].match(/name:\s*'([^']+)'/);
          if (nextStateName && nextStateName[1] !== stateName) {
            endLine = i - 1;
            break;
          }
        }
      }
      if (endLine >= 0) break;
    }
  }
  
  return { startLine, endLine };
}

// Try to find and fix the exact error
function fixStateErrors(stateName, code) {
  console.log(`\nFixing ${stateName} (${code})...`);
  
  const bounds = findStateBoundaries(stateName);
  if (!bounds || bounds.endLine === -1) {
    console.log(`  ⚠ Could not find boundaries`);
    return 0;
  }
  
  console.log(`  Found: lines ${bounds.startLine + 1} to ${bounds.endLine + 1}`);
  
  let stateContent = lines.slice(bounds.startLine, bounds.endLine + 1).join('\n');
  let fixes = 0;
  let attempts = 0;
  const maxAttempts = 10;
  
  // Remove content before opening brace
  const firstBrace = stateContent.indexOf('{');
  if (firstBrace > 0) {
    stateContent = stateContent.substring(firstBrace);
  }
  
  // Try to parse and fix iteratively
  while (attempts < maxAttempts) {
    attempts++;
    
    // Check balance and add closers
    let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
    let inString = false, stringChar = null, escaped = false;
    
    for (let i = 0; i < stateContent.length; i++) {
      const char = stateContent[i];
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
    
    // Add missing closers
    if (bracketBalance > 0 || braceBalance > 0) {
      for (let i = 0; i < bracketBalance; i++) stateContent += '\n]';
      for (let i = 0; i < braceBalance; i++) stateContent += '\n}';
      fixes += bracketBalance + braceBalance;
      console.log(`  Added ${bracketBalance} ] and ${braceBalance} }`);
    }
    
    // Try to parse
    try {
      const obj = eval(`(${stateContent})`);
      if (obj && obj.name && obj.code) {
        console.log(`  ✓ Successfully parsed after ${attempts} attempt(s)!`);
        // Update the source file lines
        const fixedLines = stateContent.split('\n');
        lines.splice(bounds.startLine, bounds.endLine - bounds.startLine + 1, ...fixedLines);
        // Adjust line numbers for subsequent states
        const lineDiff = fixedLines.length - (bounds.endLine - bounds.startLine + 1);
        return { fixes, lineDiff };
      }
    } catch (error) {
      const errorMsg = error.message;
      
      // Try to fix specific errors
      if (errorMsg.includes('Unexpected identifier')) {
        const idMatch = errorMsg.match(/Unexpected identifier '([^']+)'/);
        if (idMatch) {
          const badId = idMatch[1];
          const idPos = stateContent.indexOf(badId);
          
          if (idPos >= 0) {
            // Check context around the error
            const before = stateContent.substring(Math.max(0, idPos - 50), idPos);
            const after = stateContent.substring(idPos, Math.min(stateContent.length, idPos + 50));
            
            // If it's a bare identifier that should be quoted
            // Pattern: : identifier (where identifier should be a string)
            const beforeMatch = before.match(/([:\s])([A-Za-z][A-Za-z\s]*)$/);
            if (beforeMatch && !before.includes("'") && !before.includes('"')) {
              // This might be an unquoted string value
              // Try adding quotes
              const quotePattern = new RegExp(`([:\\s])${badId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[,\\s\\n\\}])`, 'g');
              stateContent = stateContent.replace(quotePattern, `$1'${badId}'`);
              fixes++;
              console.log(`  Fixed unquoted identifier: "${badId}"`);
              continue;
            }
          }
        }
      }
      
      // If we can't fix it, break
      console.log(`  ⚠ Could not fix: ${errorMsg.substring(0, 100)}`);
      break;
    }
  }
  
  return { fixes, lineDiff: 0 };
}

// Fix each state
console.log('Fixing states...\n');
let lineOffset = 0;

for (const state of statesToFix) {
  const result = fixStateErrors(state.name, state.code);
  if (result && result.fixes > 0) {
    totalFixes += result.fixes;
    lineOffset += result.lineDiff || 0;
  }
}

// Write fixed file
console.log('\nWriting fixed file...');
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
console.log('\n✓ Fixes complete!');

