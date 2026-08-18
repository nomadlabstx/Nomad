/**
 * Line-by-line parser - manually constructs state objects
 * This avoids eval() and handles malformed syntax
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('📝 Line-by-Line Parser');
console.log('======================\n');

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

const targetStates = [
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Florida', code: 'FL' },
  { name: 'Illinois', code: 'IL' },
];

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
  // For Illinois (last state), find the end of the array
  if (stateName === 'Illinois') {
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
  
  // For other states, find next state
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

// Parse a property value from a line
function parseValue(line) {
  const match = line.match(/:\s*'([^']*(?:\\'[^']*)*)'/);
  if (match) return match[1].replace(/\\'/g, "'");
  
  const numMatch = line.match(/:\s*([+-]?\d+\.?\d*)/);
  if (numMatch) return parseFloat(numMatch[1]);
  
  const boolMatch = line.match(/:\s*(true|false)/);
  if (boolMatch) return boolMatch[1] === 'true';
  
  return null;
}

// Parse state object line by line
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
  
  console.log(`  Found: lines ${startLine + 1} to ${endLine + 1}`);
  
  const stateLines = lines.slice(startLine, endLine + 1);
  
  // Build object manually
  const state = { name: stateName, code: code, counties: [] };
  let currentCounty = null;
  let currentCity = null;
  let inCounties = false;
  let inCities = false;
  let inCountyObject = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  
  for (let i = 0; i < stateLines.length; i++) {
    const line = stateLines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Track depth
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') {
        braceDepth--;
        // If we close a brace and were in a county object, we're done with that county
        if (inCountyObject && braceDepth === 1) {
          inCountyObject = false;
          inCities = false;
          currentCounty = null;
        }
        // If we close a brace and were in cities array, we're done with cities
        if (inCities && braceDepth === 2) {
          inCities = false;
        }
      }
      if (char === '[') bracketDepth++;
      if (char === ']') {
        bracketDepth--;
        // If we close a bracket and were in cities, we're done with cities array
        if (inCities && bracketDepth === 1) {
          inCities = false;
        }
      }
    }
    
    // Parse state properties
    if (line.includes("name: '") && !inCounties) {
      const nameMatch = line.match(/name:\s*'([^']+)'/);
      if (nameMatch && nameMatch[1] === stateName) {
        // State name - already set
        continue;
      }
    }
    
    if (line.includes("code: '") && !inCounties) {
      const codeMatch = line.match(/code:\s*'([^']+)'/);
      if (codeMatch) {
        state.code = codeMatch[1];
        continue;
      }
    }
    
    if (line.includes('counties: [')) {
      inCounties = true;
      continue;
    }
    
    // Detect start of county object: { followed by name: '...' and then cities: [
    // County objects have: { name: 'County Name', cities: [
    // City objects have: { name: 'City Name', state: '...', stateCode: '...', county: '...'
    if (inCounties && !inCountyObject && line.trim() === '{') {
      // Look ahead to see if this is a county (has cities: [) or a city (has state:)
      const nextFewLines = stateLines.slice(i, Math.min(i + 10, stateLines.length)).join('\n');
      const hasCitiesArray = nextFewLines.includes('cities: [');
      const hasStateProperty = nextFewLines.includes("state: '") || nextFewLines.includes("stateCode: '");
      
      // It's a county if it has cities: [ and doesn't have state/stateCode properties
      if (hasCitiesArray && !hasStateProperty) {
        inCountyObject = true;
        // Don't continue - we want to parse the county name on the next iteration
      }
    }
    
    // Parse county name - only if we're in a county object and not in cities yet
    if (inCountyObject && !inCities && line.includes("name: '")) {
      const nameMatch = line.match(/name:\s*'([^']+)'/);
      if (nameMatch) {
        const countyName = nameMatch[1];
        // Double-check: make sure this line doesn't have city properties
        if (!line.includes("state: '") && !line.includes("stateCode: '") && !line.includes("county: '")) {
          // Accept all county objects (the source uses "Planning Region" as county names)
          // We'll extract cities and can group by actual county later if needed
          // Check if we already have this county (deduplicate)
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
    }
    
    if (line.includes('cities: [')) {
      inCities = true;
      continue;
    }
    
    // Parse city - only if we're in cities array and in a county object
    // Cities have state: or stateCode: property, counties don't
    // Also check for latitude/longitude which cities have but counties don't
    if (inCities && inCountyObject && line.includes("name: '")) {
      // Check if this is a city (has state/stateCode/latitude) vs county name
      const hasCityProps = line.includes("state: '") || line.includes("stateCode: '") || line.includes('latitude:');
      
      if (hasCityProps) {
        const cityMatch = line.match(/\{\s*name:\s*'([^']+)'/);
        if (cityMatch) {
          currentCity = { name: cityMatch[1] };
          
          // Parse other city properties from the same line
          const stateMatch = line.match(/state:\s*'([^']+)'/);
          if (stateMatch) currentCity.state = stateMatch[1];
          
          const stateCodeMatch = line.match(/stateCode:\s*'([^']+)'/);
          if (stateCodeMatch) currentCity.stateCode = stateCodeMatch[1];
          
          const countyMatch = line.match(/county:\s*'([^']+)'/);
          if (countyMatch) currentCity.county = countyMatch[1];
          
          const latMatch = line.match(/latitude:\s*([+-]?\d+\.?\d*)/);
          if (latMatch) currentCity.latitude = parseFloat(latMatch[1]);
          
          const lonMatch = line.match(/longitude:\s*([+-]?\d+\.?\d*)/);
          if (lonMatch) currentCity.longitude = parseFloat(lonMatch[1]);
          
          const popMatch = line.match(/population:\s*(\d+)/);
          if (popMatch) currentCity.population = parseInt(popMatch[1]);
          
          const sizeMatch = line.match(/size:\s*'([^']+)'/);
          if (sizeMatch) currentCity.size = sizeMatch[1];
          
          const confMatch = line.match(/confidence:\s*'([^']+)'/);
          if (confMatch) currentCity.confidence = confMatch[1];
          
          if (currentCounty) {
            currentCounty.cities.push(currentCity);
          }
          continue;
        }
      }
    }
    
    // Check for closing brackets/braces
    if (line === ']' && bracketDepth === 0 && inCities) {
      inCities = false;
    }
    if (line === '}' && braceDepth === 1 && inCounties) {
      inCounties = false;
    }
  }
  
  if (state.counties.length > 0) {
    console.log(`  ✓ Successfully parsed!`);
    console.log(`  Found ${state.counties.length} counties`);
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

