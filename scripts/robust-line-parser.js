/**
 * Robust line-by-line parser - simpler, more reliable approach
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('📝 Robust Line-by-Line Parser');
console.log('==============================\n');

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// Find all states in the file
// States have the pattern: { \n name: 'StateName', \n code: 'XX', \n counties: [
const allStates = [];
for (let i = 1; i < lines.length; i++) {
  // Check if this line has name: '...' and next line has code: '...'
  const nameMatch = lines[i].match(/^\s*name:\s*'([^']+)',?\s*$/);
  const codeMatch = lines[i + 1]?.match(/^\s*code:\s*'([A-Z]{2})',?\s*$/);
  
  if (nameMatch && codeMatch && lines[i - 1].trim() === '{') {
    // Check if this is a state (has counties: [ after it, within next 5 lines)
    const nextFewLines = lines.slice(i, Math.min(i + 5, lines.length));
    const nextFewText = nextFewLines.join('\n');
    
    // State objects have counties: [ on a separate line after code
    // City objects have everything on one line: { name: '...', state: '...', ...
    const hasCountiesArray = nextFewText.includes('counties: [');
    const isOnSameLine = lines[i].includes('counties: [') || lines[i].includes("state: '");
    
    if (hasCountiesArray && !isOnSameLine) {
      allStates.push({
        name: nameMatch[1],
        code: codeMatch[1],
        line: i
      });
    }
  }
}

console.log(`Found ${allStates.length} states in source file\n`);

const targetStates = allStates.map(s => ({ name: s.name, code: s.code }));

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

function findStateEnd(startLine, stateName) {
  // Find if this is the last state
  const currentStateIndex = allStates.findIndex(s => s.name === stateName);
  const isLastState = currentStateIndex === allStates.length - 1;
  
  
  if (isLastState) {
    // Look for the closing of the entire array
    for (let i = startLine + 10; i < lines.length; i++) {
      if (lines[i].trim() === ']' && i + 1 < lines.length && lines[i + 1].trim() === ';') {
        return i - 1; // The } before the ]
      }
      if (lines[i].trim() === '];') {
        return i - 1; // The } before the ];
      }
    }
    // If not found, use end of file
    return lines.length - 1;
  }
  
  // For other states, find next state using allStates array
  if (currentStateIndex >= 0 && currentStateIndex < allStates.length - 1) {
    const nextState = allStates[currentStateIndex + 1];
    // Find the line with ] }, before the next state
    // The state ends with: ] }, \n { \n name: 'NextState'
    // Look backwards from nextState.line for ] },
    for (let i = nextState.line - 1; i >= Math.max(startLine + 10, nextState.line - 10); i--) {
      const trimmed = lines[i].trim();
      if (i >= 0 && (trimmed === '] },' || trimmed === '] }')) {
        return i; // Return the line with ] }, (this is the last line of the state)
      }
    }
    // If ] }, not found, look for just } before next state (should be on line before {)
    if (nextState.line > 0 && lines[nextState.line - 1].trim() === '{') {
      // Look for } before the {
      for (let i = nextState.line - 2; i >= Math.max(startLine + 10, nextState.line - 10); i--) {
        if (i >= 0 && lines[i].trim() === '}') {
          return i; // The } that closes the state
        }
      }
    }
    // Fallback: go back 2 lines from next state
    return Math.max(startLine + 10, nextState.line - 2);
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

function parseState(stateName, code) {
  console.log(`Processing ${stateName} (${code})...`);
  
  const startLine = findState(stateName);
  if (startLine === -1) {
    console.log(`  ⚠ Not found\n`);
    return null;
  }
  
  const endLine = findStateEnd(startLine, stateName);
  if (endLine === -1) {
    console.log(`  ⚠ End not found\n`);
    return null;
  }
  
  // Verify end line is reasonable
  if (endLine <= startLine || endLine > lines.length) {
    console.log(`  ⚠ Invalid end line: ${endLine + 1} (start: ${startLine + 1}, total lines: ${lines.length})\n`);
    return null;
  }
  
  // CRITICAL DEBUG for Delaware
  if (stateName === 'Delaware') {
    console.log(`  DEBUG: startLine=${startLine} (should be 27657), endLine=${endLine} (should be 27773)`);
  }
  
  console.log(`  Found: lines ${startLine + 1} to ${endLine + 1} (${endLine - startLine + 1} lines)`);
  
  const stateLines = lines.slice(startLine, endLine + 1);
  
  // CRITICAL DEBUG for Delaware
  if (stateName === 'Delaware') {
    console.log(`  DEBUG: stateLines.length=${stateLines.length} (should be 117)`);
    console.log(`  DEBUG: First line: "${stateLines[0].trim().substring(0, 50)}"`);
    console.log(`  DEBUG: Last line: "${stateLines[stateLines.length - 1].trim()}"`);
  }
  
  // Build object manually - simpler state machine
  const state = { name: stateName, code: code, counties: [] };
  let currentCounty = null;
  let stateContext = 'outside'; // outside, inState, inCounties, inCounty, inCities, inCity
  
  for (let i = 0; i < stateLines.length; i++) {
    const line = stateLines[i].trim();
    if (!line) continue;
    
    // State machine transitions
    if (line.includes('counties: [')) {
      stateContext = 'inCounties';
      continue;
    }
    
    // Detect county object start: { followed by name: and cities: [
    // This can happen when we're inCounties (after previous county)
    if (stateContext === 'inCounties' && line === '{') {
      // Look ahead only the first 3-4 lines to see if this is a county
      // County: { \n name: '...' \n cities: [
      // City: { name: '...', state: '...', ...
      const next3Lines = stateLines.slice(i, Math.min(i + 4, stateLines.length));
      const next3Text = next3Lines.join('\n');
      const hasCitiesArray = next3Text.includes('cities: [');
      // Check only the first line or two for state: (cities have state: but later in the line)
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
        const countyName = nameMatch[1];
        const existing = state.counties.find(c => c.name === countyName);
        if (!existing) {
          currentCounty = { name: countyName, cities: [] };
          state.counties.push(currentCounty);
        } else {
          currentCounty = existing;
        }
        continue;
      }
    }
    
    // Detect cities array
    if (stateContext === 'inCounty' && line.includes('cities: [')) {
      stateContext = 'inCities';
      continue;
    }
    
    // Parse city
    if (stateContext === 'inCities' && line.includes("name: '") && line.includes('latitude:')) {
      const cityMatch = line.match(/\{\s*name:\s*'([^']+)'/);
      if (cityMatch) {
        const city = { name: cityMatch[1] };
        
        const stateMatch = line.match(/state:\s*'([^']+)'/);
        if (stateMatch) city.state = stateMatch[1];
        
        const stateCodeMatch = line.match(/stateCode:\s*'([^']+)'/);
        if (stateCodeMatch) city.stateCode = stateCodeMatch[1];
        
        const countyMatch = line.match(/county:\s*'([^']+)'/);
        if (countyMatch) city.county = countyMatch[1];
        
        const latMatch = line.match(/latitude:\s*([+-]?\d+\.?\d*)/);
        if (latMatch) city.latitude = parseFloat(latMatch[1]);
        
        const lonMatch = line.match(/longitude:\s*([+-]?\d+\.?\d*)/);
        if (lonMatch) city.longitude = parseFloat(lonMatch[1]);
        
        const popMatch = line.match(/population:\s*(\d+)/);
        if (popMatch) city.population = parseInt(popMatch[1]);
        
        const sizeMatch = line.match(/size:\s*'([^']+)'/);
        if (sizeMatch) city.size = sizeMatch[1];
        
        const confMatch = line.match(/confidence:\s*'([^']+)'/);
        if (confMatch) city.confidence = confMatch[1];
        
        if (currentCounty) {
          currentCounty.cities.push(city);
        }
        continue;
      }
    }
    
    // Detect end of cities array
    if (stateContext === 'inCities' && line === ']') {
      stateContext = 'inCounty';
      continue;
    }
    
    // Detect end of county object: } or ] },
    if (stateContext === 'inCounty' && line === '}') {
      stateContext = 'inCounties';
      currentCounty = null;
      continue;
    }
    
    // Detect ] }, pattern (end of county, start of next)
    // This happens after cities array closes with ], then county closes with }
    if (line === '] },') {
      // We should be inCounty after cities array closed
      if (stateContext === 'inCounty' || stateContext === 'inCities') {
        stateContext = 'inCounties';
        currentCounty = null;
      }
      continue;
    }
    
    // Detect end of counties array
    if (stateContext === 'inCounties' && line === ']') {
      stateContext = 'outside';
      continue;
    }
  }
  
  if (state.counties.length > 0) {
    // Normalize and deduplicate counties
    const countyMap = new Map();
    
    for (const county of state.counties) {
      // For most states, keep " County" suffix - only remove for planning regions
      // Check if it's a planning region (has "Planning Region" in name)
      let normalized = county.name;
      
      if (county.name.includes('Planning Region') && county.name.endsWith(' County')) {
        // Remove " County" suffix from planning regions only
        normalized = county.name.replace(' County', '');
      } else {
        // Keep original name for actual counties (with or without " County")
        normalized = county.name;
      }
      
      if (countyMap.has(normalized)) {
        // Merge cities from duplicate
        const existing = countyMap.get(normalized);
        existing.cities.push(...county.cities);
      } else {
        countyMap.set(normalized, {
          name: normalized,
          cities: [...county.cities]
        });
      }
    }
    
    // Remove duplicate cities within each county
    for (const county of countyMap.values()) {
      const cityMap = new Map();
      for (const city of county.cities) {
        const key = `${city.name}-${city.latitude || ''}-${city.longitude || ''}`;
        if (!cityMap.has(key)) {
          cityMap.set(key, city);
        }
      }
      county.cities = Array.from(cityMap.values());
    }
    
    // Convert back to array, sorted by name
    state.counties = Array.from(countyMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    // Remove invalid counties
    const invalidCounties = ['Unknown County'];
    if (stateName === 'California') {
      invalidCounties.push('Regional Municipality of Halton County', 'Middlesex County');
    }
    
    state.counties = state.counties.filter(c => !invalidCounties.includes(c.name));
    
    // For Connecticut, ensure only 9 planning regions
    if (stateName === 'Connecticut') {
      const officialRegions = [
        'Capitol Planning Region',
        'Naugatuck Valley Planning Region',
        'Northeastern Connecticut Planning Region',
        'Northwest Hills Planning Region',
        'Western Connecticut Planning Region',
        'Southeastern Connecticut Planning Region',
        'Lower Connecticut River Valley Planning Region',
        'South Central Connecticut Planning Region',
        'Greater Bridgeport Planning Region'
      ];
      
      const regionMap = new Map();
      for (const regionName of officialRegions) {
        const existing = state.counties.find(c => c.name === regionName);
        if (existing) {
          regionMap.set(regionName, existing);
        } else {
          regionMap.set(regionName, { name: regionName, cities: [] });
        }
      }
      
      // Map any remaining counties to planning regions
      const ctCountyToRegion = {
        'Hartford': 'Capitol Planning Region',
        'Litchfield': 'Northwest Hills Planning Region',
        'Middlesex': 'Lower Connecticut River Valley Planning Region',
        'New Haven': 'South Central Connecticut Planning Region',
        'Fairfield': 'Western Connecticut Planning Region',
        'New London': 'Southeastern Connecticut Planning Region',
        'Tolland': 'Northeastern Connecticut Planning Region',
        'Windham': 'Northeastern Connecticut Planning Region'
      };
      
      for (const county of state.counties) {
        if (!officialRegions.includes(county.name)) {
          for (const [countyName, regionName] of Object.entries(ctCountyToRegion)) {
            if (county.name.includes(countyName) && regionMap.has(regionName)) {
              const region = regionMap.get(regionName);
              region.cities.push(...county.cities);
              break;
            }
          }
        }
      }
      
      // Remove duplicates from each region
      for (const region of regionMap.values()) {
        const cityMap = new Map();
        for (const city of region.cities) {
          const key = `${city.name}-${city.latitude || ''}-${city.longitude || ''}`;
          if (!cityMap.has(key)) {
            cityMap.set(key, city);
          }
        }
        region.cities = Array.from(cityMap.values());
      }
      
      state.counties = Array.from(regionMap.values());
    }
    
    const totalCities = state.counties.reduce((sum, c) => sum + c.cities.length, 0);
    console.log(`  ✓ Successfully parsed!`);
    console.log(`  Found ${state.counties.length} unique counties/regions, ${totalCities} cities`);
    return state;
  } else {
    console.log(`  ⚠ No counties found\n`);
    return null;
  }
}

// Process each state
let successCount = 0;
for (const state of targetStates) {
  const stateObj = parseState(state.name, state.code);
  
  if (stateObj) {
    const outputFile = path.join(outputDir, `${state.code.toLowerCase()}-cities.json`);
    fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
    console.log(`  ✓ Wrote ${outputFile}\n`);
    successCount++;
  } else {
    console.log(`  ✗ Failed to process\n`);
  }
}

console.log('='.repeat(50));
console.log(`Results: ${successCount}/${targetStates.length} states processed`);
console.log('='.repeat(50));

