#!/usr/bin/env node

/**
 * Split us-cities-with-counties.ts by state - Working version
 * Uses a simpler, more reliable approach
 */

const fs = require('fs');
const path = require('path');

console.log('📂 Splitting US Cities by State');
console.log('='.repeat(70));

const inputFile = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const fullContent = fs.readFileSync(inputFile, 'utf8');

// Extract interfaces
const exportConstIndex = fullContent.indexOf('export const US_STATES_WITH_COUNTIES');
const interfaces = fullContent.substring(0, exportConstIndex).trim();

const typesFile = path.join(__dirname, '..', 'data', 'us-cities-types.ts');
fs.writeFileSync(typesFile, interfaces + '\n', 'utf8');
console.log('✅ Created us-cities-types.ts');

// Read file line by line to find states more reliably
const lines = fullContent.split('\n');
console.log(`\n📊 Total lines: ${lines.length.toLocaleString()}`);

// Find array start
let arrayStartLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export const US_STATES_WITH_COUNTIES')) {
    arrayStartLine = i + 1; // Start after the export line
    break;
  }
}

console.log(`   Array starts at line ${arrayStartLine + 1}: "${lines[arrayStartLine].substring(0, 50)}"`);
console.log(`   Next 5 lines:`);
for (let d = 0; d < 5; d++) {
  if (arrayStartLine + d < lines.length) {
    console.log(`     ${arrayStartLine + d + 1}: "${lines[arrayStartLine + d].substring(0, 60)}"`);
  }
}

// Find all state boundaries
const states = [];
let currentState = null;
let stateStartLine = -1;
let braceDepth = 0;
let inString = false;
let stringChar = null;

for (let i = arrayStartLine; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if this line starts a new state - look for opening brace followed by name and code
  if (!currentState && i + 2 < lines.length) {
    const trimmed = line.trim();
    if (trimmed === '{') {
      const nextLine = lines[i + 1];
      const nextNextLine = lines[i + 2];
      
      const nameMatch = nextLine ? nextLine.match(/^\s*name:\s*['"]([^'"]+)['"]/) : null;
      const codeMatch = nextNextLine ? nextNextLine.match(/^\s*code:\s*['"]([A-Z]{2})['"]/) : null;
      
      if (nameMatch && codeMatch) {
        currentState = {
          name: nameMatch[1],
          code: codeMatch[1],
          startLine: i
        };
        stateStartLine = i;
        braceDepth = 0; // Start at 0, will count the opening brace below
        inString = false;
        stringChar = null;
        // Don't continue - process this line for brace counting
      }
    }
  }
  
  // Track current state
  if (currentState) {
    // Count braces, handling strings properly
    let lineBraces = 0;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : '';
      
      if (prevChar !== '\\') {
        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
          stringChar = null;
        }
      }
      
      if (!inString) {
        if (char === '{') {
          braceDepth++;
          lineBraces++;
        }
        if (char === '}') {
          braceDepth--;
          lineBraces--;
          if (braceDepth === 0 && i > stateStartLine) {
            // State complete!
            states.push({
              name: currentState.name,
              code: currentState.code,
              startLine: currentState.startLine,
              endLine: i
            });
            console.log(`   ${states.length}. ${currentState.name} (${currentState.code}) - lines ${currentState.startLine + 1}-${i + 1}`);
            currentState = null;
            stateStartLine = -1;
            braceDepth = 0;
            break;
          }
        }
      }
    }
    
  }
}

// Check if we ended with an incomplete state
if (currentState) {
  console.log(`\n⚠️  File ended with incomplete state: ${currentState.name} (${currentState.code})`);
  console.log(`   Brace depth: ${braceDepth}, Started at line: ${currentState.startLine + 1}`);
}

console.log(`\n📊 Found ${states.length} states`);

if (states.length === 0) {
  console.error('❌ No states found!');
  process.exit(1);
}

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
  
  // Extract state content
  const stateLines = lines.slice(state.startLine, state.endLine + 1);
  let stateContent = stateLines.join('\n').trim();
  
  // Remove trailing comma if present
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
  stateFiles.push({ code: state.code, name: state.name });
  
  if ((i + 1) % 10 === 0 || i === states.length - 1) {
    console.log(`   Created ${i + 1}/${states.length} files...`);
  }
});

// Create index file
const indexContent = `/**
 * US States with Counties - Index
 * Generated from split-states-working.js
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

