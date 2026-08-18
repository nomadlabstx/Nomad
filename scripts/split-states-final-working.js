#!/usr/bin/env node

/**
 * Split us-cities-with-counties.ts by state - Final Working Version
 * Finds all state starts, then extracts each state up to the next state
 */

const fs = require('fs');
const path = require('path');

console.log('📂 Splitting US Cities by State (Final)');
console.log('='.repeat(70));

const inputFile = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const fullContent = fs.readFileSync(inputFile, 'utf8');
const lines = fullContent.split('\n');

// Extract interfaces
const exportConstIndex = fullContent.indexOf('export const US_STATES_WITH_COUNTIES');
const interfaces = fullContent.substring(0, exportConstIndex).trim();

const typesFile = path.join(__dirname, '..', 'data', 'us-cities-types.ts');
fs.writeFileSync(typesFile, interfaces + '\n', 'utf8');
console.log('✅ Created us-cities-types.ts');

// Find array start
let arrayStartLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export const US_STATES_WITH_COUNTIES')) {
    arrayStartLine = i + 1;
    break;
  }
}

// Find all state start positions
const stateStarts = [];
for (let i = arrayStartLine; i < lines.length - 2; i++) {
  const line = lines[i];
  if (line.trim() === '{') {
    const nextLine = lines[i + 1];
    const nextNextLine = lines[i + 2];
    
    const nameMatch = nextLine && nextLine.match(/^\s*name:\s*['"]([^'"]+)['"]/);
    const codeMatch = nextNextLine && nextNextLine.match(/^\s*code:\s*['"]([A-Z]{2})['"]/);
    
    if (nameMatch && codeMatch) {
      stateStarts.push({
        name: nameMatch[1],
        code: codeMatch[1],
        startLine: i
      });
    }
  }
}

console.log(`\n📊 Found ${stateStarts.length} state starts`);

// For each state, extract content up to the next state (or end of array)
const states = [];
for (let i = 0; i < stateStarts.length; i++) {
  const state = stateStarts[i];
  const startLine = state.startLine;
  const endLine = i < stateStarts.length - 1 
    ? stateStarts[i + 1].startLine - 1  // Up to next state
    : lines.length - 2;  // Up to closing bracket of array
  
  // Find the actual closing brace for this state
  // Count braces from start to find matching closing brace
  let braceCount = 0;
  let actualEndLine = endLine;
  
  for (let j = startLine; j <= endLine && j < lines.length; j++) {
    const line = lines[j];
    let inString = false;
    let stringChar = null;
    
    for (let k = 0; k < line.length; k++) {
      const char = line[k];
      const prevChar = k > 0 ? line[k - 1] : '';
      
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
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0 && j > startLine) {
            actualEndLine = j;
            break;
          }
        }
      }
    }
    
    if (braceCount === 0 && j > startLine) break;
  }
  
  const stateLines = lines.slice(startLine, actualEndLine + 1);
  const stateContent = stateLines.join('\n').trim();
  
  // Remove trailing comma
  let cleanedContent = stateContent;
  if (cleanedContent.endsWith(',')) {
    cleanedContent = cleanedContent.slice(0, -1);
  }
  
  states.push({
    name: state.name,
    code: state.code,
    startLine: startLine,
    endLine: actualEndLine,
    content: cleanedContent
  });
  
  console.log(`   ${i + 1}. ${state.name} (${state.code}) - lines ${startLine + 1}-${actualEndLine + 1}`);
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
  
  const fileContent = `/**
 * ${state.name} Cities
 * Generated from us-cities-with-counties.ts
 */

import type { USState } from '../us-cities-types';

export const ${state.code}_STATE: USState = ${state.content};
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
 * Generated from split-states-final-working.js
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


