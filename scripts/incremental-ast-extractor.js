/**
 * Incremental AST extractor - parse each state individually
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('🔄 Incremental AST Extractor');
console.log('============================\n');

const content = fs.readFileSync(sourceFile, 'utf8');
const lines = content.split('\n');

const targetStates = [
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

function extractAndParse(stateName, code) {
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
  
  // Create a minimal TypeScript file with just this state
  const tempFile = path.join(__dirname, 'temp-state.ts');
  const tempContent = `const state: any = ${stateContent};`;
  
  try {
    // Parse just this state
    const tsSourceFile = ts.createSourceFile(
      tempFile,
      tempContent,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Check for parse errors
    const diagnostics = [];
    const checker = ts.createProgram([tempFile], {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.CommonJS,
    }, {
      getSourceFile: (fileName) => {
        if (fileName === tempFile) return tsSourceFile;
        return undefined;
      },
      writeFile: () => {},
      getCurrentDirectory: () => __dirname,
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
    });
    
    const sourceFile = checker.getSourceFile(tempFile);
    if (sourceFile) {
      // Try to extract the object from the AST
      // Find the variable declaration
      let stateObj = null;
      
      function extractObject(node) {
        if (ts.isVariableDeclaration(node) && node.initializer) {
          if (ts.isObjectLiteralExpression(node.initializer)) {
            // Convert AST to object - this is complex, so use a simpler approach
            // Just use the source text and eval it
            const objText = tempContent.substring(
              node.initializer.getStart(tsSourceFile),
              node.initializer.getEnd()
            );
            
            try {
              stateObj = eval(`(${objText})`);
            } catch (e) {
              // Fallback: use the original stateContent
              stateObj = eval(`(${stateContent})`);
            }
          }
        }
        ts.forEachChild(node, extractObject);
      }
      
      extractObject(sourceFile);
      
      if (stateObj && stateObj.name && stateObj.code) {
        console.log(`  ✓ Successfully parsed!`);
        console.log(`  Found ${stateObj.counties?.length || 0} counties`);
        
        // Write JSON file
        const outputFile = path.join(outputDir, `${code.toLowerCase()}-cities.json`);
        fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
        console.log(`  ✓ Wrote ${outputFile}\n`);
        
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        return true;
      }
    }
    
    // If AST parsing failed, fall back to eval
    console.log(`  Trying fallback eval...`);
    const stateObj = eval(`(${stateContent})`);
    
    if (stateObj && stateObj.name && stateObj.code) {
      console.log(`  ✓ Successfully parsed with eval!`);
      console.log(`  Found ${stateObj.counties?.length || 0} counties`);
      
      const outputFile = path.join(outputDir, `${code.toLowerCase()}-cities.json`);
      fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
      console.log(`  ✓ Wrote ${outputFile}\n`);
      
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      return true;
    }
    
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    console.log(`  ✗ Failed to parse\n`);
    return false;
  } catch (error) {
    console.log(`  ✗ Error: ${error.message.substring(0, 100)}\n`);
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    return false;
  }
}

// Process each state
let successCount = 0;
for (const state of targetStates) {
  if (extractAndParse(state.name, state.code)) {
    successCount++;
  }
}

console.log('='.repeat(50));
console.log(`Results: ${successCount}/${targetStates.length} states processed`);
console.log('='.repeat(50));

