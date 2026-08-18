/**
 * Fix extraction issues - ensure extracted content is valid JavaScript
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');

console.log('🔧 Fixing Extraction Issues');
console.log('============================\n');

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// Fix issue: Ensure state objects are properly closed
// The problem might be that extracted content is missing the closing ] or }

let fixes = 0;

// Check each state boundary
const statePattern = /name:\s*'([^']+)',\s*\n\s*code:\s*'([A-Z]{2})'/g;
const states = [];
let match;

while ((match = statePattern.exec(content)) !== null) {
  const stateName = match[1];
  const stateCode = match[2];
  const lineNum = content.substring(0, match.index).split('\n').length;
  states.push({ name: stateName, code: stateCode, line: lineNum });
}

console.log(`Found ${states.length} states\n`);

// For each failing state, check and fix structure
const failingStates = ['Arkansas', 'California', 'Colorado', 'Connecticut', 'Florida', 'Illinois'];

for (const stateName of failingStates) {
  const state = states.find(s => s.name === stateName);
  if (!state) {
    console.log(`⚠ ${stateName} not found in states list`);
    continue;
  }
  
  console.log(`\nChecking ${stateName} (${state.code}) at line ${state.line}...`);
  
  // Find boundaries
  let startLine = -1;
  for (let i = state.line - 1; i < lines.length && i < state.line + 5; i++) {
    if (lines[i].includes(`name: '${stateName}'`)) {
      // Look back for {
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
  
  if (startLine === -1) {
    console.log(`  ⚠ Could not find start`);
    continue;
  }
  
  // Find end
  let endLine = -1;
  for (let i = startLine + 10; i < lines.length; i++) {
    if (lines[i].trim() === '] },') {
      // Check if next state
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() === '{' && lines[j+1] && lines[j+1].includes("name: '") && lines[j+2] && lines[j+2].includes("code: '")) {
          const nextStateName = lines[j+1].match(/name:\s*'([^']+)'/);
          if (nextStateName && nextStateName[1] !== stateName) {
            endLine = i - 1; // The } before ] },
            break;
          }
        }
      }
      if (endLine >= 0) break;
    }
  }
  
  if (endLine === -1) {
    console.log(`  ⚠ Could not find end`);
    continue;
  }
  
  console.log(`  Found: lines ${startLine + 1} to ${endLine + 1}`);
  
  // Check structure
  const stateLines = lines.slice(startLine, endLine + 1);
  const stateContent = stateLines.join('\n');
  
  // Check if it starts with {
  if (!stateContent.trim().startsWith('{')) {
    console.log(`  ⚠ Does not start with {`);
    // Find first {
    const firstBrace = stateContent.indexOf('{');
    if (firstBrace > 0) {
      console.log(`  Found { at position ${firstBrace}, removing ${firstBrace} chars before it`);
      // This would require modifying the source file, which is complex
    }
  }
  
  // Check if it ends with }
  const trimmed = stateContent.trim();
  if (!trimmed.endsWith('}')) {
    console.log(`  ⚠ Does not end with }`);
    console.log(`  Last 50 chars: ${trimmed.substring(Math.max(0, trimmed.length - 50))}`);
  }
  
  // Check for balanced braces/brackets
  let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
  let inString = false, stringChar = null, escaped = false;
  
  for (let i = 0; i < stateContent.length; i++) {
    const char = stateContent[i];
    
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
  
  console.log(`  Braces: ${openBraces} open, ${closeBraces} close (balance: ${braceBalance})`);
  console.log(`  Brackets: ${openBrackets} open, ${closeBrackets} close (balance: ${bracketBalance})`);
  
  if (braceBalance !== 0 || bracketBalance !== 0) {
    console.log(`  ⚠ Unbalanced! Missing ${braceBalance > 0 ? braceBalance : -braceBalance} closing brace(s)`);
    console.log(`  Missing ${bracketBalance > 0 ? bracketBalance : -bracketBalance} closing bracket(s)`);
    
    // Try to fix by adding missing closers
    if (braceBalance > 0 || bracketBalance > 0) {
      // Need to add closing brackets/braces
      // But we can't easily do this without knowing the exact structure
      console.log(`  Would need to add ${bracketBalance} ] and ${braceBalance} }`);
    }
  } else {
    console.log(`  ✓ Structure balanced`);
  }
  
  // Try to parse
  try {
    const obj = eval(`(${stateContent})`);
    console.log(`  ✓ Parses successfully!`);
  } catch (error) {
    console.log(`  ✗ Parse error: ${error.message.substring(0, 100)}`);
    
    // Try with added closing brackets/braces
    if (bracketBalance > 0 || braceBalance > 0) {
      let testContent = stateContent;
      for (let i = 0; i < bracketBalance; i++) testContent += ']';
      for (let i = 0; i < braceBalance; i++) testContent += '}';
      
      try {
        const obj = eval(`(${testContent})`);
        console.log(`  ✓ Parses with added closers!`);
        console.log(`  Need to add ${bracketBalance} ] and ${braceBalance} } to source file`);
      } catch (e) {
        console.log(`  ✗ Still fails even with added closers`);
      }
    }
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log('Analysis complete');
console.log('='.repeat(50));

