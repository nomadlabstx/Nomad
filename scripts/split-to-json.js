const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');
const indexFile = path.join(__dirname, '../data/us-cities-index.ts');

// State code to file name mapping
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

console.log('Reading file...');
const fileContent = fs.readFileSync(inputFile, 'utf8');

// Extract data section
const dataMatch = fileContent.match(/export const US_STATES_WITH_COUNTIES: USState\[\] = \[(.*?)(?:\];|$)/s);
if (!dataMatch) {
  throw new Error('Could not find data array');
}
let dataContent = dataMatch[1].trim();

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Find all state starts
const stateStarts = [];
let regex = /name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/g;
let match;
while ((match = regex.exec(fileContent)) !== null) {
  // Find the opening brace of this state object
  let stateStart = match.index;
  for (let i = match.index - 1; i >= 0 && i > match.index - 500; i--) {
    if (fileContent[i] === '{' && (i === 0 || fileContent[i - 1] === '\n' || fileContent[i - 1] === ' ')) {
      const context = fileContent.substring(i, match.index + match[0].length);
      if (context.includes('name:') && context.includes('code:')) {
        stateStart = i;
        break;
      }
    }
  }
  
  stateStarts.push({
    index: stateStart,
    name: match[1],
    code: match[2]
  });
}

console.log(`Found ${stateStarts.length} states`);

// Function to extract and parse state object
function extractStateObject(fileContent, startIndex, endIndex) {
  let stateContent = fileContent.substring(startIndex, endIndex);
  
  // Find where state object ends
  const stateEndPattern = /],\n\s*}\n\s*],\n\s*},?\s*\n/;
  let stateEndMatch = stateContent.match(stateEndPattern);
  
  if (stateEndMatch) {
    const endPos = stateEndMatch.index + stateEndMatch[0].length;
    stateContent = stateContent.substring(0, endPos).trim();
    stateContent = stateContent.replace(/,\s*$/, '');
  } else {
    const fallbackPattern = /],\n\s*},\n\s*],\n\s*},/;
    const fallbackMatch = stateContent.match(fallbackPattern);
    if (fallbackMatch) {
      const endPos = fallbackMatch.index + fallbackMatch[0].length;
      stateContent = stateContent.substring(0, endPos).trim();
      stateContent = stateContent.replace(/,\s*$/, '');
    }
  }
  
  // Convert TypeScript object literal to JSON
  // This is a simplified parser - it handles the basic structure
  try {
    // Remove comments if any
    stateContent = stateContent.replace(/\/\*[\s\S]*?\*\//g, '');
    stateContent = stateContent.replace(/\/\/.*$/gm, '');
    
    // Convert single quotes to double quotes for JSON
    stateContent = stateContent.replace(/'/g, '"');
    
    // Remove trailing commas
    stateContent = stateContent.replace(/,\s*([}\]])/g, '$1');
    
    // Parse as JSON
    return JSON.parse(stateContent);
  } catch (e) {
    console.error(`Error parsing state object: ${e.message}`);
    return null;
  }
}

// Function to split counties array into chunks
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

const stateFiles = [];
const MAX_COUNTIES_PER_FILE = 30; // Split states with more than 30 counties

// Process each state
for (let i = 0; i < stateStarts.length; i++) {
  const state = stateStarts[i];
  const startIndex = state.index;
  const endIndex = i < stateStarts.length - 1 
    ? stateStarts[i + 1].index 
    : fileContent.lastIndexOf(']');
  
  // Extract and parse state
  const stateObj = extractStateObject(fileContent, startIndex, endIndex);
  if (!stateObj) {
    console.warn(`⚠ Failed to parse ${state.name} (${state.code})`);
    continue;
  }
  
  // Ensure counties array exists and is sorted
  if (!stateObj.counties || !Array.isArray(stateObj.counties)) {
    stateObj.counties = [];
  }
  
  // Sort counties by name
  stateObj.counties.sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
  
  // For each county, sort cities by name
  stateObj.counties.forEach(county => {
    if (county.cities && Array.isArray(county.cities)) {
      county.cities.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      });
    }
  });
  
  const numCounties = stateObj.counties.length;
  
  // Split large states into multiple files
  if (numCounties > MAX_COUNTIES_PER_FILE) {
    const numFiles = Math.ceil(numCounties / MAX_COUNTIES_PER_FILE);
    const countiesPerFile = Math.ceil(numCounties / numFiles);
    const countyChunks = chunkArray(stateObj.counties, countiesPerFile);
    
    console.log(`  Splitting ${state.name} (${state.code}) into ${numFiles} files (${numCounties} counties)`);
    
    countyChunks.forEach((chunk, chunkIndex) => {
      const chunkStateObj = {
        name: stateObj.name,
        code: stateObj.code,
        counties: chunk
      };
      
      const filename = `${stateCodeMap[state.code]}-cities-part${chunkIndex + 1}.json`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(chunkStateObj, null, 2));
      stateFiles.push({ 
        code: state.code, 
        name: state.name, 
        file: filename,
        part: chunkIndex + 1,
        totalParts: numFiles
      });
    });
  } else {
    // Single file for smaller states
    const filename = `${stateCodeMap[state.code]}-cities.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(stateObj, null, 2));
    stateFiles.push({ 
      code: state.code, 
      name: state.name, 
      file: filename 
    });
    
    console.log(`✓ Extracted ${state.name} (${state.code}) - ${numCounties} counties`);
  }
}

console.log(`\n✓ Successfully processed ${stateFiles.length} files`);

// Generate TypeScript index file that imports JSON
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
    // Merge parts
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


