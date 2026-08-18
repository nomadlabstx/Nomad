const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../data/us-states');
const outputDir = path.join(__dirname, '../data/us-states-json');
const indexFile = path.join(__dirname, '../data/us-cities-index.ts');

const stateCodeMap = {
  'AL': 'al', 'AK': 'ak', 'AZ': 'az', 'AR': 'ar', 'CA': 'ca', 'CO': 'co', 'CT': 'ct',
  'DE': 'de', 'FL': 'fl', 'GA': 'ga', 'HI': 'hi', 'ID': 'id', 'IL': 'il', 'IN': 'in',
  'IA': 'ia', 'KS': 'ks', 'KY': 'ky', 'LA': 'la', 'ME': 'me', 'MD': 'md', 'MA': 'ma',
  'MI': 'mi', 'MN': 'mn', 'MS': 'ms', 'MO': 'mo', 'MT': 'mt', 'NE': 'ne', 'NV': 'nv',
  'NH': 'nh', 'NJ': 'nj', 'NM': 'nm', 'NY': 'ny', 'NC': 'nc', 'ND': 'nd', 'OH': 'oh',
  'OK': 'ok', 'OR': 'or', 'PA': 'pa', 'RI': 'ri', 'SC': 'sc', 'SD': 'sd', 'TN': 'tn',
  'TX': 'tx', 'UT': 'ut', 'VT': 'vt', 'VA': 'va', 'WA': 'wa', 'WV': 'wv', 'WI': 'wi',
  'WY': 'wy', 'DC': 'dc'
};

console.log('Reading TypeScript files from:', inputDir);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Register TypeScript loader using ts-node
try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      esModuleInterop: true
    }
  });
} catch (e) {
  console.warn('ts-node not available, trying alternative approach...');
  // Fallback: use eval with proper handling
}

const stateFiles = [];
const MAX_COUNTIES_PER_FILE = 30;

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Get all state TypeScript files
const tsFiles = fs.readdirSync(inputDir)
  .filter(f => f.endsWith('-cities.ts'))
  .sort();

console.log(`Found ${tsFiles.length} TypeScript files`);

// Process each TypeScript file
for (const tsFile of tsFiles) {
  const filepath = path.join(inputDir, tsFile);
  const stateCode = tsFile.replace('-cities.ts', '').toUpperCase();
  const stateName = stateCodeMap[stateCode] || stateCode.toLowerCase();
  
  try {
    // Read the TypeScript file
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Extract the state object - find the export statement
    const exportMatch = content.match(/export const \w+_CITIES: USState = ({[\s\S]*});/);
    if (!exportMatch) {
      console.warn(`⚠ Could not find state export in ${tsFile}`);
      continue;
    }
    
    // Try to evaluate the state object
    let stateObj;
    try {
      // Use vm to safely evaluate
      const context = {};
      stateObj = vm.runInNewContext(`(${exportMatch[1]})`, context);
    } catch (e1) {
      // Fallback: try with Function constructor
      try {
        // Clean up trailing commas
        let cleaned = exportMatch[1];
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
        const func = new Function(`return ${cleaned}`);
        stateObj = func();
      } catch (e2) {
        console.warn(`⚠ Failed to parse ${tsFile}: ${e2.message.substring(0, 100)}`);
        continue;
      }
    }
    
    if (!stateObj || !stateObj.name || !stateObj.code) {
      console.warn(`⚠ Invalid state object in ${tsFile}`);
      continue;
    }
    
    if (!stateObj.counties || !Array.isArray(stateObj.counties)) {
      stateObj.counties = [];
    }
    
    // Sort counties by name
    stateObj.counties.sort((a, b) => {
      const nameA = (a.name || '').toString();
      const nameB = (b.name || '').toString();
      return nameA.localeCompare(nameB);
    });
    
    // Sort cities by name within each county
    stateObj.counties.forEach(county => {
      if (county.cities && Array.isArray(county.cities)) {
        county.cities.sort((a, b) => {
          const nameA = (a.name || '').toString();
          const nameB = (b.name || '').toString();
          return nameA.localeCompare(nameB);
        });
      }
    });
    
    const numCounties = stateObj.counties.length;
    
    // Split large states
    if (numCounties > MAX_COUNTIES_PER_FILE) {
      const numFiles = Math.ceil(numCounties / MAX_COUNTIES_PER_FILE);
      const countiesPerFile = Math.ceil(numCounties / numFiles);
      const countyChunks = chunkArray(stateObj.counties, countiesPerFile);
      
      console.log(`  Splitting ${stateObj.name} (${stateObj.code}) into ${numFiles} files (${numCounties} counties)`);
      
      countyChunks.forEach((chunk, chunkIndex) => {
        const chunkStateObj = {
          name: stateObj.name,
          code: stateObj.code,
          counties: chunk
        };
        
        const filename = `${stateName}-cities-part${chunkIndex + 1}.json`;
        const jsonPath = path.join(outputDir, filename);
        fs.writeFileSync(jsonPath, JSON.stringify(chunkStateObj, null, 2));
        stateFiles.push({ 
          code: stateObj.code, 
          name: stateObj.name, 
          file: filename,
          part: chunkIndex + 1,
          totalParts: numFiles
        });
      });
    } else {
      const filename = `${stateName}-cities.json`;
      const jsonPath = path.join(outputDir, filename);
      fs.writeFileSync(jsonPath, JSON.stringify(stateObj, null, 2));
      stateFiles.push({ 
        code: stateObj.code, 
        name: stateObj.name, 
        file: filename 
      });
      console.log(`✓ Extracted ${stateObj.name} (${stateObj.code}) - ${numCounties} counties`);
    }
  } catch (e) {
    console.error(`⚠ Error processing ${tsFile}: ${e.message}`);
  }
}

console.log(`\n✓ Successfully processed ${stateFiles.length} JSON files`);

// Generate TypeScript index file
stateFiles.sort((a, b) => {
  if (a.code !== b.code) return a.code.localeCompare(b.code);
  return (a.part || 0) - (b.part || 0);
});

const importStatements = stateFiles.map(s => {
  const varName = s.part ? `${s.code}_CITIES_PART${s.part}` : `${s.code}_CITIES`;
  return `import ${varName} from './us-states-json/${s.file.replace('.json', '')}.json';`;
});

const stateGroups = {};
stateFiles.forEach(s => {
  if (!stateGroups[s.code]) {
    stateGroups[s.code] = [];
  }
  stateGroups[s.code].push(s);
});

const combinedStates = Object.keys(stateGroups).sort().map(code => {
  const files = stateGroups[code];
  if (files.length === 1) {
    const s = files[0];
    return `  { ...${s.code}_CITIES }`;
  } else {
    const parts = files.sort((a, b) => (a.part || 0) - (b.part || 0));
    const varNames = parts.map(p => `${p.code}_CITIES_PART${p.part}`);
    const firstPart = parts[0];
    return `  { name: '${firstPart.name}', code: '${firstPart.code}', counties: [...${varNames.join('.counties, ...')}.counties] }`;
  }
});

const indexContent = `// Auto-generated index file for US cities by state
// Generated at ${new Date().toISOString()}

${importStatements.join('\n')}

import type { USState } from './us-cities-types';

export const US_STATES_WITH_COUNTIES: USState[] = [
${combinedStates.join(',\n')}
];
`;

fs.writeFileSync(indexFile, indexContent);
console.log(`✓ Generated index file: ${indexFile}`);
console.log(`✓ JSON files written to: ${outputDir}`);

