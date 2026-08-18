const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
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

console.log('Reading file...');
const fileContent = fs.readFileSync(inputFile, 'utf8');

// Find all state starts
const stateStarts = [];
let regex = /name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/g;
let match;
while ((match = regex.exec(fileContent)) !== null) {
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
  stateStarts.push({ index: stateStart, name: match[1], code: match[2] });
}

console.log(`Found ${stateStarts.length} states`);

// Better TypeScript to JSON converter
function convertTSToJSON(tsCode) {
  // Remove comments
  tsCode = tsCode.replace(/\/\*[\s\S]*?\*\//g, '');
  tsCode = tsCode.replace(/\/\/.*$/gm, '');
  
  // Replace single quotes with double quotes, but handle escaped quotes
  // This is tricky - we need to handle strings properly
  let result = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;
  
  for (let i = 0; i < tsCode.length; i++) {
    const char = tsCode[i];
    const prevChar = i > 0 ? tsCode[i - 1] : '';
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      result += char;
      continue;
    }
    
    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote) {
        inSingleQuote = false;
        result += '"';
      } else {
        inSingleQuote = true;
        result += '"';
      }
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      result += char;
    } else {
      result += char;
    }
  }
  
  // Remove trailing commas before closing braces/brackets
  result = result.replace(/,\s*([}\]])/g, '$1');
  
  // Try to parse as JSON
  try {
    return JSON.parse(result);
  } catch (e) {
    // If parsing fails, try using Function constructor as fallback
    try {
      // Clean up more aggressively
      result = result.replace(/,\s*([}\]])/g, '$1');
      const func = new Function(`return ${result}`);
      return func();
    } catch (e2) {
      console.error(`  Parse error: ${e2.message.substring(0, 100)}`);
      return null;
    }
  }
}

// Extract state object string
function extractStateObjectString(fileContent, startIndex, endIndex) {
  let stateContent = fileContent.substring(startIndex, endIndex);
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
  return stateContent.trim();
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const stateFiles = [];
const MAX_COUNTIES_PER_FILE = 30;

// Process each state
for (let i = 0; i < stateStarts.length; i++) {
  const state = stateStarts[i];
  const startIndex = state.index;
  const endIndex = i < stateStarts.length - 1 
    ? stateStarts[i + 1].index 
    : fileContent.lastIndexOf(']');
  
  const stateContent = extractStateObjectString(fileContent, startIndex, endIndex);
  const stateObj = convertTSToJSON(stateContent);
  
  if (!stateObj || !stateObj.name || !stateObj.code) {
    console.warn(`⚠ Failed to parse ${state.name} (${state.code})`);
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


