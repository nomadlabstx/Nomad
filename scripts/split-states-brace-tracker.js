const fs = require('fs');
const path = require('path');

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

console.log('Reading file...');
const fileContent = fs.readFileSync(inputFile, 'utf8');

// Extract header
const headerMatch = fileContent.match(/^(.*?)export const US_STATES_WITH_COUNTIES/s);
if (!headerMatch) {
  throw new Error('Could not find US_STATES_WITH_COUNTIES declaration');
}
const header = headerMatch[1];

// Find start of data array
const dataStartIndex = fileContent.indexOf('export const US_STATES_WITH_COUNTIES: USState[] = [');
if (dataStartIndex === -1) {
  throw new Error('Could not find data array start');
}

// Extract everything after the array declaration
let dataSection = fileContent.substring(dataStartIndex + 'export const US_STATES_WITH_COUNTIES: USState[] = ['.length);

// Remove trailing ]; if present, or just trailing ]
if (dataSection.trim().endsWith('];')) {
  dataSection = dataSection.substring(0, dataSection.lastIndexOf('];'));
} else if (dataSection.trim().endsWith(']')) {
  dataSection = dataSection.substring(0, dataSection.lastIndexOf(']'));
}

console.log('Extracting states using brace tracking...');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const lines = dataSection.split('\n');
console.log(`Total lines in data section: ${lines.length}`);
console.log(`First 5 lines:\n${lines.slice(0, 5).join('\n')}`);

const stateFiles = [];
let currentState = null;
let currentStateLines = [];
let braceDepth = 0;
let inString = false;
let stringChar = null;

function countBraces(line) {
  let open = 0;
  let close = 0;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const prevChar = i > 0 ? line[i - 1] : null;
    
    // Handle string literals
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') open++;
    if (char === '}') close++;
  }
  
  return { open, close };
}

// We start inside the array, so track array depth
let arrayDepth = 1; // We're inside [ ... ]
for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
  const line = lines[lineIndex];
  
  // Track array brackets
  const openBrackets = (line.match(/\[/g) || []).length;
  const closeBrackets = (line.match(/\]/g) || []).length;
  arrayDepth += openBrackets - closeBrackets;
  
  // Check for state start - can be single line or multi-line
  // Pattern 1: All on one line: { name: 'State', code: 'XX',
  let stateStartMatch = line.match(/\{\s*name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/);
  // Pattern 2: Multi-line - line with opening brace, next line has name:
  if (!stateStartMatch && (!currentState || braceDepth === 0) && line.trim() === '{') {
    // Check if next few lines contain name and code
    if (lineIndex < lines.length - 2) {
      const nextLine = lines[lineIndex + 1];
      const nameMatch = nextLine.match(/name:\s*['"]([^'"]+)['"]/);
      const codeMatch = lines[lineIndex + 2] ? lines[lineIndex + 2].match(/code:\s*['"]([A-Z]{2})['"]/) : null;
      if (nameMatch && codeMatch) {
        stateStartMatch = [null, nameMatch[1], codeMatch[1]];
      }
    }
  }
  
  if (stateStartMatch && (!currentState || braceDepth === 0)) {
    // Save previous state if exists
    if (currentState && currentStateLines.length > 0) {
      const stateCode = currentState.code;
      const filename = `${stateCodeMap[stateCode]}-cities.ts`;
      const filepath = path.join(outputDir, filename);
      
      // Remove trailing comma from state object
      let stateContent = currentStateLines.join('\n');
      stateContent = stateContent.replace(/,\s*$/, '');
      
      const content = header + `\nexport const ${stateCode}_CITIES: USState = ${stateContent};\n`;
      fs.writeFileSync(filepath, content);
      stateFiles.push({ code: stateCode, name: currentState.name, file: filename });
      console.log(`✓ Extracted ${currentState.name} (${stateCode}) - ${filename}`);
    }
    
    // Start new state
    currentState = { name: stateStartMatch[1], code: stateStartMatch[2] };
    currentStateLines = [];
    braceDepth = 0;
  }
  
  if (currentState) {
    currentStateLines.push(line);
    const { open, close } = countBraces(line);
    const prevBraceDepth = braceDepth;
    braceDepth += open - close;
    
    // State ends when: 
    // 1. We're at the top array level (arrayDepth >= 1, or close to it)
    // 2. Brace depth returns to 0 (we've closed the state object)
    // 3. Line matches closing pattern: }, or },
    const isStateEnd = braceDepth === 0 && 
                       prevBraceDepth > 0 && 
                       arrayDepth >= 1 && 
                       (line.trim() === '},' || line.trim() === '}');
    
    if (isStateEnd) {
      // Save this state
      const stateCode = currentState.code;
      const filename = `${stateCodeMap[stateCode]}-cities.ts`;
      const filepath = path.join(outputDir, filename);
      
      let stateContent = currentStateLines.join('\n');
      stateContent = stateContent.replace(/,\s*$/, '');
      
      const content = header + `\nexport const ${stateCode}_CITIES: USState = ${stateContent};\n`;
      fs.writeFileSync(filepath, content);
      stateFiles.push({ code: stateCode, name: currentState.name, file: filename });
      console.log(`✓ Extracted ${currentState.name} (${stateCode}) - ${filename}`);
      
      // Reset for next state
      currentState = null;
      currentStateLines = [];
      braceDepth = 0;
    }
  }
}

// Save last state
if (currentState && currentStateLines.length > 0) {
  const stateCode = currentState.code;
  const filename = `${stateCodeMap[stateCode]}-cities.ts`;
  const filepath = path.join(outputDir, filename);
  
  let stateContent = currentStateLines.join('\n');
  stateContent = stateContent.replace(/,\s*$/, '');
  
  const content = header + `\nexport const ${stateCode}_CITIES: USState = ${stateContent};\n`;
  fs.writeFileSync(filepath, content);
  stateFiles.push({ code: stateCode, name: currentState.name, file: filename });
  console.log(`✓ Extracted ${currentState.name} (${stateCode}) - ${filename}`);
}

console.log(`\n✓ Successfully split ${stateFiles.length} states`);

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
console.log(`✓ Generated index file: ${indexFile}`);
console.log(`✓ State files written to: ${outputDir}`);

