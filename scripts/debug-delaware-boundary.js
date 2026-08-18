const fs = require('fs');
const content = fs.readFileSync('data/us-cities-with-counties.ts', 'utf8');
const lines = content.split('\n');

// Simulate findState for Delaware (FIXED VERSION)
function findState(stateName) {
  // Use allStates array which already correctly identifies state objects
  const stateInfo = allStates.find(s => s.name === stateName);
  if (stateInfo) {
    // Find the opening brace before the state name
    let startLine = stateInfo.line;
    for (let j = stateInfo.line - 1; j >= Math.max(0, stateInfo.line - 3); j--) {
      if (lines[j].includes('{')) {
        startLine = j;
        break;
      }
    }
    return startLine;
  }
  return -1;
}

// Simulate findStateEnd for Delaware
const allStates = [];
for (let i = 1; i < lines.length; i++) {
  const nameMatch = lines[i].match(/^\s*name:\s*'([^']+)',?\s*$/);
  const codeMatch = lines[i + 1]?.match(/^\s*code:\s*'([A-Z]{2})',?\s*$/);
  if (nameMatch && codeMatch && lines[i - 1].trim() === '{') {
    const nextFewLines = lines.slice(i, Math.min(i + 5, lines.length));
    const nextFewText = nextFewLines.join('\n');
    const hasCountiesArray = nextFewText.includes('counties: [');
    const isOnSameLine = lines[i].includes('counties: [') || lines[i].includes("state: '");
    if (hasCountiesArray && !isOnSameLine) {
      allStates.push({ name: nameMatch[1], code: codeMatch[1], line: i });
    }
  }
}

const deStart = findState('Delaware');
const deIndex = allStates.findIndex(s => s.name === 'Delaware');
const nextState = allStates[deIndex + 1];

console.log('Delaware start line (findState):', deStart);
console.log('Delaware in allStates at line:', allStates[deIndex].line);
console.log('Next state (Florida) at line:', nextState.line);
console.log('');

// Simulate findStateEnd
let endLine = -1;
for (let i = nextState.line - 1; i >= Math.max(deStart + 10, nextState.line - 10); i--) {
  if (i >= 0 && lines[i].trim() === '] },') {
    endLine = i;
    console.log('Found ] }, at line', i + 1);
    break;
  }
}

console.log('End line returned:', endLine);
console.log('');

console.log('Would extract: lines.slice(' + deStart + ', ' + (endLine + 1) + ')');
const extracted = lines.slice(deStart, endLine + 1);
console.log('Extracted', extracted.length, 'lines');
console.log('First line:', extracted[0].trim().substring(0, 50));
console.log('Last line:', extracted[extracted.length - 1].trim());
console.log('');

// Check if extracted lines contain other states
const extractedText = extracted.join('\n');
if (extractedText.includes("name: 'Alabama'")) {
  console.log('ERROR: Extracted lines contain Alabama!');
}
if (extractedText.includes("name: 'Alaska'")) {
  console.log('ERROR: Extracted lines contain Alaska!');
}
if (extractedText.includes("name: 'California'")) {
  console.log('ERROR: Extracted lines contain California!');
}
if (extractedText.includes("name: 'Colorado'")) {
  console.log('ERROR: Extracted lines contain Colorado!');
}

// Count counties in extracted
const countyMatches = extractedText.match(/^\s*name:\s*'([^']+County[^']*)',/gm);
console.log('Counties found in extracted:', countyMatches ? countyMatches.length : 0);
if (countyMatches) {
  const unique = [...new Set(countyMatches.map(m => m.match(/'([^']+)'/)[1]))];
  console.log('Unique counties:', unique.length);
  if (unique.length > 10) {
    console.log('First 10:', unique.slice(0, 10).join(', '));
  } else {
    console.log('All:', unique.join(', '));
  }
}

