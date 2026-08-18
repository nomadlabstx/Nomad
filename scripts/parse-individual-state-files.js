/**
 * Parse individual state .ts files from data/us-states/
 * These files contain complete state data with all counties
 * Uses boundary analysis data for accurate parsing
 */

const fs = require('fs');
const path = require('path');

const stateDir = path.join(__dirname, '../data/us-states');
const outputDir = path.join(__dirname, '../data/us-states-json');
const analysisFile = path.join(__dirname, '../data/state-boundaries-analysis.json');

console.log('📝 Parsing Individual State Files');
console.log('==================================\n');

// Load boundary analysis
let boundaryAnalysis = null;
if (fs.existsSync(analysisFile)) {
  boundaryAnalysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
  console.log('✓ Loaded boundary analysis data\n');
} else {
  console.log('⚠ Boundary analysis not found - will detect boundaries manually\n');
}

// States already parsed from main file (13 states)
const alreadyParsed = new Set(['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il']);

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
    
    // MUST use boundary analysis - it's the source of truth
    if (!boundaryAnalysis || !boundaryAnalysis.individualFiles[stateCode.toUpperCase()]) {
      console.log(`  ⚠ No boundary analysis data for ${stateCode.toUpperCase()}`);
      return null;
    }
    
    const bounds = boundaryAnalysis.individualFiles[stateCode.toUpperCase()];
    const stateStart = bounds.startLine - 1; // Convert to 0-indexed
    const stateEnd = bounds.endLine - 1;
    
    console.log(`  Using boundary analysis: lines ${bounds.startLine} to ${bounds.endLine} (${bounds.lineCount} lines)`);
    
    const stateLines = lines.slice(stateStart, stateEnd + 1);
    const text = stateLines.join('\n');
    
    // Get state name first
    const stateNameMatch = text.match(/name:\s*'([^']+)'/);
    const stateName = stateNameMatch ? stateNameMatch[1] : '';
    
    // Use simpler approach: find all county blocks using regex
    // Pattern: { \n name: 'CountyName', \n cities: [ ... ] \n }
    const countyBlocks = [];
    let inCounties = false;
    let currentBlockStart = -1;
    let braceCount = 0;
    
    for (let i = 0; i < stateLines.length; i++) {
      const line = stateLines[i].trim();
      
      if (line.includes('counties: [')) {
        inCounties = true;
        continue;
      }
      
      if (inCounties && line === '{') {
        currentBlockStart = i;
        braceCount = 1;
        continue;
      }
      
      if (currentBlockStart >= 0) {
        if (line === '{') braceCount++;
        if (line === '}' || line === '},' || line === '] },' || line === '},,') {
          braceCount--;
          if (braceCount === 0) {
            // End of county block
            countyBlocks.push({
              start: currentBlockStart,
              end: i
            });
            currentBlockStart = -1;
          }
        }
      }
      
      if (inCounties && line === ']') {
        break;
      }
    }
    
    console.log(`  Found ${countyBlocks.length} county blocks`);
    
    // Parse each county block
    const state = { name: stateName, code: stateCode.toUpperCase(), counties: [] };
    
    for (const block of countyBlocks) {
      const blockLines = stateLines.slice(block.start, block.end + 1);
      const blockText = blockLines.join('\n');
      
      // Extract county name
      const countyNameMatch = blockText.match(/name:\s*'([^']+)'/);
      if (!countyNameMatch) continue;
      
      const countyName = countyNameMatch[1];
      const county = { name: countyName, cities: [] };
      
      // Extract all cities from this county block - cities are on single lines
      const cityLines = blockLines.filter(l => l.trim().includes("name: '") && l.trim().includes('latitude:') && (l.trim().includes("state: '") || l.trim().includes("stateCode: '")));
      
      for (const cityLine of cityLines) {
        const cityMatch = cityLine.match(/\{\s*name:\s*'([^']+)'/);
        if (!cityMatch) continue;
        
        const city = { name: cityMatch[1] };
        
        const stateMatch = cityLine.match(/state:\s*'([^']+)'/);
        if (stateMatch) city.state = stateMatch[1];
        
        const stateCodeMatch = cityLine.match(/stateCode:\s*'([^']+)'/);
        if (stateCodeMatch) city.stateCode = stateCodeMatch[1];
        
        const countyMatch = cityLine.match(/county:\s*'([^']+)'/);
        if (countyMatch) city.county = countyMatch[1];
        
        const latMatch = cityLine.match(/latitude:\s*([+-]?\d+\.?\d*)/);
        if (latMatch) city.latitude = parseFloat(latMatch[1]);
        
        const lonMatch = cityLine.match(/longitude:\s*([+-]?\d+\.?\d*)/);
        if (lonMatch) city.longitude = parseFloat(lonMatch[1]);
        
        const popMatch = cityLine.match(/population:\s*(\d+)/);
        if (popMatch) city.population = parseInt(popMatch[1]);
        
        const sizeMatch = cityLine.match(/size:\s*'([^']+)'/);
        if (sizeMatch) city.size = sizeMatch[1];
        
        const confMatch = cityLine.match(/confidence:\s*'([^']+)'/);
        if (confMatch) city.confidence = confMatch[1];
        
        county.cities.push(city);
      }
      
      if (county.cities.length > 0) {
        state.counties.push(county);
      }
    }
    
    console.log(`  Parsed ${state.counties.length} counties with cities`);
    
    // Deduplicate counties and cities, and filter to only counties with cities from this state
    if (state.counties.length > 0) {
      console.log(`  Found ${state.counties.length} counties before filtering`);
      
      const countyMap = new Map();
      for (const county of state.counties) {
        // CRITICAL: Only keep counties that have cities from this state
        const stateCities = county.cities.filter(city => 
          city.stateCode === stateCode.toUpperCase() || 
          city.state === state.name ||
          city.stateCode === state.code
        );
        
        if (stateCities.length === 0) {
          continue; // Skip counties with no cities from this state
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
      
      console.log(`  After filtering: ${countyMap.size} counties with ${stateCode.toUpperCase()} cities`);
      
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
        .filter(c => c.cities.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      // Remove invalid counties
      state.counties = state.counties.filter(c => c.name !== 'Unknown County');
      
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

