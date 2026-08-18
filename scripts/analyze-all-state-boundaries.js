/**
 * Comprehensive analysis of state boundaries in both main file and individual state files
 * This will map exactly where each state begins and ends
 */

const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const stateDir = path.join(__dirname, '../data/us-states');
const outputFile = path.join(__dirname, '../data/state-boundaries-analysis.json');

console.log('=== COMPREHENSIVE STATE BOUNDARY ANALYSIS ===\n');

const analysis = {
  mainFile: {},
  individualFiles: {},
  timestamp: new Date().toISOString()
};

// ============================================
// 1. ANALYZE MAIN FILE
// ============================================
console.log('1. Analyzing main file (us-cities-with-counties.ts)...\n');

const mainContent = fs.readFileSync(mainFile, 'utf8');
const mainLines = mainContent.split('\n');

const mainStates = [];
for (let i = 0; i < mainLines.length; i++) {
  const nameMatch = mainLines[i].match(/^\s*name:\s*'([^']+)',?\s*$/);
  const codeMatch = mainLines[i + 1]?.match(/^\s*code:\s*'([A-Z]{2})',?\s*$/);
  if (nameMatch && codeMatch && mainLines[i - 1]?.trim() === '{') {
    const nextFew = mainLines.slice(i, Math.min(i + 5, mainLines.length)).join('\n');
    if (nextFew.includes('counties: [')) {
      mainStates.push({ 
        name: nameMatch[1], 
        code: codeMatch[1], 
        nameLine: i + 1,
        startLine: i  // Line with {
      });
    }
  }
}

console.log(`Found ${mainStates.length} states in main file:\n`);

