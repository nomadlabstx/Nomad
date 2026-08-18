#!/usr/bin/env node

/**
 * Split us-cities-with-counties.ts into separate files by state
 * Simple line-by-line approach
 */

const fs = require('fs');
const path = require('path');

console.log('📂 Splitting US Cities File by State (Simple)');
console.log('='.repeat(70));

const inputFile = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

// Extract interfaces
let interfacesEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export const US_STATES_WITH_COUNTIES')) {
    interfacesEnd = i;
    break;
  }
}

const interfaces = lines.slice(0, interfacesEnd).join('\n');

// Create types file
const typesFile = path.join(__dirname, '..', 'data', 'us-cities-types.ts');
fs.writeFileSync(typesFile, interfaces + '\n', 'utf8');
console.log(`✅ Created types file: us-cities-types.ts`);

// Find array start
let arrayStartLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export const US_STATES_WITH_COUNTIES')) {
    arrayStartLine = i;
    break;
  }
}

if (arrayStartLine === -1) {
  console.error('❌ Could not find US_STATES_WITH_COUNTIES');
  process.exit(1);
}

// Find states - look for lines with: name: 'StateName', code: 'XX',
const states = [];
let currentState = null;
let braceCount = 0;
let stateLines = [];

for (let i = arrayStartLine; i < lines.length; i++) {
  const line = lines[i];
  
  // Check for state start: { name: 'StateName', code: 'XX',
  const stateMatch = line.match(/^\s*\{\s*name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/);
  if (stateMatch) {
    // Save previous state if exists
    if (currentState) {
      states.push({
        name: currentState.name,
        code: currentState.code,
        lines: stateLines
      });
    }
    
    // Start new state
    currentState = { name: stateMatch[1], code: stateMatch[2] };
    stateLines = [line];
    braceCount = 1;
    continue;
  }
  
  // Track braces for current state
  if (currentState) {
    stateLines.push(line);
    
    // Count braces
    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    // State complete when braces balance
    if (braceCount === 0) {
      states.push({
        name: currentState.name,
        code: currentState.code,
        lines: stateLines
      });
      currentState = null;
      stateLines = [];
      braceCount = 0;
    }
  }
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
  
  // Remove trailing comma if present
  let stateContent = state.lines.join('\n').trim();
  if (stateContent.endsWith(',')) {
    stateContent = stateContent.slice(0, -1);
  }
  
  const fileContent = `/**
 * ${state.name} Cities
 * Generated from us-cities-with-counties.ts
 */

import type { USState } from '../us-cities-types';

export const ${state.code}_STATE: USState = ${stateContent};
`;

  fs.writeFileSync(filepath, fileContent, 'utf8');
  stateFiles.push({ code: state.code, name: state.name, filename });
  
  if ((index + 1) % 10 === 0) {
    console.log(`   Created ${index + 1}/${states.length} state files...`);
  }
});

console.log(`\n✅ Created ${stateFiles.length} state files in data/us-states/`);

// Create index file
const indexContent = `/**
 * US States with Counties - Index
 * Generated from split-us-cities-simple.js
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
}

console.log(`\n✅ Splitting complete!`);
console.log(`\n📊 Summary:`);
console.log(`   - Types: us-cities-types.ts`);
console.log(`   - States: ${stateFiles.length} files in us-states/`);
console.log(`   - Index: us-cities-index.ts`);
console.log(`   - Updated: explorer.ts`);
console.log(`\n💡 Next: Test TypeScript compilation to verify the split worked!`);

