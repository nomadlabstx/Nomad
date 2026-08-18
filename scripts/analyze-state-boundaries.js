const fs = require('fs');

console.log('=== ANALYZING MAIN FILE STRUCTURE ===\n');

const mainContent = fs.readFileSync('data/us-cities-with-counties.ts', 'utf8');
const mainLines = mainContent.split('\n');

const states = [];
for (let i = 0; i < mainLines.length; i++) {
  const nameMatch = mainLines[i].match(/^\s*name:\s*'([^']+)',?\s*$/);
  const codeMatch = mainLines[i + 1]?.match(/^\s*code:\s*'([A-Z]{2})',?\s*$/);
  if (nameMatch && codeMatch && mainLines[i - 1]?.trim() === '{') {
    const nextFew = mainLines.slice(i, Math.min(i + 5, mainLines.length)).join('\n');
    if (nextFew.includes('counties: [')) {
      states.push({ name: nameMatch[1], code: codeMatch[1], startLine: i - 1 });
    }
  }
}

console.log(`Found ${states.length} states in main file:\n`);
states.forEach((s, idx) => {
  const nextState = states[idx + 1];
  const endLine = nextState ? nextState.startLine - 1 : mainLines.length - 1;
  const lineCount = endLine - s.startLine + 1;
  console.log(`${idx + 1}. ${s.name} (${s.code}): lines ${s.startLine + 1} to ${endLine + 1} (${lineCount} lines)`);
});

console.log('\n=== ANALYZING INDIANA FILE STRUCTURE ===\n');

const inContent = fs.readFileSync('data/us-states/in-cities.ts', 'utf8');
const inLines = inContent.split('\n');

console.log(`Indiana file total lines: ${inLines.length}\n`);

// Find all Indiana state objects
const inMatches = [];
for (let i = 0; i < inLines.length; i++) {
  if (inLines[i].includes("name: 'Indiana'") && inLines[i + 1] && inLines[i + 1].includes("code: 'IN'")) {
    const nextFew = inLines.slice(i, Math.min(i + 5, inLines.length)).join('\n');
    if (nextFew.includes('counties: [')) {
      let startLine = i - 1;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (inLines[j].trim() === '{') {
          startLine = j;
          break;
        }
      }
      inMatches.push({ line: i + 1, startLine: startLine + 1 });
    }
  }
}

console.log(`Found ${inMatches.length} Indiana state objects:\n`);
inMatches.forEach((m, idx) => {
  console.log(`  ${idx + 1}. At line ${m.line}, start at line ${m.startLine}`);
});

if (inMatches.length > 0) {
  const lastMatch = inMatches[inMatches.length - 1];
  console.log(`\nLast occurrence at line ${lastMatch.line} (start: ${lastMatch.startLine})`);
  console.log('Finding end...\n');
  
  // Find the end - look for }; or next state
  let endLine = -1;
  for (let i = lastMatch.startLine + 10; i < inLines.length; i++) {
    if (inLines[i].trim() === '};') {
      endLine = i + 1;
      console.log(`  Found }; at line ${i + 1}`);
      break;
    }
    // Check if next state starts
    if (inLines[i].trim() === '] },') {
      const nextFew = inLines.slice(i + 1, Math.min(i + 5, inLines.length));
      const nextText = nextFew.join('\n');
      if (nextText.includes("name: '") && nextText.includes("code: '") && !nextText.includes("code: 'IN'")) {
        endLine = i + 1;
        console.log(`  Found next state at line ${i + 1}`);
        break;
      }
    }
  }
  
  if (endLine === -1) {
    endLine = inLines.length;
  }
  
  console.log(`\nWould extract lines ${lastMatch.startLine} to ${endLine} (${endLine - lastMatch.startLine + 1} lines)`);
  
  // Count counties in this section
  const stateLines = inLines.slice(lastMatch.startLine - 1, endLine);
  const text = stateLines.join('\n');
  const countyMatches = text.match(/^\s*name:\s*'([^']+County[^']*)',/gm);
  if (countyMatches) {
    const unique = [...new Set(countyMatches.map(m => m.match(/'([^']+)'/)[1]))];
    console.log(`\nCounties found: ${countyMatches.length} matches, ${unique.length} unique`);
    
    // Filter to only Indiana counties (check if cities have state: 'Indiana' or stateCode: 'IN')
    const indianaCounties = new Set();
    for (let i = 0; i < stateLines.length; i++) {
      if (stateLines[i].includes("name: '") && stateLines[i].includes("County")) {
        // Check if this county has cities with state: 'Indiana'
        const next50 = stateLines.slice(i, Math.min(i + 50, stateLines.length)).join('\n');
        if (next50.includes("state: 'Indiana'") || next50.includes("stateCode: 'IN'")) {
          const nameMatch = stateLines[i].match(/name:\s*'([^']+)'/);
          if (nameMatch) {
            indianaCounties.add(nameMatch[1]);
          }
        }
      }
    }
    console.log(`Indiana counties (with IN cities): ${indianaCounties.size}`);
    if (indianaCounties.size <= 20) {
      console.log('Counties:', Array.from(indianaCounties).join(', '));
    }
  }
}