for (let i = 0; i < mainStates.length; i++) {
  const state = mainStates[i];
  const nextState = mainStates[i + 1];
  
  // Find end - look for ] }, before next state
  let endLine = -1;
  if (nextState) {
    // Look backwards from next state for ] },
    for (let j = nextState.startLine - 1; j >= state.startLine + 10; j--) {
      if (mainLines[j].trim() === '] },') {
        endLine = j;
        break;
      }
    }
    if (endLine === -1) {
      endLine = nextState.startLine - 1;
    }
  } else {
    // Last state - find ]; at end
    for (let j = state.startLine + 10; j < mainLines.length; j++) {
      if (mainLines[j].trim() === '];') {
        endLine = j - 1;
        break;
      }
    }
    if (endLine === -1) {
      endLine = mainLines.length - 1;
    }
  }
  
  const lineCount = endLine - state.startLine + 1;
  const stateLines = mainLines.slice(state.startLine, endLine + 1);
  const text = stateLines.join('\n');
  
  // Count counties
  const countyMatches = text.match(/^\s*name:\s*'([^']+County[^']*)',/gm);
  const countyCount = countyMatches ? [...new Set(countyMatches.map(m => m.match(/'([^']+)'/)[1]))].length : 0;
  
  analysis.mainFile[state.code] = {
    name: state.name,
    code: state.code,
    startLine: state.startLine + 1, // 1-indexed
    endLine: endLine + 1,
    lineCount: lineCount,
    countyCount: countyCount
  };
  
  console.log(`  ${state.code}: ${state.name}`);
  console.log(`    Lines: ${state.startLine + 1} to ${endLine + 1} (${lineCount} lines)`);
  console.log(`    Counties: ${countyCount}\n`);
}

// ============================================
// 2. ANALYZE INDIVIDUAL STATE FILES
// ============================================
console.log('\n2. Analyzing individual state files...\n');

const stateFiles = fs.readdirSync(stateDir)
  .filter(f => f.endsWith('-cities.ts'))
  .sort();

console.log(`Found ${stateFiles.length} state files\n`);

for (const file of stateFiles) {
  const stateCode = file.replace('-cities.ts', '').toUpperCase();
  const filePath = path.join(stateDir, file);
  
  console.log(`Processing ${stateCode} (${file})...`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find ALL occurrences of this state - must match the state code from filename
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    // Check if this line has name: and next line has code: matching our state code
    const nameMatch = lines[i].match(/^\s*name:\s*'([^']+)',?\s*$/);
    const codeMatch = lines[i + 1]?.match(/^\s*code:\s*'([A-Z]{2})',?\s*$/);
    
    if (nameMatch && codeMatch && codeMatch[1] === stateCode) {
      const nextFew = lines.slice(i, Math.min(i + 5, lines.length)).join('\n');
      if (nextFew.includes('counties: [')) {
        // Find opening brace
        let startLine = i - 1;
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          if (lines[j].trim() === '{') {
            startLine = j;
            break;
          }
        }
        matches.push({
          name: nameMatch[1],
          nameLine: i + 1,
          startLine: startLine + 1, // 1-indexed
          rawStartLine: startLine
        });
      }
    }
  }
  
  if (matches.length === 0) {
    console.log(`  ⚠ No state objects found\n`);
    continue;
  }
  
  // Use the LAST occurrence (most complete)
  const lastMatch = matches[matches.length - 1];
  console.log(`  Found ${matches.length} occurrence(s), using last at line ${lastMatch.nameLine}`);
  
  // Find end boundary - look for }; pattern
  // Structure: ] \n }, \n ;  OR  ] \n } \n ;
  let endLine = -1;
  for (let i = lastMatch.rawStartLine + 10; i < lines.length; i++) {
    // Check for }, followed by ; on next line (end of state object)
    if ((lines[i].trim() === '},' || lines[i].trim() === '}') && i + 1 < lines.length && lines[i + 1].trim() === ';') {
      // Look backwards for ] (should be within 10 lines)
      for (let j = i - 1; j >= Math.max(lastMatch.rawStartLine + 10, i - 10); j--) {
        if (lines[j].trim() === ']') {
          endLine = j; // Include the ] in the extracted range
          break;
        }
      }
      if (endLine === -1) {
        // If ] not found, use the line before }, or }
        endLine = i - 1;
      }
      break;
    }
  }
  
  if (endLine === -1) {
    // No }; found - use end of file
    endLine = lines.length - 1;
  }
  
  const lineCount = endLine - lastMatch.rawStartLine + 1;
  const stateLines = lines.slice(lastMatch.rawStartLine, endLine + 1);
  const text = stateLines.join('\n');
  
  // Count counties using state machine - same logic as parser
  const countyMap = new Map();
  let currentCounty = null;
  let stateContext = 'outside';
  
  for (let i = 0; i < stateLines.length; i++) {
    const line = stateLines[i].trim();
    if (!line) continue;
    
    if (line.includes('counties: [')) {
      stateContext = 'inCounties';
      continue;
    }
    
    // Detect county object start
    if (stateContext === 'inCounties' && line === '{') {
      const next3Lines = stateLines.slice(i, Math.min(i + 4, stateLines.length));
      const next3Text = next3Lines.join('\n');
      const hasCitiesArray = next3Text.includes('cities: [');
      const first2Lines = next3Lines.slice(0, 2).join('\n');
      const hasStateProperty = first2Lines.includes("state: '") || first2Lines.includes("stateCode: '");
      
      if (hasCitiesArray && !hasStateProperty) {
        stateContext = 'inCounty';
        continue;
      }
    }
    
    // Parse county name
    if (stateContext === 'inCounty' && line.includes("name: '") && !line.includes("state: '")) {
      const nameMatch = line.match(/name:\s*'([^']+)'/);
      if (nameMatch) {
        currentCounty = nameMatch[1];
        if (!countyMap.has(currentCounty)) {
          countyMap.set(currentCounty, { hasStateCities: false });
        }
        continue;
      }
    }
    
    // Detect cities array
    if (stateContext === 'inCounty' && line.includes('cities: [')) {
      stateContext = 'inCities';
      continue;
    }
    
    // Check if city has this state code
    if (stateContext === 'inCities' && line.includes(`stateCode: '${stateCode}'`)) {
      if (currentCounty) {
        countyMap.get(currentCounty).hasStateCities = true;
      }
      continue;
    }
    
    // Detect end of cities array
    if (stateContext === 'inCities' && line === ']') {
      stateContext = 'inCounty';
      continue;
    }
    
    // Detect end of county object
    if (stateContext === 'inCounty' && (line === '}' || line === '] },')) {
      stateContext = 'inCounties';
      currentCounty = null;
      continue;
    }
    
    // Detect end of counties array
    if (stateContext === 'inCounties' && line === ']') {
      stateContext = 'outside';
      continue;
    }
  }
  
  const countiesWithStateCities = Array.from(countyMap.values()).filter(c => c.hasStateCities).length;
  const totalCounties = countyMap.size;
  
  analysis.individualFiles[stateCode] = {
    file: file,
    stateName: lastMatch.name,
    startLine: lastMatch.startLine,
    endLine: endLine + 1,
    lineCount: lineCount,
    totalCounties: totalCounties,
    countiesWithStateCities: countiesWithStateCities,
    occurrences: matches.length
  };
  
  console.log(`    Lines: ${lastMatch.startLine} to ${endLine + 1} (${lineCount} lines)`);
  console.log(`    Counties: ${totalCounties} total, ${countiesWithStateCities} with ${stateCode} cities\n`);
}

// ============================================
// 3. SAVE ANALYSIS
// ============================================
fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2), 'utf8');
console.log(`\n✓ Analysis saved to ${outputFile}`);
console.log(`\n=== SUMMARY ===`);
console.log(`Main file states: ${Object.keys(analysis.mainFile).length}`);
console.log(`Individual file states: ${Object.keys(analysis.individualFiles).length}`);

