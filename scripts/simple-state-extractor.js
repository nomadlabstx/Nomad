/**
 * Simple state extractor - uses line-by-line parsing instead of regex
 * This handles the 9 failing states more robustly
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');

// States that are failing
// Note: AL (Alabama) is too large - will handle separately with streaming parser
const failingStates = ['AR', 'CA', 'CO', 'CT', 'FL', 'IL']; // Skipping AL for now

console.log('Reading source file...');
const content = fs.readFileSync(sourceFile, 'utf8');

// Find the array start
const exportIndex = content.lastIndexOf('export const US_STATES_WITH_COUNTIES');
const arrayStart = content.indexOf('[', exportIndex);

console.log(`Found array at position ${arrayStart}`);

// Extract state by finding its boundaries more carefully
function extractState(stateCode, stateName) {
  console.log(`\nExtracting ${stateName} (${stateCode})...`);
  
  // Find state start using line-based approach (faster and more reliable)
  // Read file line by line to find the state
  const lines = content.split('\n');
  let stateStartLine = -1;
  let stateStartPos = -1;
  
  console.log(`  Searching ${lines.length} lines...`);
  
  // Find the line with name: 'StateName', then look back for the opening {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`name: '${stateName}'`)) {
      // Found the name line, now look back for the opening brace
      let braceLine = i;
      let bracePos = -1;
      
      // Check current line first
      if (lines[i].includes('{')) {
        bracePos = lines[i].indexOf('{');
      } else {
        // Look back up to 3 lines
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          if (lines[j].includes('{')) {
            braceLine = j;
            bracePos = lines[j].indexOf('{');
            break;
          }
        }
      }
      
      if (bracePos >= 0) {
        stateStartLine = braceLine;
        // Calculate position: sum of lengths of all previous lines + newlines
        stateStartPos = lines.slice(0, braceLine).join('\n').length;
        if (braceLine > 0) stateStartPos += 1; // Add newline
        stateStartPos += bracePos;
        break;
      }
    }
  }
  
  if (stateStartLine === -1) {
    console.warn(`  ⚠ State ${stateName} not found`);
    return null;
  }
  
  console.log(`  Found at line ${stateStartLine + 1}, position ${stateStartPos}`);
  
  const stateStart = stateStartPos;
  
  // Find the next state using line-based approach (more reliable)
  let stateEndLine = lines.length;
  let stateEndPos = content.length;
  
  // Look for the next state starting from after current state
  // Pattern: ] }, \n { \n name: 'NextState'
  // We need to find the LAST ] }, before the next state starts
  let lastStateEndLine = -1;
  
  // Search for the pattern: ] }, followed by { and then name: 'NextState'
  // We need to find ALL ] }, patterns and check which one is before the next state
  for (let i = stateStartLine + 10; i < lines.length; i++) {
    // Look for pattern: ] }, on a line
    if (lines[i].trim() === '] },') {
      // Check if the lines after this ] }, start a new state
      // Pattern should be: ] }, \n { \n name: 'NextState' \n code: 'XX'
      let foundNextState = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].trim() === '{') {
          // Check if the line after that has name: 'NextState' AND code: 'XX' (confirms it's a state)
          if (lines[j+1] && lines[j+1].includes("name: '") && lines[j+2] && lines[j+2].includes("code: '")) {
            const nextStateName = lines[j+1].match(/name:\s*'([^']+)'/);
            if (nextStateName && nextStateName[1] !== stateName) {
              // Found next state! This ] }, is on line i
              // The state ends with: ] on line i-2, } on line i-1, then ] }, on line i
              // We want to include both ] and } lines, so end at line i-1 (the } line)
              foundNextState = true;
              lastStateEndLine = i - 1; // End at the } line (line i-1)
              // This will include both line i-2 (]) and line i-1 (}) when we slice
              break;
            }
          }
        }
      }
      if (foundNextState) break;
    }
  }
  
  if (lastStateEndLine >= 0) {
    // The state structure is:
    // Line lastStateEndLine - 1: ] (closes counties array)
    // Line lastStateEndLine: } (closes state object)
    // Line lastStateEndLine + 1: ] }, (boundary marker)
    // We need to include BOTH the ] and } lines
    // lastStateEndLine points to the } line, so we include up to and including that line
    // This will automatically include the ] line before it
    stateEndLine = lastStateEndLine; // The } that closes the state
    // Include from start up to and including the } line
    // This includes both line lastStateEndLine-1 (]) and lastStateEndLine (})
    stateEndPos = lines.slice(0, lastStateEndLine + 1).join('\n').length;
    if (lastStateEndLine + 1 > 0) stateEndPos += 1; // Add newline after the } line
  }
  
  // Fallback: use regex if line-based didn't work
  if (stateEndPos === content.length) {
    const nextStatePattern = /}\s*,\s*\n\s*{\s*\n\s*name:\s*'[^']+',\s*\n\s*code:\s*'[A-Z]{2}'/g;
    let nextMatch;
    const searchStart = stateStart + 200;
    
    while ((nextMatch = nextStatePattern.exec(content.substring(searchStart))) !== null) {
      const nextStatePos = searchStart + nextMatch.index;
      if (nextStatePos > stateStart) {
        stateEndPos = nextStatePos + 2; // Include },
        break;
      }
    }
  }
  
  console.log(`  Found end at position ${stateEndPos} (line ${stateEndLine + 1})`);
  
  // Extract the state content
  let stateContent = content.substring(stateStart, stateEndPos);
  
  // Clean up - ensure we have a complete state object
  stateContent = stateContent.trim();
  
  // CRITICAL FIX: Remove any content before the opening brace
  // The extractor might include ] }, from previous state
  const firstBrace = stateContent.indexOf('{');
  if (firstBrace > 0) {
    const removed = stateContent.substring(0, firstBrace);
    stateContent = stateContent.substring(firstBrace);
    console.log(`  Removed ${firstBrace} chars before opening brace: "${removed.substring(Math.max(0, removed.length - 30))}"`);
  }
  
  // Remove trailing comma if present (before closing brace)
  stateContent = stateContent.replace(/,\s*$/, '');
  
  // Ensure it ends with } (not },)
  if (stateContent.endsWith('},')) {
    stateContent = stateContent.slice(0, -1); // Remove trailing comma
  }
  
  // Clean up common syntax issues before parsing
  let cleaned = stateContent;
  
  // Debug: Log first 200 chars to see what we're parsing
  if (stateCode === 'AR' || stateCode === 'CA' || stateCode === 'CO' || stateCode === 'CT' || stateCode === 'FL' || stateCode === 'IL') {
    console.log(`  Debug - First 200 chars: ${cleaned.substring(0, 200)}`);
    console.log(`  Debug - Last 200 chars: ${cleaned.substring(Math.max(0, cleaned.length - 200))}`);
  }
  
  // Fix common issues
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  // Fix double commas
  cleaned = cleaned.replace(/,\s*,/g, ',');
  // Ensure proper spacing
  cleaned = cleaned.replace(/\}\s*\]\s*,\s*\}/g, '} ] },');
  
  // Verify the content ends correctly: should end with ] then }
  const trimmed = cleaned.trim();
  if (!trimmed.endsWith('}')) {
    // Try to find where } should be
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace >= 0) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }
  }
  
  // Check if we have both ] and } at the end
  // The structure should be: ... ] \n }
  const lastLines = cleaned.split('\n').slice(-3);
  const hasClosingBracket = lastLines.some(line => line.trim() === ']');
  const hasClosingBrace = lastLines.some(line => line.trim() === '}');
  
  // Check balance
  let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
  let inString = false, stringChar = null, escaped = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
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
  
  // Only add closers if we're actually missing them
  // Don't add if we already have them (would create duplicates)
  if (bracketBalance > 0 && !hasClosingBracket) {
    console.log(`  Adding ${bracketBalance} ] to balance`);
    for (let i = 0; i < bracketBalance; i++) cleaned += '\n]';
  }
  if (braceBalance > 0 && !hasClosingBrace) {
    console.log(`  Adding ${braceBalance} } to balance`);
    for (let i = 0; i < braceBalance; i++) cleaned += '\n}';
  }
  
  // If we have too many closers, remove them
  if (bracketBalance < 0 || braceBalance < 0) {
    // Don't add, we have too many
    console.log(`  Note: Balance is ${bracketBalance} brackets, ${braceBalance} braces (may have extra closers)`);
  }
  
  // Try to parse using eval (more lenient than Function constructor)
  let stateObj;
  try {
    // Wrap in parentheses to make it an expression
    stateObj = eval(`(${cleaned})`);
    
    if (!stateObj || !stateObj.name || !stateObj.code) {
      throw new Error('Invalid state object');
    }
    
    console.log(`  ✓ Successfully parsed ${stateObj.name} (${stateObj.code})`);
    console.log(`  Found ${stateObj.counties?.length || 0} counties`);
    
    return stateObj;
  } catch (error) {
    console.warn(`  ⚠ Parse error: ${error.message.substring(0, 100)}`);
    
    // Try with Function constructor as fallback
    try {
      const func = new Function(`return ${cleaned}`);
      stateObj = func();
      
      if (!stateObj || !stateObj.name || !stateObj.code) {
        throw new Error('Invalid state object');
      }
      
      console.log(`  ✓ Successfully parsed with Function constructor`);
      return stateObj;
    } catch (funcError) {
      console.warn(`  ⚠ Function constructor also failed: ${funcError.message.substring(0, 100)}`);
      
      // Last resort: Try to manually construct from the content
      // Extract basic info using regex
      const nameMatch = cleaned.match(/name:\s*'([^']+)'/);
      const codeMatch = cleaned.match(/code:\s*'([^']+)'/);
      
      if (nameMatch && codeMatch) {
        console.warn(`  ⚠ Manual extraction attempted but structure too complex`);
        // Could implement manual parsing here, but it's complex
      }
      
      return null;
    }
  }
}

// Process each failing state
let successCount = 0;
for (const stateCode of failingStates) {
  const stateNames = {
    'AL': 'Alabama',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'FL': 'Florida',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois'
  };
  
  const stateName = stateNames[stateCode];
  const stateObj = extractState(stateCode, stateName);
  
  if (stateObj) {
    // Sort counties and cities
    if (stateObj.counties) {
      stateObj.counties.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      stateObj.counties.forEach(county => {
        if (county.cities) {
          county.cities.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
      });
    }
    
    // Determine if we need to split into multiple files
    const countyCount = stateObj.counties?.length || 0;
    const maxCountiesPerFile = 30; // Split large states
    
    if (countyCount <= maxCountiesPerFile) {
      // Single file
      const outputFile = path.join(outputDir, `${stateCode.toLowerCase()}-cities.json`);
      fs.writeFileSync(outputFile, JSON.stringify(stateObj, null, 2), 'utf8');
      console.log(`  ✓ Wrote ${outputFile}`);
      successCount++;
    } else {
      // Split into multiple files
      const fileCount = Math.ceil(countyCount / maxCountiesPerFile);
      console.log(`  Splitting into ${fileCount} files...`);
      
      for (let i = 0; i < fileCount; i++) {
        const startIdx = i * maxCountiesPerFile;
        const endIdx = Math.min(startIdx + maxCountiesPerFile, countyCount);
        const partCounties = stateObj.counties.slice(startIdx, endIdx);
        
        const partState = {
          name: stateObj.name,
          code: stateObj.code,
          counties: partCounties
        };
        
        const partNum = i + 1;
        const outputFile = path.join(outputDir, `${stateCode.toLowerCase()}-cities-part${partNum}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(partState, null, 2), 'utf8');
        console.log(`  ✓ Wrote part ${partNum}/${fileCount}: ${outputFile} (${partCounties.length} counties)`);
      }
      successCount++;
    }
  }
}

console.log(`\n✓ Successfully processed ${successCount}/${failingStates.length} failing states`);

