const fs = require('fs');
const path = require('path');
const readline = require('readline');

const inputFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states');
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

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract header (interfaces and comments)
const headerLines = [];
let inHeader = true;
let headerEndLine = 0;

// First pass: extract header
const fileContent = fs.readFileSync(inputFile, 'utf8');
const lines = fileContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('export const US_STATES_WITH_COUNTIES')) {
    headerEndLine = i;
    break;
  }
  headerLines.push(line);
}

const header = headerLines.join('\n');

// Second pass: stream through data, extract states
const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

let currentState = null;
let currentStateLines = [];
let braceDepth = 0;
let inDataSection = false;
let stateCount = 0;
const stateFiles = [];

rl.on('line', (line) => {
  // Skip to data section
  if (!inDataSection) {
    if (line.includes('export const US_STATES_WITH_COUNTIES')) {
      inDataSection = true;
      return;
    }
    return;
  }

  // Check for state start: { name: 'StateName', code: 'XX',
  const stateStartMatch = line.match(/\{\s*name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/);
  if (stateStartMatch) {
    // Save previous state if exists
    if (currentState) {
      const filename = `${stateCodeMap[currentState.code]}-cities.ts`;
      const filepath = path.join(outputDir, filename);
      const content = header + '\n\n' + `export const ${currentState.code}_CITIES: USState = ` + currentStateLines.join('\n') + ';\n';
      fs.writeFileSync(filepath, content);
      stateFiles.push({ code: currentState.code, name: currentState.name, file: filename });
      console.log(`✓ Extracted ${currentState.name} (${currentState.code})`);
      stateCount++;
    }
    
    // Start new state
    currentState = { name: stateStartMatch[1], code: stateStartMatch[2] };
    currentStateLines = [];
    braceDepth = 0;
  }

  if (currentState) {
    currentStateLines.push(line);
    
    // Track brace depth
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;
    
    // State ends when braceDepth returns to 0 after processing the state object
    if (braceDepth === 0 && line.trim() === '},') {
      // Save this state
      const filename = `${stateCodeMap[currentState.code]}-cities.ts`;
      const filepath = path.join(outputDir, filename);
      // Remove trailing comma from last line
      const stateContent = currentStateLines.join('\n').replace(/,\s*$/, '');
      const content = header + '\n\n' + `export const ${currentState.code}_CITIES: USState = ` + stateContent + ';\n';
      fs.writeFileSync(filepath, content);
      stateFiles.push({ code: currentState.code, name: currentState.name, file: filename });
      console.log(`✓ Extracted ${currentState.name} (${currentState.code})`);
      stateCount++;
      
      currentState = null;
      currentStateLines = [];
    }
  }
});

rl.on('close', () => {
  // Handle last state if file doesn't end with comma
  if (currentState && currentStateLines.length > 0) {
    const filename = `${stateCodeMap[currentState.code]}-cities.ts`;
    const filepath = path.join(outputDir, filename);
    const stateContent = currentStateLines.join('\n').replace(/,\s*$/, '');
    const content = header + '\n\n' + `export const ${currentState.code}_CITIES: USState = ` + stateContent + ';\n';
    fs.writeFileSync(filepath, content);
    stateFiles.push({ code: currentState.code, name: currentState.name, file: filename });
    console.log(`✓ Extracted ${currentState.name} (${currentState.code})`);
    stateCount++;
  }
  
  // Generate index file
  stateFiles.sort((a, b) => a.code.localeCompare(b.code));
  const indexContent = `// Auto-generated index file for US cities by state
// Generated at ${new Date().toISOString()}

${stateFiles.map(s => `import { ${s.code}_CITIES } from './us-states/${s.file.replace('.ts', '')}';`).join('\n')}

import type { USState } from './us-cities-types';

export const US_STATES_WITH_COUNTIES: USState[] = [
${stateFiles.map(s => `  ${s.code}_CITIES,`).join('\n')}
];
`;
  
  fs.writeFileSync(indexFile, indexContent);
  
  console.log(`\n✓ Successfully split ${stateCount} states`);
  console.log(`✓ Generated index file: ${indexFile}`);
  console.log(`✓ State files written to: ${outputDir}`);
});


