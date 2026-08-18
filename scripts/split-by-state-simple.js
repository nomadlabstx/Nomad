#!/usr/bin/env node

/**
 * Split us-cities-with-counties.ts by state - Simple approach
 */

const fs = require('fs');
const path = require('path');

console.log('📂 Splitting US Cities by State');
console.log('='.repeat(70));

const inputFile = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const content = fs.readFileSync(inputFile, 'utf8');

// Extract interfaces (everything before the export const)
const exportConstIndex = content.indexOf('export const US_STATES_WITH_COUNTIES');
const interfaces = content.substring(0, exportConstIndex).trim();

// Save types file
const typesFile = path.join(__dirname, '..', 'data', 'us-cities-types.ts');
fs.writeFileSync(typesFile, interfaces + '\n', 'utf8');
console.log('✅ Created us-cities-types.ts');

// Find the array content
const arrayStart = content.indexOf('[', exportConstIndex);
const arrayEnd = content.lastIndexOf(']');

// Extract just the array content (everything between [ and ])
let arrayContent = content.substring(arrayStart + 1, arrayEnd);

// Find all states - look for { name: 'StateName', code: 'XX',
const stateRegex = /\{\s*name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/g;
const states = [];
let match;

while ((match = stateRegex.exec(arrayContent)) !== null) {
  const stateName = match[1];
  const stateCode = match[2];
  const stateStart = match.index;
  
  // Find the matching closing brace for this state
  let braceCount = 1;
  let stateEnd = stateStart + 1;
  let inString = false;
  let stringChar = null;
  
  for (let i = stateStart + 1; i < arrayContent.length; i++) {
    const char = arrayContent[i];
    const prevChar = i > 0 ? arrayContent[i - 1] : '';
    
    if (prevChar === '\\') continue;
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar) {
      inString = false;
      stringChar = null;
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          stateEnd = i + 1;
          break;
        }
      }
    }
  }
  
  const stateData = arrayContent.substring(stateStart, stateEnd);
  states.push({ name: stateName, code: stateCode, data: stateData });
  console.log(`   Found: ${stateName} (${stateCode})`);
}

console.log(`\n📊 Found ${states.length} states`);

// Create directory
const statesDir = path.join(__dirname, '..', 'data', 'us-states');
if (!fs.existsSync(statesDir)) {
  fs.mkdirSync(statesDir, { recursive: true });
}

// Create state files
const stateFiles = [];
states.forEach((state, i) => {
  const filename = `${state.code.toLowerCase()}-cities.ts`;
  const filepath = path.join(statesDir, filename);
  
  // Clean up trailing comma
  let stateData = state.data.trim();
  if (stateData.endsWith(',')) {
    stateData = stateData.slice(0, -1);
  }
  
  const fileContent = `/**
 * ${state.name} Cities
 * Generated from us-cities-with-counties.ts
 */

import type { USState } from '../us-cities-types';

export const ${state.code}_STATE: USState = ${stateData};
`;

  fs.writeFileSync(filepath, fileContent, 'utf8');
  stateFiles.push({ code: state.code, name: state.name });
  
  if ((i + 1) % 10 === 0 || i === states.length - 1) {
    console.log(`   Created ${i + 1}/${states.length} files...`);
  }
});

// Create index file
const indexContent = `/**
 * US States with Counties - Index
 * Generated from split-by-state-simple.js
 */

import type { USState } from './us-cities-types';

${stateFiles.map(s => `import { ${s.code}_STATE } from './us-states/${s.code.toLowerCase()}-cities';`).join('\n')}

export const US_STATES_WITH_COUNTIES: USState[] = [
${stateFiles.map(s => `  ${s.code}_STATE,`).join('\n')}
];
`;

const indexFile = path.join(__dirname, '..', 'data', 'us-cities-index.ts');
fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log('✅ Created us-cities-index.ts');

// Update explorer.ts
const explorerPath = path.join(__dirname, '..', 'services', 'explorer.ts');
let explorerContent = fs.readFileSync(explorerPath, 'utf8');

const oldImport = /import\s+{\s*US_STATES_WITH_COUNTIES\s*}\s+from\s+['"]\.\.\/data\/us-cities-with-counties['"];?/;
const newImport = `import { US_STATES_WITH_COUNTIES } from '../data/us-cities-index';`;

if (oldImport.test(explorerContent)) {
  explorerContent = explorerContent.replace(oldImport, newImport);
  fs.writeFileSync(explorerPath, explorerContent, 'utf8');
  console.log('✅ Updated explorer.ts');
}

console.log(`\n✅ Complete! Split into ${states.length} state files`);
console.log(`\n📊 Summary:`);
console.log(`   - Types: us-cities-types.ts`);
console.log(`   - States: ${states.length} files in us-states/`);
console.log(`   - Index: us-cities-index.ts`);

