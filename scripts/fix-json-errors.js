/**
 * Fix JSON parsing errors by inspecting exact error locations
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('🔧 JSON Error Fixer');
console.log('===================\n');

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

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
            return i - 1;
          }
        }
      }
    }
  }
  return -1;
}

function tsToJson(tsContent) {
  let json = tsContent;
  json = json.replace(/:\s*USState\[\]/g, '');
  json = json.replace(/:\s*USCityWithCounty\[\]/g, '');
  json = json.replace(/:\s*USCounty\[\]/g, '');
  json = json.replace(/"/g, '\\"');
  json = json.replace(/'/g, '"');
  json = json.replace(/\\"/g, "'");
  json = json.replace(/"([^"]*)\\'([st])([^"]*)"/g, '"$1\'$2$3"');
  json = json.replace(/,\s*([}\]])/g, '$1');
  json = json.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  return json;
}

function fixAndParse(stateName, code) {
  console.log(`Processing ${stateName} (${code})...`);
  
  const startLine = findState(stateName);
  if (startLine === -1) {
    console.log(`  ⚠ Not found\n`);
    return false;
  }
  
  const endLine = findStateEnd(startLine, stateName);
  if (endLine === -1) {
    console.log(`  ⚠ End not found\n`);
    return false;
  }
  
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
  }
  
  // Fix missing commas
  stateContent = stateContent.replace(/\}\s*\{/g, '}, {');
  stateContent = stateContent.replace(/\]\s*\{/g, '], {');
  stateContent = stateContent.replace(/\}\s*\]/g, '}, ]');
  
  // Try to parse with iterative error fixing
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const jsonString = tsToJson(stateContent);
      const stateObj = JSON.parse(jsonString);
      
      if (stateObj && stateObj.name && stateObj.code) {
        console.log(`  ✓ Successfully parsed after ${attempts} attempt(s)!`);
        console.log(`  Found ${stateObj.counties?.length || 0} counties`);
        
        const outputFile = path.join(outputDir, `${code.toLowerCase()}-cities.json`);
        fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
        console.log(`  ✓ Wrote ${outputFile}\n`);
        return true;
      }
    } catch (error) {
      const errorMsg = error.message;
      
      if (errorMsg.includes('position')) {
        const posMatch = errorMsg.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1]);
          const jsonString = tsToJson(stateContent);
          const before = jsonString.substring(Math.max(0, pos - 50), pos);
          const after = jsonString.substring(pos, Math.min(jsonString.length, pos + 50));
          
          // Try to fix common issues at this position
          // If it's expecting a comma, add one
          if (errorMsg.includes("Expected ','")) {
            // Find the character before the error position in original content
            const originalPos = Math.floor(pos * (stateContent.length / jsonString.length));
            const beforeOriginal = stateContent.substring(Math.max(0, originalPos - 20), originalPos);
            const atError = stateContent.substring(originalPos, Math.min(stateContent.length, originalPos + 20));
            
            // If we see } or ] followed by { or [, add comma
            if (beforeOriginal.match(/[}\]\s]*$/) && atError.match(/^[\s]*[{\[]/)) {
              stateContent = stateContent.substring(0, originalPos) + ',' + stateContent.substring(originalPos);
              continue;
            }
          }
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log(`  ✗ Failed after ${maxAttempts} attempts: ${errorMsg.substring(0, 100)}\n`);
        return false;
      }
    }
  }
  
  return false;
}

// Process states
const states = [
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Florida', code: 'FL' },
];

let successCount = 0;
for (const state of states) {
  if (fixAndParse(state.name, state.code)) {
    successCount++;
  }
}

console.log('='.repeat(50));
console.log(`Results: ${successCount}/${states.length} states processed`);
console.log('='.repeat(50));

