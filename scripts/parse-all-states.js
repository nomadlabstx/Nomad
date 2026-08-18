/**
 * Parse ALL states using the robust line-by-line parser
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('📝 Parsing ALL States');
console.log('====================\n');

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// Find all states in the file
const allStates = [];
for (let i = 0; i < lines.length; i++) {
  const nameMatch = lines[i].match(/name:\s*'([^']+)'/);
  const codeMatch = lines[i + 1]?.match(/code:\s*'([^']+)'/);
  
  if (nameMatch && codeMatch && i > 0 && lines[i - 1].trim() === '{') {
    // Check if this is a state (has counties: [ after it)
    const nextFewLines = lines.slice(i, Math.min(i + 5, lines.length)).join('\n');
    if (nextFewLines.includes('counties: [')) {
      allStates.push({
        name: nameMatch[1],
        code: codeMatch[1],
        line: i
      });
    }
  }
}

console.log(`Found ${allStates.length} states in source file\n`);

// Import the parseState function from robust-line-parser
// Actually, let's just copy the logic here to process all states

function findState(stateName) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`name: '${stateName}'`)) {
      let startLine = i;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (lines[j].includes('{')) {
          startLine = j;
          break;
        }
      }
      return startLine;
    }
  }
  return -1;
}

function findStateEnd(startLine, stateName) {
  if (stateName === 'Illinois' || startLine === allStates[allStates.length - 1].line) {
    // Last state - find end of array
    for (let i = startLine + 10; i < lines.length; i++) {
      if (lines[i].trim() === ']' && i + 1 < lines.length && lines[i + 1].trim() === ';') {
        return i - 1;
      }
      if (lines[i].trim() === '];') {
        return i - 1;
      }
    }
    return lines.length - 1;
  }
  
  // Find next state
  const currentStateIndex = allStates.findIndex(s => s.name === stateName);
  if (currentStateIndex >= 0 && currentStateIndex < allStates.length - 1) {
    const nextState = allStates[currentStateIndex + 1];
    return nextState.line - 2; // Go back to before the next state's opening brace
  }
  
  // Fallback: look for ] },
  for (let i = startLine + 10; i < lines.length; i++) {
    if (lines[i].trim() === '] },') {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() === '{' && lines[j+1] && lines[j+1].includes("name: '") && lines[j+2] && lines[j+2].includes("code: '")) {
          const nextStateName = lines[j+1].match(/name:\s*'([^']+)'/);
          if (nextStateName && nextStateName[1] !== stateName) {
            return i - 1;
          }
        }
      }
    }
  }
  return -1;
}

// Copy the parseState function from robust-line-parser.js
// Actually, let's require it instead
const { parseState } = require('./robust-line-parser.js');

// Wait, that won't work. Let me just run the robust parser for all states by modifying it
console.log('Using robust-line-parser.js logic for all states...\n');

// Actually, the simplest approach: modify robust-line-parser.js to process all states
// But for now, let's just call it with all states
const robustParser = require('./robust-line-parser.js');

// The robust parser only has 6 states hardcoded. Let me create a version that processes all
console.log('Processing all states...\n');

// Read the robust parser and modify it
const robustParserContent = fs.readFileSync(path.join(__dirname, 'robust-line-parser.js'), 'utf8');

// Replace the targetStates array with all states
const newTargetStates = allStates.map(s => ({ name: s.name, code: s.code }));
const newContent = robustParserContent.replace(
  /const targetStates = \[[\s\S]*?\];/,
  `const targetStates = ${JSON.stringify(newTargetStates, null, 2).replace(/"/g, "'").replace(/'/g, "'")};`
);

// Write temporary file
const tempParser = path.join(__dirname, 'robust-line-parser-all.js');
fs.writeFileSync(tempParser, newContent, 'utf8');

// Run it
console.log('Running parser for all states...\n');
require(tempParser);

// Clean up
fs.unlinkSync(tempParser);

console.log('\n✓ All states processed!');

