const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states-json');
const indexFile = path.join(__dirname, '../data/us-cities-index.ts');

const stateCodeMap = {
  'AL': 'al', 'AK': 'ak', 'AZ': 'az', 'AR': 'ar', 'CA': 'ca', 'CO': 'co', 'CT': 'ct',
  'DE': 'de', 'FL': 'fl', 'GA': 'ga', 'HI': 'hi', 'ID': 'id', 'IL': 'il', 'IN': 'in',
  'IA': 'ia', 'KS': 'ks', 'KY': 'ky', 'LA': 'la', 'ME': 'me', 'MD': 'md', 'MA': 'ma',
  'MI': 'mi', 'MN': 'mn', 'MS': 'ms', 'MO': 'mo', 'MT': 'mt', 'NE': 'ne', 'NV': 'nv',
  'NH': 'nh', 'NJ': 'nj', 'NM': 'nm', 'NY': 'ny', 'NC': 'nc', 'ND': 'nd', 'OH': 'oh',
  'OK': 'ok', 'OR': 'or', 'PA': 'pa', 'RI': 'ri', 'SC': 'sc', 'SD': 'sd', 'TN': 'tn',
  'TX': 'tx', 'UT': 'ut', 'VT': 'vt', 'VA': 'va', 'WA': 'wa', 'WV': 'wv', 'WI': 'wi',
  'WY': 'wy', 'DC': 'dc'
};

console.log('Reading file...');
let fileContent = fs.readFileSync(inputFile, 'utf8');

