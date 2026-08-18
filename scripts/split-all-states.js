#!/usr/bin/env node

/**
 * Split us-cities-with-counties.ts by state - Find ALL states
 */

const fs = require('fs');
const path = require('path');

console.log('📂 Splitting US Cities by State - Finding All States');
console.log('='.repeat(70));

const inputFile = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const content = fs.readFileSync(inputFile, 'utf8');

// Extract interfaces
const exportConstIndex = content.indexOf('export const US_STATES_WITH_COUNTIES');
const interfaces = content.substring(0, exportConstIndex).trim();

// Save types file
const typesFile = path.join(__dirname, '..', 'data', 'us-cities-types.ts');
fs.writeFileSync(typesFile, interfaces + '\n', 'utf8');
console.log('✅ Created us-cities-types.ts');

// Find the array content
const arrayStart = content.indexOf('[', exportConstIndex);
const arrayEnd = content.lastIndexOf(']');
let arrayContent = content.substring(arrayStart + 1, arrayEnd);

console.log(`\n📊 Array content: ${arrayContent.length} characters`);

// Find ALL state starts using regex (non-overlapping)
const stateRegex = /\{\s*name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/g;
const stateStarts = [];
let match;

while ((match = stateRegex.exec(arrayContent)) !== null) {
  stateStarts.push({
    name: match[1],
    code: match[2],
    index: match.index
  });
}

console.log(`\n📊 Found ${stateStarts.length} state starts`);

// For each state, find its end by counting braces
const states = [];

for (let i = 0; i < stateStarts.length; i++) {
  const stateStart = stateStarts[i];
  const startIndex = stateStart.index;
  const endIndex = i < stateStarts.length - 1 ? stateStarts[i + 1].index : arrayContent.length;
  
  // Find the matching closing brace for this state within the range
  let braceCount = 1; // Start at 1 because we're already inside the opening brace
  let stateEnd = startIndex + 1;
  let inString = false;
  let stringChar = null;
  
  const searchRange = Math.min(endIndex, arrayContent.length);
  
  for (let j = startIndex + 1; j < searchRange; j++) {
    const char = arrayContent[j];
    const prevChar = j > 0 ? arrayContent[j - 1] : '';
    
    // Skip escaped characters
    if (prevChar === '\\') continue;
    
    // Track string state
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar) {
      inString = false;
      stringChar = null;
    }
    
    // Only count braces outside strings
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          stateEnd = j + 1;
          break;
        }
      }
    }
  }
  
  const stateData = arrayContent.substring(startIndex, stateEnd);
  states.push({
    name: stateStart.name,
    code: stateStart.code,
    data: stateData
  });
  
  console.log(`   ${i + 1}. ${stateStart.name} (${stateStart.code}) - ${stateData.length} chars`);
}

console.log(`\n📊 Extracted ${states.length} states`);

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
 * Generated from split-all-states.js
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


