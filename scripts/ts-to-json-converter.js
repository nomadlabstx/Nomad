/**
 * Convert TypeScript object syntax to JSON and fix errors
 * This is the REAL fix - convert to JSON which is easier to parse
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('🔄 TypeScript to JSON Converter');
console.log('================================\n');

// Read source
const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// Find array start
const arrayStart = content.indexOf('export const US_STATES_WITH_COUNTIES: USState[] = [');
const arrayContent = content.substring(arrayStart);

// States to process
const failingStates = ['Arkansas', 'California', 'Colorado', 'Connecticut', 'Florida', 'Illinois'];

function findState(stateName) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`name: '${stateName}'`)) {
      let startLine = i;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (lines[j].includes('{')) {
          startLine = j;
          break;
        }
      }
      return startLine;
    }
  }
  return -1;
}

function findStateEnd(startLine, stateName) {
  for (let i = startLine + 10; i < lines.length; i++) {
    if (lines[i].trim() === '] },') {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() === '{' && lines[j+1] && lines[j+1].includes("name: '") && lines[j+2] && lines[j+2].includes("code: '")) {
          const nextStateName = lines[j+1].match(/name:\s*'([^']+)'/);
          if (nextStateName && nextStateName[1] !== stateName) {
            return i - 1; // The } line
          }
        }
      }
    }
  }
  return -1;
}

// Convert TS object to JSON string
function tsToJson(tsContent) {
  let json = tsContent;
  
  // Remove TypeScript type annotations
  json = json.replace(/:\s*USState\[\]/g, '');
  json = json.replace(/:\s*USCityWithCounty\[\]/g, '');
  json = json.replace(/:\s*USCounty\[\]/g, '');
  
  // Convert single quotes to double quotes (but handle escaped quotes)
  // First, escape existing double quotes
  json = json.replace(/"/g, '\\"');
  // Then convert single quotes to double quotes
  json = json.replace(/'/g, '"');
  // Fix escaped single quotes in strings
  json = json.replace(/\\"/g, "'");
  json = json.replace(/"([^"]*)\\'([st])([^"]*)"/g, '"$1\'$2$3"');
  
  // Remove trailing commas
  json = json.replace(/,\s*([}\]])/g, '$1');
  
  // Fix property names (ensure they're quoted)
  json = json.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  
  return json;
}

// Process each failing state
console.log('Processing failing states...\n');

for (const stateName of failingStates) {
  console.log(`Processing ${stateName}...`);
  
  const startLine = findState(stateName);
  if (startLine === -1) {
    console.log(`  ⚠ Not found\n`);
    continue;
  }
  
  const endLine = findStateEnd(startLine, stateName);
  if (endLine === -1) {
    console.log(`  ⚠ End not found\n`);
    continue;
  }
  
  console.log(`  Found: lines ${startLine + 1} to ${endLine + 1}`);
  
  // Extract content
  let stateContent = lines.slice(startLine, endLine + 1).join('\n');
  const firstBrace = stateContent.indexOf('{');
  if (firstBrace > 0) {
    stateContent = stateContent.substring(firstBrace);
  }
  
  // Add missing closers
  let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
  let inString = false, stringChar = null, escaped = false;
  
  for (let i = 0; i < stateContent.length; i++) {
    const char = stateContent[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (!inString && (char === "'" || char === '"')) {
      inString = true; stringChar = char; continue;
    } else if (inString && char === stringChar) {
      inString = false; stringChar = null; continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') closeBraces++;
      else if (char === '[') openBrackets++;
      else if (char === ']') closeBrackets++;
    }
  }
  
  const braceBalance = openBraces - closeBraces;
  const bracketBalance = openBrackets - closeBrackets;
  
  if (bracketBalance > 0 || braceBalance > 0) {
    for (let i = 0; i < bracketBalance; i++) stateContent += '\n]';
    for (let i = 0; i < braceBalance; i++) stateContent += '\n}';
    console.log(`  Added ${bracketBalance} ] and ${braceBalance} }`);
  }
  
  // Fix missing commas before converting to JSON
  // Pattern: } followed by { (missing comma between objects)
  stateContent = stateContent.replace(/\}\s*\{/g, '}, {');
  // Pattern: ] followed by { (missing comma)
  stateContent = stateContent.replace(/\]\s*\{/g, '], {');
  // Pattern: } followed by ] (missing comma)
  stateContent = stateContent.replace(/\}\s*\]/g, '}, ]');
  
  // Convert to JSON
  try {
    const jsonString = tsToJson(stateContent);
    const stateObj = JSON.parse(jsonString);
    
    if (stateObj && stateObj.name && stateObj.code) {
      console.log(`  ✓ Successfully converted and parsed!`);
      console.log(`  Found ${stateObj.counties?.length || 0} counties`);
      
      // Write JSON file
      const outputFile = path.join(outputDir, `${stateObj.code.toLowerCase()}-cities.json`);
      fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
      console.log(`  ✓ Wrote ${outputFile}\n`);
    } else {
      console.log(`  ⚠ Invalid object structure\n`);
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message.substring(0, 100)}\n`);
  }
}

console.log('='.repeat(50));
console.log('✓ Conversion complete!');
console.log('='.repeat(50));

