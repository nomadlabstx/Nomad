#!/usr/bin/env node

/**
 * Split us-cities-with-counties.ts into separate files by state
 * This will fix TypeScript stack overflow issues
 */

const fs = require('fs');
const path = require('path');

console.log('📂 Splitting US Cities File by State');
console.log('='.repeat(70));

const inputFile = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const content = fs.readFileSync(inputFile, 'utf8');

// Extract interfaces
const interfaceMatch = content.match(/^export interface[\s\S]*?(?=^export const|$)/m);
const interfaces = interfaceMatch ? interfaceMatch[0] : '';

console.log(`\n📋 Extracted interfaces (${interfaces.split('\n').length} lines)`);

// Create types file
const typesFile = path.join(__dirname, '..', 'data', 'us-cities-types.ts');
fs.writeFileSync(typesFile, interfaces + '\n', 'utf8');
console.log(`✅ Created types file: us-cities-types.ts`);

// Extract the main array
const arrayMatch = content.match(/export const US_STATES_WITH_COUNTIES: USState\[\] = \[([\s\S]*?)\];/);
if (!arrayMatch) {
  console.error('❌ Could not find US_STATES_WITH_COUNTIES array');
  process.exit(1);
}

const arrayContent = arrayMatch[1];
console.log(`\n📊 Array content length: ${arrayContent.length} characters`);

// Split by state boundaries
// Look for state objects: { name: 'StateName', code: 'XX', counties: [...] }
const stateRegex = /{\s*name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"],\s*counties:\s*\[([\s\S]*?)\]\s*}/g;

const states = [];
let match;
let stateIndex = 0;

while ((match = stateRegex.exec(arrayContent)) !== null) {
  const stateName = match[1];
  const stateCode = match[2];
  const counties = match[3];
  
  states.push({
    name: stateName,
    code: stateCode,
    fullMatch: match[0],
    counties: counties
  });
  
  stateIndex++;
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
  
  let stateContent = `/**
 * ${state.name} Cities
 * Generated from us-cities-with-counties.ts
 */

import type { USState } from '../us-cities-types';

export const ${state.code}_STATE: USState = {
  name: '${state.name}',
  code: '${state.code}',
  counties: [${state.counties}]
};
`;

  fs.writeFileSync(filepath, stateContent, 'utf8');
  stateFiles.push({ code: state.code, name: state.name, filename });
  
  if ((index + 1) % 10 === 0) {
    console.log(`   Created ${index + 1}/${states.length} state files...`);
  }
});

console.log(`\n✅ Created ${stateFiles.length} state files in data/us-states/`);

// Create index file that imports all states
const indexContent = `/**
 * US States with Counties - Index
 * Generated from split-us-cities-by-state.js
 * 
 * This file imports all state data files and exports them as a single array.
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

// Update services/explorer.ts to use the new index
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

console.log(`\n📊 Summary:`);
console.log(`   - Types file: us-cities-types.ts`);
console.log(`   - State files: ${stateFiles.length} files in us-states/`);
console.log(`   - Index file: us-cities-index.ts`);
console.log(`   - Updated: explorer.ts`);
console.log(`\n✅ Splitting complete!`);
console.log(`\n💡 Next steps:`);
console.log(`   1. Verify the split worked correctly`);
console.log(`   2. Test TypeScript compilation`);
console.log(`   3. Optionally delete the original us-cities-with-counties.ts`);

