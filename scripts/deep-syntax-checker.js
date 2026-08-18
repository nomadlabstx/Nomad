/**
 * Deep syntax checker - actually tries to parse each state to find real errors
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');

console.log('🔍 Deep Syntax Checker');
console.log('=======================\n');

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// States to check
const statesToCheck = [
  { name: 'Arkansas', code: 'AR', startLine: 17003 },
  { name: 'California', code: 'CA', startLine: 18680 },
  { name: 'Colorado', code: 'CO', startLine: 24950 },
  { name: 'Connecticut', code: 'CT', startLine: 26717 },
  { name: 'Florida', code: 'FL', startLine: 0 }, // Will find
  { name: 'Illinois', code: 'IL', startLine: 0 }, // Will find
];

// Find state boundaries (using same logic as simple extractor)
function findStateBoundaries(stateName) {
  let startLine = -1;
  let endLine = -1;
  
  // Find the line with name: 'StateName'
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`name: '${stateName}'`)) {
      // Found the name line, now look back for the opening brace
      let braceLine = i;
      let bracePos = -1;
      
      // Check current line first
      if (lines[i].includes('{')) {
        bracePos = lines[i].indexOf('{');
      } else {
        // Look back up to 3 lines
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          if (lines[j].includes('{')) {
            braceLine = j;
            bracePos = lines[j].indexOf('{');
            break;
          }
        }
      }
      
      if (bracePos >= 0) {
        startLine = braceLine;
        break;
      }
    }
  }
  
  if (startLine === -1) return null;
  
  // Find end - look for ] }, followed by { and next state with code:
  let lastStateEndLine = -1;
  for (let i = startLine + 10; i < lines.length; i++) {
    if (lines[i].trim() === '] },') {
      // Check if the lines after this ] }, start a new state
      let foundNextState = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() === '{') {
          // Check if the line after that has name: 'NextState' AND code: 'XX'
          if (lines[j+1] && lines[j+1].includes("name: '") && lines[j+2] && lines[j+2].includes("code: '")) {
            const nextStateName = lines[j+1].match(/name:\s*'([^']+)'/);
            if (nextStateName && nextStateName[1] !== stateName) {
              // Found next state! This ] }, is the boundary
              foundNextState = true;
              lastStateEndLine = i - 1; // End at the } before ] },
              break;
            }
          }
        }
      }
      if (foundNextState) break;
    }
  }
  
  if (lastStateEndLine >= 0) {
    endLine = lastStateEndLine;
  }
  
  return { startLine, endLine };
}

// Try to parse a state and find the exact error
function checkState(stateName, code) {
  console.log(`\nChecking ${stateName} (${code})...`);
  
  const bounds = findStateBoundaries(stateName);
  if (!bounds || bounds.endLine === -1) {
    console.log(`  ⚠ Could not find boundaries`);
    return false;
  }
  
  console.log(`  Found: lines ${bounds.startLine + 1} to ${bounds.endLine + 1}`);
  
  // Extract content
  let stateContent = lines.slice(bounds.startLine, bounds.endLine + 1).join('\n');
  
  // Try to parse
  try {
    const obj = eval(`(${stateContent})`);
    console.log(`  ✓ Parses successfully!`);
    return true;
  } catch (error) {
    const errorMsg = error.message;
    console.log(`  ✗ Parse error: ${errorMsg.substring(0, 100)}`);
    
    // Try to find the error location
    if (errorMsg.includes('position') || errorMsg.includes('line')) {
      const posMatch = errorMsg.match(/position (\d+)/);
      const lineMatch = errorMsg.match(/line (\d+)/);
      
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const context = stateContent.substring(Math.max(0, pos - 100), Math.min(stateContent.length, pos + 100));
        console.log(`  Error at position ${pos}:`);
        console.log(`  ...${context}...`);
      } else if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]);
        const actualLine = bounds.startLine + lineNum - 1;
        if (actualLine >= 0 && actualLine < lines.length) {
          console.log(`  Error around line ${actualLine + 1}:`);
          console.log(`  ${lines[actualLine]}`);
          if (actualLine > 0) console.log(`  ${lines[actualLine - 1]}`);
          if (actualLine < lines.length - 1) console.log(`  ${lines[actualLine + 1]}`);
        }
      }
    }
    
    // Check for common issues
    if (errorMsg.includes('Unexpected identifier')) {
      const idMatch = errorMsg.match(/Unexpected identifier '([^']+)'/);
      if (idMatch) {
        const badId = idMatch[1];
        console.log(`  ⚠ Found unexpected identifier: "${badId}"`);
        // Find all occurrences
        const occurrences = [];
        let searchPos = 0;
        while ((searchPos = stateContent.indexOf(badId, searchPos)) >= 0) {
          const context = stateContent.substring(Math.max(0, searchPos - 50), Math.min(stateContent.length, searchPos + 50));
          occurrences.push({ pos: searchPos, context });
          searchPos += badId.length;
        }
        console.log(`  Found ${occurrences.length} occurrences of "${badId}"`);
        if (occurrences.length > 0 && occurrences.length < 10) {
          occurrences.forEach((occ, idx) => {
            console.log(`    ${idx + 1}. Position ${occ.pos}: ...${occ.context}...`);
          });
        }
      }
    }
    
    return false;
  }
}

// Check all states
let successCount = 0;
for (const state of statesToCheck) {
  if (checkState(state.name, state.code)) {
    successCount++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${successCount}/${statesToCheck.length} states parse successfully`);
console.log('='.repeat(50));

