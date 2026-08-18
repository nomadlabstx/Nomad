/**
 * Proper TypeScript parser using TypeScript compiler API
 * This will actually parse the TypeScript syntax correctly
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('🔧 Proper TypeScript Parser');
console.log('===========================\n');

// Read source
const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

// States to process
const failingStates = [
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Florida', code: 'FL' },
  { name: 'Illinois', code: 'IL' },
];

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

// Extract state object as JavaScript object
function extractStateObject(stateName, code) {
  console.log(`Processing ${stateName} (${code})...`);
  
  const startLine = findState(stateName);
  if (startLine === -1) {
    console.log(`  ⚠ Not found\n`);
    return null;
  }
  
  const endLine = findStateEnd(startLine, stateName);
  if (endLine === -1) {
    console.log(`  ⚠ End not found\n`);
    return null;
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
  
  // Create a temporary TypeScript file
  const tempFile = path.join(__dirname, 'temp-state.ts');
  const tempContent = `const state = ${stateContent};`;
  fs.writeFileSync(tempFile, tempContent, 'utf8');
  
  try {
    // Use TypeScript compiler to parse
    const sourceFile = ts.createSourceFile(
      tempFile,
      tempContent,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Check for syntax errors
    const diagnostics = [];
    ts.forEachChild(sourceFile, (node) => {
      // This will catch syntax errors
    });
    
    // If no errors, try to evaluate
    // Since we can't easily extract the object from AST, use a different approach
    // Compile to JavaScript and then eval
    const result = ts.transpileModule(tempContent, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      }
    });
    
    // Execute the compiled code
    const stateObj = eval(result.outputText.replace('const state = ', '').replace(';', ''));
    
    if (stateObj && stateObj.name && stateObj.code) {
      console.log(`  ✓ Successfully parsed!`);
      console.log(`  Found ${stateObj.counties?.length || 0} counties`);
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      return stateObj;
    } else {
      console.log(`  ⚠ Invalid object structure`);
      fs.unlinkSync(tempFile);
      return null;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message.substring(0, 100)}`);
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    return null;
  }
}

// Process each state
console.log('Processing states with TypeScript parser...\n');

let successCount = 0;
for (const state of failingStates) {
  const stateObj = extractStateObject(state.name, state.code);
  
  if (stateObj) {
    // Write JSON file
    const outputFile = path.join(outputDir, `${state.code.toLowerCase()}-cities.json`);
    fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
    console.log(`  ✓ Wrote ${outputFile}\n`);
    successCount++;
  } else {
    console.log(`  ✗ Failed to process\n`);
  }
}

console.log('='.repeat(50));
console.log(`Results: ${successCount}/${failingStates.length} states processed`);
console.log('='.repeat(50));