// Find the LAST occurrence of the export statement (in case there are duplicates)
const exportPattern = /export const US_STATES_WITH_COUNTIES: USState\[\] = \[/g;
let lastExportIndex = -1;
let match;
while ((match = exportPattern.exec(fileContent)) !== null) {
  lastExportIndex = match.index;
}

if (lastExportIndex === -1) {
  console.error('Could not find US_STATES_WITH_COUNTIES export statement');
  process.exit(1);
}

// Extract only the content after the last export statement
// Find the opening bracket after the export
const arrayStartIndex = fileContent.indexOf('[', lastExportIndex);
if (arrayStartIndex === -1) {
  console.error('Could not find array start bracket');
  process.exit(1);
}

// Extract from the opening bracket to the end of file (we'll find the matching closing bracket later)
// But first, let's work with the content starting from the array
fileContent = fileContent.substring(arrayStartIndex + 1); // Skip the opening bracket

console.log(`Using content starting from array at position ${arrayStartIndex}`);

// Find all state starts within the array content
const stateStarts = [];
const stateRegex = /name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/g;
let stateMatch;
while ((stateMatch = stateRegex.exec(fileContent)) !== null) {
  let stateStart = stateMatch.index;
  // Go backwards to find opening brace
  for (let i = stateMatch.index - 1; i >= 0 && i > stateMatch.index - 500; i--) {
    if (fileContent[i] === '{') {
      const beforeBrace = fileContent.substring(Math.max(0, i - 10), i);
      if (beforeBrace.trim().endsWith('\n') || beforeBrace.trim() === '' || beforeBrace.includes('  {')) {
        stateStart = i;
        break;
      }
    }
  }
  stateStarts.push({ index: stateStart, name: stateMatch[1], code: stateMatch[2], nameCodeIndex: stateMatch.index });
}

// Remove duplicates (same state code)
const uniqueStates = [];
const seenCodes = new Set();
for (const state of stateStarts) {
  if (!seenCodes.has(state.code)) {
    seenCodes.add(state.code);
    uniqueStates.push(state);
  } else {
    // If duplicate, keep the one with more content (later in file usually means more complete)
    const existingIndex = uniqueStates.findIndex(s => s.code === state.code);
    if (existingIndex >= 0 && state.index > uniqueStates[existingIndex].index) {
      uniqueStates[existingIndex] = state;
    }
  }
}

console.log(`Found ${stateStarts.length} state matches, ${uniqueStates.length} unique states`);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Process each state
const stateFiles = [];
const MAX_COUNTIES_PER_FILE = 30;

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

for (let i = 0; i < uniqueStates.length; i++) {
  const state = uniqueStates[i];
  // Find the actual opening brace of the state object - look backwards from name/code
  let startIndex = state.nameCodeIndex;
  // Look backwards for the opening brace that starts the state object
  // State object pattern: { ... name: 'StateName', code: 'XX',
  for (let j = state.nameCodeIndex - 1; j >= 0 && j > state.nameCodeIndex - 1000; j--) {
    if (fileContent[j] === '{') {
      // Check the context around this brace
      const contextBefore = fileContent.substring(Math.max(0, j - 10), j);
      const contextAfter = fileContent.substring(j, j + 50);
      // State object starts with { followed by whitespace/newline, then name:
      if ((contextBefore.trim().endsWith('\n') || contextBefore.trim() === '' || contextBefore.includes('[')) &&
          contextAfter.includes('name:') && contextAfter.includes('code:')) {
        startIndex = j;
        break;
      }
    }
  }
  
  // If we didn't find a good match, use the original index but look for the opening brace before it
  if (startIndex === state.nameCodeIndex) {
    // Look backwards more aggressively
    for (let j = state.nameCodeIndex - 1; j >= 0 && j > state.nameCodeIndex - 2000; j--) {
      if (fileContent[j] === '{') {
        const afterBrace = fileContent.substring(j, Math.min(fileContent.length, j + 100));
        if (afterBrace.includes(`name: '${state.name}'`) || afterBrace.includes(`name: "${state.name}"`)) {
          startIndex = j;
          break;
        }
      }
    }
  }
  
  const nextStateStart = i < uniqueStates.length - 1 ? uniqueStates[i + 1].index : fileContent.length;
  
  // Extract state content from opening brace to next state start
  let stateContent = fileContent.substring(startIndex, nextStateStart);
  
  // Find the actual opening brace of the state object
  // Look for the first { that's followed by name: and code: within reasonable distance
  let braceStartPos = -1;
  for (let pos = 0; pos < Math.min(2000, stateContent.length); pos++) {
    if (stateContent[pos] === '{') {
      const afterBrace = stateContent.substring(pos, Math.min(pos + 200, stateContent.length));
      // Check if this looks like a state object: { followed by name: and code:
      if (afterBrace.includes('name:') && afterBrace.includes('code:') && 
          afterBrace.indexOf('name:') < afterBrace.indexOf('code:')) {
        braceStartPos = pos;
        break;
      }
    }
  }
  
  // If we didn't find a good brace, try to find it by looking for the state name
  if (braceStartPos === -1) {
    const namePattern = new RegExp(`name:\\s*['"]${state.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
    const nameMatch = stateContent.match(namePattern);
    if (nameMatch && nameMatch.index !== undefined) {
      // Look backwards from the name match for the opening brace
      for (let pos = nameMatch.index - 1; pos >= 0 && pos > nameMatch.index - 500; pos--) {
        if (stateContent[pos] === '{') {
          braceStartPos = pos;
          break;
        }
      }
    }
  }
  
  // If still not found, start from the beginning
  if (braceStartPos === -1) {
    braceStartPos = 0;
  }
  
  // Trim to start from the opening brace
  stateContent = stateContent.substring(braceStartPos);
  
  // Now use brace counter to find the exact end of the state object
  // The state object structure is: { name: '...', code: '...', counties: [...] }
  // We need to find the closing } that matches the opening {
  // IMPORTANT: We need to track bracket depth for the counties array as well
  let braceDepth = 0;
  let bracketDepth = 0; // Track array brackets for counties: [...]
  let inString = false;
  let stringChar = null;
  let escaped = false;
  let stateEndPos = -1;
  let foundCountiesArray = false;
  
  for (let pos = 0; pos < stateContent.length; pos++) {
    const char = stateContent[pos];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    // Track string boundaries - this is critical for not counting braces inside strings
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      continue;
    } else if (inString && char === stringChar && !escaped) {
      inString = false;
      stringChar = null;
      continue;
    }
    
    // Only count braces and brackets outside of strings
    if (!inString) {
      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        // When depth reaches 0 AND we've found the counties array AND it's closed, we've found the state end
        if (braceDepth === 0 && foundCountiesArray && bracketDepth === 0) {
          stateEndPos = pos + 1; // Include the closing brace
          break; // Stop here - this is the end of the state object
        }
      } else if (char === '[') {
        // Check if this is the counties array
        const beforeBracket = stateContent.substring(Math.max(0, pos - 20), pos);
        if (beforeBracket.includes('counties:')) {
          foundCountiesArray = true;
        }
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
      }
    }
  }
  
  // If we didn't find the end using the counties array check, fall back to simple brace matching
  if (stateEndPos === -1) {
    braceDepth = 0;
    for (let pos = 0; pos < stateContent.length; pos++) {
      const char = stateContent[pos];
      if (char === '{' && !inString) {
        braceDepth++;
      } else if (char === '}' && !inString) {
        braceDepth--;
        if (braceDepth === 0) {
          stateEndPos = pos + 1;
          break;
        }
      }
      // Simple string tracking for this fallback
      if (char === "'" || char === '"') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && (pos === 0 || stateContent[pos - 1] !== '\\')) {
          inString = false;
          stringChar = null;
        }
      }
    }
  }
  
  // Extract just the state object
  if (stateEndPos > 0) {
    stateContent = stateContent.substring(0, stateEndPos).trim();
    // Remove trailing comma if present (before the closing brace)
    stateContent = stateContent.replace(/,\s*$/, '');
    // Ensure it ends with }
    if (!stateContent.endsWith('}')) {
      stateContent += '}';
    }
  } else {
    // Fallback: try to find the pattern that closes the state
    const stateEndPattern = /\]\s*\n\s*\}/;
    const endMatch = stateContent.match(stateEndPattern);
    if (endMatch && endMatch.index !== undefined) {
      stateEndPos = endMatch.index + endMatch[0].length;
      stateContent = stateContent.substring(0, stateEndPos).trim();
      stateContent = stateContent.replace(/,\s*$/, '');
    } else {
      // Last resort: find the last } before next state
      const lastBrace = stateContent.lastIndexOf('}');
      if (lastBrace > 0) {
        stateContent = stateContent.substring(0, lastBrace + 1).trim();
        stateContent = stateContent.replace(/,\s*$/, '');
      } else {
        console.warn(`⚠ Could not find end of state object for ${state.name} (${state.code})`);
        continue;
      }
    }
  }
  
  // Debug: Check if state content looks valid (first few states only)
  if (i < 3) {
    const countyMatches = stateContent.match(/name:\s*['"][^'"]+['"],\s*cities:\s*\[/g);
    const numCounties = countyMatches ? countyMatches.length : 0;
    const startsWithBrace = stateContent.trim().startsWith('{');
    const endsWithBrace = stateContent.trim().endsWith('}');
    console.log(`  Debug ${state.code}: Found ${numCounties} counties, starts with {=${startsWithBrace}, ends with }=${endsWithBrace}, length=${stateContent.length}, endPos=${stateEndPos}`);
    if (!startsWithBrace) {
      console.log(`    First 100 chars: ${stateContent.substring(0, 100)}`);
    }
    if (!endsWithBrace && stateEndPos > 0) {
      console.log(`    Last 100 chars: ${stateContent.substring(Math.max(0, stateContent.length - 100))}`);
    }
  }
  
  // Validate that we have a proper state object
  if (!stateContent.trim().startsWith('{')) {
    console.warn(`⚠ State ${state.code} does not start with {, skipping`);
    continue;
  }
  
  if (!stateContent.trim().endsWith('}')) {
    console.warn(`⚠ State ${state.code} does not end with }, trying to fix...`);
    // Try to add the closing brace
    stateContent = stateContent.trim();
    if (!stateContent.endsWith('}')) {
      stateContent += '\n}';
    }
  }
  
  // Fix common syntax errors before parsing
  let cleaned = stateContent;
  
  // Remove TypeScript-specific syntax
  cleaned = cleaned.replace(/:\s*USCityWithCounty\[\]/g, ': []');
  cleaned = cleaned.replace(/:\s*USCounty\[\]/g, ': []');
  
  // Fix double commas
  cleaned = cleaned.replace(/,\s*,/g, ',');
  
  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  // Fix missing commas between objects in arrays - be very aggressive
  // Pattern: } followed by whitespace/newlines and then {
  // Do this multiple times to catch all variations
  // IMPORTANT: This must catch cases like: } \n \n { (missing comma between city objects)
  let previousCleaned = '';
  let fixRound = 0;
  while (cleaned !== previousCleaned && fixRound < 10) {
    previousCleaned = cleaned;
    cleaned = cleaned.replace(/\}\s+\{/g, '}, {');
    cleaned = cleaned.replace(/\}\s*\n\s*\{/g, '}, {');
    cleaned = cleaned.replace(/\}\s*\n\s*\n\s*\{/g, '}, {');
    cleaned = cleaned.replace(/\}\s*\r?\n\s*\{/g, '}, {');
    cleaned = cleaned.replace(/\}\s*\r?\n\s*\r?\n\s*\{/g, '}, {');
    // Also catch: } followed by any whitespace and {
    cleaned = cleaned.replace(/\}(?=\s*\{)/g, '},');
    fixRound++;
  }
  
  // Fix missing commas after closing brackets before new objects
  cleaned = cleaned.replace(/\]\s*\{/g, '], {');
  cleaned = cleaned.replace(/\]\s*\n\s*\{/g, '], {');
  
  // Fix missing commas after closing braces in arrays
  // Pattern: } followed by whitespace/newline and then { or [
  cleaned = cleaned.replace(/\}\s*\n\s*([{\[])/g, '}, $1');
  
  // Fix cases where a closing bracket is followed directly by a closing brace (missing comma)
  cleaned = cleaned.replace(/\]\s*\}/g, '], }');
  
  // Fix object properties that are missing commas
  // Pattern: 'value' } or 'value' ] where there should be a comma
  cleaned = cleaned.replace(/(['"]\w+['"])\s*\n\s*([}\]])/g, '$1, $2');
  
  // Fix missing commas after object literals in arrays
  // Pattern: } ] where } should have a comma before ]
  cleaned = cleaned.replace(/\}\s*\]/g, '} ]');
  
  // Fix quadrupled/tripled names - pattern: 'Name'Word'Word'Word' -> 'Name\'Word'
  // This handles cases like 'Port O'Connor'Connor'Connor'Connor' -> 'Port O\'Connor'
  cleaned = cleaned.replace(/name:\s*'([^']+)'([A-Za-z]+)'(?:\2')+/g, (match, prefix, repeated) => {
    const baseName = `${prefix}'${repeated}`;
    return `name: '${baseName.replace(/'/g, "\\'")}'`;
  });
  
  // Fix unclosed quotes - pattern: name: 'Text' Text' -> name: 'Text Text' or name: 'Text\'s Text'
  cleaned = cleaned.replace(/name:\s*'([^']*)'\s+([A-Za-z][^']*)'/g, (match, p1, p2) => {
    if (p2.match(/^(Gap|Lakes|s\s|'s\s|Connor)/i)) {
      if (p2.startsWith("Connor")) {
        return `name: '${p1}'`;
      }
      return `name: '${p1}'s ${p2.replace(/^s\s+/, '').replace(/^'s\s+/, '')}'`;
    }
    return `name: '${p1} ${p2}'`;
  });
  
  // Fix broken strings - look for patterns like: 'text... (missing closing quote)
  // This is tricky, so we'll be conservative
  cleaned = cleaned.replace(/'([^']*)\n\s*([A-Za-z][^']*)'/g, (match, p1, p2) => {
    // If there's a newline in what looks like a string, try to fix it
    return `'${p1} ${p2}'`;
  });
  
  // Fix missing quotes around property values (shouldn't happen, but just in case)
  // Don't do this aggressively as it might break valid code
  
  // Remove any comments (though there shouldn't be any)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  
  // Convert TypeScript object syntax to JSON
  // This is more robust than trying to parse TypeScript directly
  let jsonString = cleaned;
  
  // Handle apostrophes in strings more carefully
  // The issue: 'Jackson's Gap' when converted to JSON becomes "Jackson"s Gap" which is invalid
  // Solution: In JSON, apostrophes don't need escaping, but we need to handle them when converting
  // Actually, in JSON strings, apostrophes are fine - the issue is when we convert ' to "
  // So 'Jackson's' becomes "Jackson"s" which breaks because the " ends the string early
  // We need to escape the apostrophe: "Jackson\'s" or just leave it as-is since JSON allows apostrophes
  
  // Better approach: Replace single quotes with double quotes, but handle apostrophes
  // Pattern: find strings like 'text's text' and convert to "text's text" (apostrophe is fine in JSON)
  // The regex /'([^']*)'/g won't work for strings with apostrophes, so we need a different approach
  
  // Simple approach: replace all ' with ", but this will break strings with apostrophes
  // So we need to escape apostrophes first, then convert quotes
  // Actually wait - in JSON, apostrophes in strings don't need escaping at all!
  // The problem is that 'text's' becomes "text"s" when we do a simple replace
  // We need to be smarter: only replace the outer quotes, not inner apostrophes
  
  // For now, let's try a simpler approach: use JavaScript eval instead of JSON parsing
  // JavaScript can handle the TypeScript object syntax directly
  
  // Debug: Check for remaining missing comma patterns (first state only)
  if (i === 0) {
    const missingCommaMatch = cleaned.match(/\}\s*\n\s*\n\s*\{/);
    if (missingCommaMatch) {
      const matchIndex = cleaned.indexOf(missingCommaMatch[0]);
      console.warn(`  Still found missing comma at position ${matchIndex}: ${missingCommaMatch[0].substring(0, 50)}`);
      // Try to manually fix this specific case
      cleaned = cleaned.replace(/\}\s*\n\s*\n\s*\{/g, '}, {');
    }
  }
  
  // Try to parse using JavaScript (more lenient than JSON)
  // JavaScript can handle the TypeScript object syntax directly
  let stateObj;
  try {
    // First, try to fix any remaining obvious issues
    // Remove any remaining double backslashes before quotes
    cleaned = cleaned.replace(/\\\\'/g, "\\'");
    
    // Fix pattern: ] }, -> ] }, (ensure proper spacing)
    cleaned = cleaned.replace(/\]\s*\},\s*\{/g, '] },\n{');
    
    // Fix pattern: }] }, -> }] }, (ensure proper spacing)
    cleaned = cleaned.replace(/\}\]\s*,\s*\}/g, '}] },');
    
    // Try to fix any remaining structural issues
    // Pattern: } followed by ] followed by }, should have proper spacing
    cleaned = cleaned.replace(/\}\s*\]\s*,\s*\}/g, '} ] },');
    
    // Fix double commas that might be introduced: } ] },, -> } ] },
    cleaned = cleaned.replace(/\}\s*\]\s*\}\s*,\s*,/g, '} ] },');
    cleaned = cleaned.replace(/\}\s*\]\s*\}\s*,\s*,\s*/g, '} ] },');
    
    // Fix any remaining double commas before closing braces
    cleaned = cleaned.replace(/,\s*,\s*([}\]])/g, '$1');
    
    // REMOVED: Fix missing commas between city objects
    // This regex was breaking valid patterns like }] },
    // The source file should already have proper commas
    
    // Use Function constructor to safely evaluate the object
    const func = new Function(`return ${cleaned}`);
    stateObj = func();
  } catch (jsError) {
    // Log the JavaScript error for debugging
    if (i < 3) {
      console.warn(`  JS parse error for ${state.code}: ${jsError.message.substring(0, 100)}`);
      // Find the error location if possible
      if (jsError.message.includes('Unexpected')) {
        const errorMatch = jsError.message.match(/Unexpected (.+?)(?: at|$)/);
        if (errorMatch) {
          console.warn(`  Error type: ${errorMatch[1]}`);
        }
      }
    }
    // If that fails, try JSON parsing as fallback
    try {
      // Convert to JSON format - be smarter about apostrophes
      let jsonString = cleaned;
      
      // In JSON, apostrophes don't need escaping - they're fine as-is
      // The issue is that 'text's' becomes "text"s" when we replace quotes
      // We need to be smarter: only replace the outer quotes, not inner apostrophes
      
      // Strategy: Replace quotes more carefully
      // First, handle escaped apostrophes: \' -> mark temporarily
      jsonString = jsonString.replace(/\\'/g, '__ESCAPED_APOSTROPHE__');
      
      // Then mark unescaped apostrophes in strings (temporarily)
      jsonString = jsonString.replace(/: '([^']*?)'([a-zA-Z])([^']*?)'/g, (match, before, letter, after) => {
        // This is an apostrophe in a string - mark it temporarily
        if (before.length > 0) {
          return `: '${before}__APOSTROPHE__${letter}${after}'`;
        }
        return match;
      });
      
      // Now replace single quotes with double quotes
      jsonString = jsonString.replace(/'/g, '"');
      
      // Restore apostrophes (they don't need escaping in JSON)
      jsonString = jsonString.replace(/__APOSTROPHE__/g, "'");
      jsonString = jsonString.replace(/__ESCAPED_APOSTROPHE__/g, "'");
      
      // Try to fix broken strings (this is a heuristic)
      jsonString = jsonString.replace(/"([^"]*)"([^"]*)"/g, (match, p1, p2) => {
        // If we have "text"more" it's probably "text'more" originally
        if (p2 && !p2.startsWith(':') && !p2.startsWith(',') && !p2.startsWith('}') && !p2.startsWith(']')) {
          return `"${p1}'${p2}"`;
        }
        return match;
      });
      
      stateObj = JSON.parse(jsonString);
    } catch (jsonError) {
      // Last resort: try with even more aggressive cleanup
      try {
        // Try to fix common JSON issues
        let jsonFixed = cleaned;
        
        // First, quote all property names (name: -> "name":)
        // Be more aggressive - catch property names even with different spacing
        // Do this multiple times to catch all cases
        let previousJsonFixed = '';
        let quoteRound = 0;
        while (jsonFixed !== previousJsonFixed && quoteRound < 10) {
          previousJsonFixed = jsonFixed;
          quoteRound++;
          // Catch property names after {, [, comma, or newline
          jsonFixed = jsonFixed.replace(/([{,\[\n])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1 "$2":');
          // Catch property names at the start of lines (not already quoted)
          jsonFixed = jsonFixed.replace(/^\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/gm, ' "$1":');
          // Catch property names after whitespace (not already quoted)
          jsonFixed = jsonFixed.replace(/([^"])\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1 "$2":');
        }
        
        // Handle apostrophes in strings before converting quotes
        // In JSON, apostrophes don't need escaping
        // Strategy: mark apostrophes temporarily, convert quotes, then restore
        
        // First, handle escaped apostrophes: \' -> mark temporarily
        jsonFixed = jsonFixed.replace(/\\'/g, '__ESCAPED_APOSTROPHE__');
        
        // Then mark unescaped apostrophes in strings
        jsonFixed = jsonFixed.replace(/: '([^']*?)'([a-zA-Z])([^']*?)'/g, (match, before, letter, after) => {
          if (before.length > 0) {
            return `: '${before}__APOSTROPHE__${letter}${after}'`;
          }
          return match;
        });
        
        // Convert single quotes to double quotes
        jsonFixed = jsonFixed.replace(/'/g, '"');
        
        // Restore apostrophes (they don't need escaping in JSON)
        jsonFixed = jsonFixed.replace(/__APOSTROPHE__/g, "'");
        jsonFixed = jsonFixed.replace(/__ESCAPED_APOSTROPHE__/g, "'");
        
        stateObj = JSON.parse(jsonFixed);
      } catch (finalError) {
        console.warn(`⚠ Failed to parse ${state.name} (${state.code}): ${finalError.message.substring(0, 100)}`);
        // Try to find the specific error location
        if (finalError.message.includes('position')) {
          const posMatch = finalError.message.match(/position (\d+)/);
          if (posMatch && i < 3) { // Only for first few states to avoid spam
            const pos = parseInt(posMatch[1]);
            // Check in jsonFixed if it exists, otherwise use cleaned
            try {
              const errorContent = typeof jsonFixed !== 'undefined' ? jsonFixed : cleaned;
              const start = Math.max(0, pos - 100);
              const end = Math.min(errorContent.length, pos + 100);
              console.warn(`  Error around position ${pos} in JSON: ${errorContent.substring(start, end)}`);
            } catch (e) {
              // Ignore errors in error reporting
            }
          }
        }
        if (i < 3) { // Only for first few states to avoid spam
          console.log(`  First 500 chars: ${cleaned.substring(0, 500)}`);
        }
        continue;
      }
    }
  }
  
  if (!stateObj || !stateObj.name || !stateObj.code) {
    console.warn(`⚠ Invalid state object for ${state.name} (${state.code})`);
    continue;
  }
  
  // Ensure counties array
  if (!stateObj.counties || !Array.isArray(stateObj.counties)) {
    stateObj.counties = [];
  }
  
  // Sort counties by name
  stateObj.counties.sort((a, b) => {
    const nameA = (a.name || '').toString();
    const nameB = (b.name || '').toString();
    return nameA.localeCompare(nameB);
  });
  
  // Sort cities by name within each county
  stateObj.counties.forEach(county => {
    if (county.cities && Array.isArray(county.cities)) {
      county.cities.sort((a, b) => {
        const nameA = (a.name || '').toString();
        const nameB = (b.name || '').toString();
        return nameA.localeCompare(nameB);
      });
    }
  });
  
  const numCounties = stateObj.counties.length;
  
  // Split large states
  if (numCounties > MAX_COUNTIES_PER_FILE) {
    const numFiles = Math.ceil(numCounties / MAX_COUNTIES_PER_FILE);
    const countiesPerFile = Math.ceil(numCounties / numFiles);
    const countyChunks = chunkArray(stateObj.counties, countiesPerFile);
    
    console.log(`  Splitting ${state.name} (${state.code}) into ${numFiles} files (${numCounties} counties)`);
    
    countyChunks.forEach((chunk, chunkIndex) => {
      const chunkStateObj = {
        name: stateObj.name,
        code: stateObj.code,
        counties: chunk
      };
      
      const filename = `${stateCodeMap[state.code]}-cities-part${chunkIndex + 1}.json`;
      const jsonPath = path.join(outputDir, filename);
      fs.writeFileSync(jsonPath, JSON.stringify(chunkStateObj, null, 2));
      stateFiles.push({ 
        code: state.code, 
        name: state.name, 
        file: filename,
        part: chunkIndex + 1,
        totalParts: numFiles
      });
    });
  } else {
    const filename = `${stateCodeMap[state.code]}-cities.json`;
    const jsonPath = path.join(outputDir, filename);
    fs.writeFileSync(jsonPath, JSON.stringify(stateObj, null, 2));
    stateFiles.push({ 
      code: state.code, 
      name: state.name, 
      file: filename 
    });
    console.log(`✓ Extracted ${state.name} (${state.code}) - ${numCounties} counties`);
  }
}

console.log(`\n✓ Successfully processed ${stateFiles.length} JSON files`);

// Generate index file
stateFiles.sort((a, b) => {
  if (a.code !== b.code) return a.code.localeCompare(b.code);
  return (a.part || 0) - (b.part || 0);
});

const importStatements = stateFiles.map(s => {
  const varName = s.part ? `${s.code}_CITIES_PART${s.part}` : `${s.code}_CITIES`;
  return `import ${varName} from './us-states-json/${s.file.replace('.json', '')}.json';`;
});

const stateGroups = {};
stateFiles.forEach(s => {
  if (!stateGroups[s.code]) {
    stateGroups[s.code] = [];
  }
  stateGroups[s.code].push(s);
});

const combinedStates = Object.keys(stateGroups).sort().map(code => {
  const files = stateGroups[code];
  if (files.length === 1) {
    const s = files[0];
    return `  { ...${s.code}_CITIES }`;
  } else {
    const parts = files.sort((a, b) => (a.part || 0) - (b.part || 0));
    const varNames = parts.map(p => `${p.code}_CITIES_PART${p.part}`);
    const firstPart = parts[0];
    return `  { name: '${firstPart.name}', code: '${firstPart.code}', counties: [...${varNames.join('.counties, ...')}.counties] }`;
  }
});

const indexContent = `// Auto-generated index file for US cities by state
// Generated at ${new Date().toISOString()}

${importStatements.join('\n')}

import type { USState } from './us-cities-types';

export const US_STATES_WITH_COUNTIES: USState[] = [
${combinedStates.join(',\n')}
];
`;

fs.writeFileSync(indexFile, indexContent);
console.log(`✓ Generated index file: ${indexFile}`);
console.log(`✓ JSON files written to: ${outputDir}`);

