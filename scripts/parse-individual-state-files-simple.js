/**
 * Parse individual state .ts files using boundary analysis
 * Uses the EXACT same logic as robust-line-parser.js which worked correctly
 */

const fs = require('fs');
const path = require('path');

const stateDir = path.join(__dirname, '../data/us-states');
const outputDir = path.join(__dirname, '../data/us-states-json');
const analysisFile = path.join(__dirname, '../data/state-boundaries-analysis.json');

console.log('📝 Parsing Individual State Files (Simple)');
console.log('==========================================\n');

// Load boundary analysis
let boundaryAnalysis = null;
if (fs.existsSync(analysisFile)) {
  boundaryAnalysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
  console.log('✓ Loaded boundary analysis data\n');
} else {
  console.log('⚠ Boundary analysis not found\n');
  process.exit(1);
}

// States already parsed from main file (13 states)
// NOTE: CA and CO need to be re-parsed with fixed filter, so removing them
const alreadyParsed = new Set(['al', 'ak', 'az', 'ar', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il']);

// Get all state files
const stateFiles = fs.readdirSync(stateDir)
  .filter(f => f.endsWith('-cities.ts'))
  .filter(f => {
    const code = f.replace('-cities.ts', '').toLowerCase();
    return !alreadyParsed.has(code);
  })
  .sort();

console.log(`Found ${stateFiles.length} state files to parse\n`);

function parseStateFile(filePath, stateCode) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // MUST use boundary analysis
    if (!boundaryAnalysis || !boundaryAnalysis.individualFiles[stateCode.toUpperCase()]) {
      console.log(`  ⚠ No boundary analysis data for ${stateCode.toUpperCase()}`);
      return null;
    }
    
    const bounds = boundaryAnalysis.individualFiles[stateCode.toUpperCase()];
    const stateStart = bounds.startLine - 1; // Convert to 0-indexed
    const stateEnd = bounds.endLine - 1;
    
    console.log(`  Using boundary analysis: lines ${bounds.startLine} to ${bounds.endLine} (${bounds.lineCount} lines)`);
    
    const stateLines = lines.slice(stateStart, stateEnd + 1);
    
    // Get state name first
    let stateName = '';
    for (let i = 0; i < Math.min(10, stateLines.length); i++) {
      const line = stateLines[i].trim();
      if (line.includes("name: '") && !line.includes("state: '") && !line.includes("stateCode: '")) {
        const nameMatch = line.match(/name:\s*'([^']+)'/);
        if (nameMatch) {
          stateName = nameMatch[1];
          break;
        }
      }
    }
    
    // Find all county start positions - don't break on ], just find all county starts
    const countyStarts = [];
    let inCounties = false;
    
    for (let i = 0; i < stateLines.length; i++) {
      const line = stateLines[i].trim();
      if (line.includes('counties: [')) {
        inCounties = true;
        continue;
      }
      if (inCounties && line === '{') {
        const next3Lines = stateLines.slice(i, Math.min(i + 4, stateLines.length));
        const next3Text = next3Lines.join('\n');
        const hasCitiesArray = next3Text.includes('cities: [');
        const first2Lines = next3Lines.slice(0, 2).join('\n');
        const hasStateProperty = first2Lines.includes("state: '") || first2Lines.includes("stateCode: '");
        if (hasCitiesArray && !hasStateProperty) {
          countyStarts.push(i);
        }
      }
      // Don't break - just find all counties. The boundary analysis already gives us the correct end.
    }
    
    console.log(`  Found ${countyStarts.length} county starts`);
    
    // Parse each county independently - find end of each county block
    const state = { name: stateName, code: stateCode.toUpperCase(), counties: [] };
    
    for (const countyStart of countyStarts) {
      // Find county end - simpler approach: find the } that comes after cities array ]
      // Structure: { name: '...', cities: [ ... ] } or },
      let countyEnd = -1;
      let sawCitiesArray = false;
      let sawCitiesArrayEnd = false;
      
      for (let i = countyStart; i < stateLines.length; i++) {
        const line = stateLines[i].trim();
        if (!line) continue;
        
        if (line.includes('cities: [')) {
          sawCitiesArray = true;
          continue;
        }
        
        if (sawCitiesArray && line === ']') {
          sawCitiesArrayEnd = true;
          continue;
        }
        
        // After cities array ends, find the closing brace
        // Structure: ] \n } \n (empty) \n ] \n },,  OR  ] \n },  OR  ] \n }
        if (sawCitiesArrayEnd) {
          // Look ahead up to 5 lines for }, or },, (the actual county end)
          for (let j = i; j < Math.min(i + 5, stateLines.length); j++) {
            const checkLine = stateLines[j].trim();
            if (checkLine === '},' || checkLine === '},,') {
              countyEnd = j;
              break;
            }
          }
          if (countyEnd !== -1) break;
          
          // Fallback: if we see } and it's followed by something that looks like end, use it
          if (line === '}' || line === '},') {
            countyEnd = i;
            break;
          }
        }
        
        // Safety: don't go past the counties array end
        if (line === ']' && i > countyStart + 10 && !sawCitiesArray) {
          break;
        }
      }
      
      if (countyEnd === -1) continue;
      
      // Parse this county
      const countyLines = stateLines.slice(countyStart, countyEnd + 1);
      const countyText = countyLines.join('\n');
      
      const countyNameMatch = countyText.match(/name:\s*'([^']+)'/);
      if (!countyNameMatch) continue;
      
      const countyName = countyNameMatch[1];
      const county = { name: countyName, cities: [] };
      
      // Extract all cities from this county block
      for (const line of countyLines) {
        const trimmed = line.trim();
        if (trimmed.includes("name: '") && trimmed.includes('latitude:') && (trimmed.includes("state: '") || trimmed.includes("stateCode: '"))) {
          const cityMatch = trimmed.match(/\{\s*name:\s*'([^']+)'/);
          if (cityMatch) {
            const city = { name: cityMatch[1] };
            
            const stateMatch = trimmed.match(/state:\s*'([^']+)'/);
            if (stateMatch) city.state = stateMatch[1];
            
            const stateCodeMatch = trimmed.match(/stateCode:\s*'([^']+)'/);
            if (stateCodeMatch) city.stateCode = stateCodeMatch[1];
            
            const countyMatch = trimmed.match(/county:\s*'([^']+)'/);
            if (countyMatch) city.county = countyMatch[1];
            
            const latMatch = trimmed.match(/latitude:\s*([+-]?\d+\.?\d*)/);
            if (latMatch) city.latitude = parseFloat(latMatch[1]);
            
            const lonMatch = trimmed.match(/longitude:\s*([+-]?\d+\.?\d*)/);
            if (lonMatch) city.longitude = parseFloat(lonMatch[1]);
            
            const popMatch = trimmed.match(/population:\s*(\d+)/);
            if (popMatch) city.population = parseInt(popMatch[1]);
            
            const sizeMatch = trimmed.match(/size:\s*'([^']+)'/);
            if (sizeMatch) city.size = sizeMatch[1];
            
            const confMatch = trimmed.match(/confidence:\s*'([^']+)'/);
            if (confMatch) city.confidence = confMatch[1];
            
            county.cities.push(city);
          }
        }
      }
      
      if (county.cities.length > 0) {
        state.counties.push(county);
      }
    }
    
    console.log(`  Parsed ${state.counties.length} counties with cities`);
    
    // Filter to only counties with cities from this state and deduplicate
    if (state.counties.length > 0) {
      console.log(`  Found ${state.counties.length} counties before filtering`);
      
      const countyMap = new Map();
      for (const county of state.counties) {
        // Only keep cities from this state
        const stateCities = county.cities.filter(city => 
          city.stateCode === stateCode.toUpperCase() || 
          city.state === state.name ||
          city.stateCode === state.code
        );
        
        // CRITICAL: Only keep counties where ALL cities are from this state
        // This filters out counties from other states that happen to have a few cities
        if (stateCities.length === 0 || stateCities.length < county.cities.length) {
          continue; // Skip counties with cities from other states
        }
        
        let normalized = county.name;
        if (county.name.includes('Planning Region') && county.name.endsWith(' County')) {
          normalized = county.name.replace(' County', '');
        }
        
        if (countyMap.has(normalized)) {
          const existing = countyMap.get(normalized);
          existing.cities.push(...stateCities);
        } else {
          countyMap.set(normalized, {
            name: normalized,
            cities: [...stateCities]
          });
        }
      }
      
      // Deduplicate cities within each county
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
      
      state.counties = Array.from(countyMap.values())
        .filter(c => c.cities.length > 0) // Keep all counties with at least 1 city
        .sort((a, b) => a.name.localeCompare(b.name));
      
      // Remove invalid counties - state-specific filtering
      state.counties = state.counties.filter(c => {
        if (c.name === 'Unknown County') return false;
        
        const nameLower = c.name.toLowerCase();
        
        // Filter out foreign/division counties (applies to all states)
        // NOTE: Contra Costa is a valid CA county, so don't filter it
        if (nameLower.includes('division') || nameLower.includes('cádiz') ||
            nameLower.includes('cape may') ||
            nameLower.includes('berkshire') || nameLower.includes('cobb')) {
          return false;
        }
        
        // State-specific filters
        if (stateCode.toUpperCase() === 'IN') {
          // Indiana-specific: filter out known non-Indiana counties
          const nonINCountyNames = new Set([
            'Cheatham County', 'Dillon County', 'Suffolk County', 'Warrington County',
            'Emmen County', 'Greater London County', 'Greater Manchester County', 
            'Merseyside County', 'Maynas Province County', 'Moselle County',
            'North Sydney Council County', 'Orange County', 'Philadelphia County',
            'Regional Municipality of Halton County', 'Santa Clara County', 
            'Sherburne County', 'Kings County', 'Kent County', 'Lake of the Woods County',
            'Lane County', 'Manistee County', 'Miami-Dade County'
          ]);
          if (nonINCountyNames.has(c.name)) return false;
        }
        
        return true;
      });
      
      const totalCities = state.counties.reduce((sum, c) => sum + c.cities.length, 0);
      console.log(`  ✓ Parsed: ${state.counties.length} counties, ${totalCities} cities`);
      return state;
    }
    
    console.log(`  ⚠ No counties found`);
    return null;
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return null;
  }
}

let successCount = 0;
for (const file of stateFiles) {
  const stateCode = file.replace('-cities.ts', '').toLowerCase();
  const filePath = path.join(stateDir, file);
  
  console.log(`Processing ${stateCode.toUpperCase()}...`);
  const stateObj = parseStateFile(filePath, stateCode);
  
  if (stateObj && stateObj.counties.length > 0) {
    const outputFile = path.join(outputDir, `${stateCode}-cities.json`);
    fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
    console.log(`  ✓ Wrote ${outputFile}\n`);
    successCount++;
  } else {
    console.log(`  ✗ Failed\n`);
  }
}

console.log('='.repeat(50));
console.log(`Results: ${successCount}/${stateFiles.length} states processed`);
console.log('='.repeat(50));

