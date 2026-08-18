#!/usr/bin/env node

/**
 * Split us-cities-with-counties.ts into separate files by state
 * Version 2: Better parsing for large file
 */

const fs = require('fs');
const path = require('path');

console.log('📂 Splitting US Cities File by State (v2)');
console.log('='.repeat(70));

const inputFile = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const content = fs.readFileSync(inputFile, 'utf8');

// Extract interfaces
const interfacesStart = content.indexOf('export interface');
const interfacesEnd = content.indexOf('export const US_STATES_WITH_COUNTIES');
const interfaces = content.substring(interfacesStart, interfacesEnd).trim();

// Create types file
const typesFile = path.join(__dirname, '..', 'data', 'us-cities-types.ts');
fs.writeFileSync(typesFile, interfaces + '\n', 'utf8');
console.log(`✅ Created types file: us-cities-types.ts`);

// Find the array start
const arrayStart = content.indexOf('export const US_STATES_WITH_COUNTIES: USState[] = [');
if (arrayStart === -1) {
  console.error('❌ Could not find US_STATES_WITH_COUNTIES array');
  process.exit(1);
}

// Extract the array content (everything after the opening bracket)
let arrayContent = content.substring(arrayStart);
// Find the closing bracket of the array (last ] before the final semicolon)
let bracketCount = 0;
let arrayEnd = -1;
let inString = false;
let stringChar = null;

for (let i = 0; i < arrayContent.length; i++) {
  const char = arrayContent[i];
  const prevChar = i > 0 ? arrayContent[i - 1] : '';
  
  // Handle string escaping
  if (prevChar === '\\') continue;
  
  // Track string state
  if (!inString && (char === '"' || char === "'")) {
    inString = true;
    stringChar = char;
  } else if (inString && char === stringChar) {
    inString = false;
    stringChar = null;
  }
  
  if (inString) continue;
  
  if (char === '[') bracketCount++;
  if (char === ']') {
    bracketCount--;
    if (bracketCount === 0) {
      arrayEnd = i;
      break;
    }
  }
}

if (arrayEnd === -1) {
  console.error('❌ Could not find end of array');
  process.exit(1);
}

// Extract just the array content (without the export statement)
const arrayOnly = arrayContent.substring(arrayContent.indexOf('[') + 1, arrayEnd);
console.log(`\n📊 Extracted array content: ${arrayOnly.length} characters`);

// Split by state - look for state object start: { name: 'StateName', code: 'XX',
const stateStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'District of Columbia'
];

const stateCodes = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];

// Find state boundaries using a simpler approach
// Look for: { name: 'StateName', code: 'XX',
const states = [];
let currentPos = 0;

while (currentPos < arrayOnly.length) {
  // Find next state start
  const statePattern = /\{\s*name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/g;
  statePattern.lastIndex = currentPos;
  const match = statePattern.exec(arrayOnly);
  
  if (!match) break;
  
  const stateName = match[1];
  const stateCode = match[2];
  const stateStart = match.index;
  
  // Find the end of this state object (matching closing brace)
  let braceCount = 0;
  let stateEnd = -1;
  let inString2 = false;
  let stringChar2 = null;
  
  for (let i = stateStart; i < arrayOnly.length; i++) {
    const char = arrayOnly[i];
    const prevChar = i > 0 ? arrayOnly[i - 1] : '';
    
    if (prevChar === '\\') continue;
    
    if (!inString2 && (char === '"' || char === "'")) {
      inString2 = true;
      stringChar2 = char;
    } else if (inString2 && char === stringChar2) {
      inString2 = false;
      stringChar2 = null;
    }
    
    if (inString2) continue;
    
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        stateEnd = i + 1;
        break;
      }
    }
  }
  
  if (stateEnd === -1) {
    console.log(`⚠️  Could not find end for state ${stateName}, skipping`);
    currentPos = stateStart + 1000; // Skip ahead
    continue;
  }
  
  const stateContent = arrayOnly.substring(stateStart, stateEnd);
  states.push({ name: stateName, code: stateCode, content: stateContent });
  
  console.log(`   Found: ${stateName} (${stateCode})`);
  currentPos = stateEnd;
}

console.log(`\n📊 Found ${states.length} states`);

// Create directory for state files
const statesDir = path.join(__dirname, '..', 'data', 'us-states');
if (!fs.existsSync(statesDir)) {
  fs.mkdirSync(statesDir, { recursive: true });
}

// Create individual state files
const stateFiles = [];
states.forEach((state, index) => {
  const filename = `${state.code.toLowerCase()}-cities.ts`;
  const filepath = path.join(statesDir, filename);
  
  const stateContent = `/**
 * ${state.name} Cities
 * Generated from us-cities-with-counties.ts
 */

import type { USState } from '../us-cities-types';

export const ${state.code}_STATE: USState = ${state.content};
`;

  fs.writeFileSync(filepath, stateContent, 'utf8');
  stateFiles.push({ code: state.code, name: state.name, filename });
});

console.log(`\n✅ Created ${stateFiles.length} state files in data/us-states/`);

// Create index file
const indexContent = `/**
 * US States with Counties - Index
 * Generated from split-us-cities-by-state-v2.js
 */

import type { USState } from './us-cities-types';

${stateFiles.map(s => `import { ${s.code}_STATE } from './us-states/${s.code.toLowerCase()}-cities';`).join('\n')}

export const US_STATES_WITH_COUNTIES: USState[] = [
${stateFiles.map(s => `  ${s.code}_STATE,`).join('\n')}
];
`;

const indexFile = path.join(__dirname, '..', 'data', 'us-cities-index.ts');
fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log(`✅ Created index file: us-cities-index.ts`);

// Update explorer.ts
const explorerPath = path.join(__dirname, '..', 'services', 'explorer.ts');
let explorerContent = fs.readFileSync(explorerPath, 'utf8');

const oldImport = /import\s+{\s*US_STATES_WITH_COUNTIES\s*}\s+from\s+['"]\.\.\/data\/us-cities-with-counties['"];?/;
const newImport = `import { US_STATES_WITH_COUNTIES } from '../data/us-cities-index';`;

if (oldImport.test(explorerContent)) {
  explorerContent = explorerContent.replace(oldImport, newImport);
  fs.writeFileSync(explorerPath, explorerContent, 'utf8');
  console.log(`✅ Updated explorer.ts to use new index`);
} else {
  console.log(`⚠️  Could not find US_STATES_WITH_COUNTIES import in explorer.ts`);
}

console.log(`\n✅ Splitting complete!`);
console.log(`\n📊 Summary:`);
console.log(`   - Types: us-cities-types.ts`);
console.log(`   - States: ${stateFiles.length} files in us-states/`);
console.log(`   - Index: us-cities-index.ts`);
console.log(`   - Updated: explorer.ts`);

