/**
 * Extract states from TypeScript AST
 * Parse the entire source file and extract state objects from the AST
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

console.log('🌳 AST-Based State Extractor');
console.log('=============================\n');

// Read source
const content = fs.readFileSync(sourceFile, 'utf8');

// Create TypeScript source file
const tsSourceFile = ts.createSourceFile(
  sourceFile,
  content,
  ts.ScriptTarget.Latest,
  true
);

// States to extract
const targetStates = ['Arkansas', 'California', 'Colorado', 'Connecticut', 'Florida', 'Illinois'];
const extractedStates = [];

// Traverse AST to find the array
function traverse(node, depth = 0) {
  // Look for variable declaration: US_STATES_WITH_COUNTIES
  if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    if (node.name.text === 'US_STATES_WITH_COUNTIES') {
      // Found it! Now extract the array elements
      if (node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
        const arrayElements = node.initializer.elements;
        
        console.log(`Found US_STATES_WITH_COUNTIES array with ${arrayElements.length} elements\n`);
        
        // Process each state object
        for (let i = 0; i < arrayElements.length; i++) {
          const element = arrayElements[i];
          
          if (ts.isObjectLiteralExpression(element)) {
            // Extract state name
            const nameProp = element.properties.find(p => 
              ts.isPropertyAssignment(p) && 
              ts.isIdentifier(p.name) && 
              p.name.text === 'name'
            );
            
            if (nameProp && ts.isPropertyAssignment(nameProp) && ts.isStringLiteral(nameProp.initializer)) {
              const stateName = nameProp.initializer.text;
              
              if (targetStates.includes(stateName)) {
                console.log(`Extracting ${stateName}...`);
                
                // Extract code
                const codeProp = element.properties.find(p => 
                  ts.isPropertyAssignment(p) && 
                  ts.isIdentifier(p.name) && 
                  p.name.text === 'code'
                );
                
                const stateCode = codeProp && ts.isPropertyAssignment(codeProp) && ts.isStringLiteral(codeProp.initializer)
                  ? codeProp.initializer.text
                  : null;
                
                // Convert AST node to JavaScript object
                // This is complex - let's use a simpler approach
                // Get the source text for this node
                const stateText = content.substring(element.getStart(tsSourceFile), element.getEnd());
                
                // Try to parse it as JavaScript
                try {
                  // Add missing closers first
                  let stateContent = stateText;
                  
                  // Check balance
                  let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
                  let inString = false, stringChar = null, escaped = false;
                  
                  for (let j = 0; j < stateContent.length; j++) {
                    const char = stateContent[j];
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
                    for (let j = 0; j < bracketBalance; j++) stateContent += '\n]';
                    for (let j = 0; j < braceBalance; j++) stateContent += '\n}';
                  }
                  
                  // Parse using eval (now that we have balanced brackets)
                  const stateObj = eval(`(${stateContent})`);
                  
                  if (stateObj && stateObj.name && stateObj.code) {
                    console.log(`  ✓ Successfully extracted!`);
                    console.log(`  Found ${stateObj.counties?.length || 0} counties`);
                    
                    extractedStates.push(stateObj);
                    
                    // Write JSON file
                    const outputFile = path.join(outputDir, `${stateCode.toLowerCase()}-cities.json`);
                    fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
                    console.log(`  ✓ Wrote ${outputFile}\n`);
                  } else {
                    console.log(`  ⚠ Invalid object structure\n`);
                  }
                } catch (error) {
                  console.log(`  ✗ Parse error: ${error.message.substring(0, 100)}\n`);
                }
              }
            }
          }
        }
      }
    }
  }
  
  ts.forEachChild(node, (child) => traverse(child, depth + 1));
}

// Start traversal
console.log('Parsing TypeScript source file...\n');
traverse(tsSourceFile);

console.log('='.repeat(50));
console.log(`Results: ${extractedStates.length}/${targetStates.length} states extracted`);
console.log('='.repeat(50));

