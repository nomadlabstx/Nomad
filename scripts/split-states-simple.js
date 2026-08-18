const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/us-cities-with-counties.ts');
const outputDir = path.join(__dirname, '../data/us-states');
const indexFile = path.join(__dirname, '../data/us-cities-index.ts');

// State code to file name mapping
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
const fileContent = fs.readFileSync(inputFile, 'utf8');

// Extract header
const headerMatch = fileContent.match(/^(.*?)export const US_STATES_WITH_COUNTIES/s);
if (!headerMatch) {
  throw new Error('Could not find US_STATES_WITH_COUNTIES declaration');
}
let header = headerMatch[1];
// Fix syntax error: counties: USCounty[ should be counties: USCounty[]
header = header.replace(/counties:\s*USCounty\[(\s*{)/g, 'counties: USCounty[]$1');

// Find all state starts - look for the pattern: name: 'StateName', code: 'XX',
const stateStarts = [];
let regex = /name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"]/g;
let match;
while ((match = regex.exec(fileContent)) !== null) {
  // Find the opening brace of this state object - go backwards to find the {
  let stateStart = match.index;
  // Look backwards for the opening brace
  for (let i = match.index - 1; i >= 0 && i > match.index - 500; i--) {
    if (fileContent[i] === '{' && (i === 0 || fileContent[i - 1] === '\n' || fileContent[i - 1] === ' ')) {
      // Check if this looks like a state object start (has name and code nearby)
      const context = fileContent.substring(i, match.index + match[0].length);
      if (context.includes('name:') && context.includes('code:')) {
        stateStart = i;
        break;
      }
    }
  }
  
  const beforeMatch = fileContent.substring(0, stateStart);
  const lineNumber = beforeMatch.split('\n').length;
  stateStarts.push({
    index: stateStart,
    lineNumber,
    name: match[1],
    code: match[2],
    nameCodeIndex: match.index
  });
}

console.log(`Found ${stateStarts.length} states`);

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const stateFiles = [];

// Extract each state
for (let i = 0; i < stateStarts.length; i++) {
  const state = stateStarts[i];
  const startIndex = state.index;
  const endIndex = i < stateStarts.length - 1 
    ? stateStarts[i + 1].index 
    : fileContent.lastIndexOf(']');
  
  // Extract state content from the state object start
  let stateContent = fileContent.substring(startIndex, endIndex);
  
  // Find where this state object actually ends
  // State object ends with: ], }, ], },
  // Look for the pattern: ],\n}\n],\n},\n (followed by newline and { for next state, or end of array)
  // More specifically, find: ],\n},\n],\n},\n followed by either newline+{ or end
  const stateEndPattern = /],\n\s*}\n\s*],\n\s*},?\s*\n/;
  let stateEndMatch = stateContent.match(stateEndPattern);
  
  if (stateEndMatch) {
    // Found the state end pattern
    const endPos = stateEndMatch.index + stateEndMatch[0].length;
    stateContent = stateContent.substring(0, endPos).trim();
    stateContent = stateContent.replace(/,\s*$/, '');
  } else {
    // Fallback: find the last }, that's likely the state end
    // Look for pattern: ],\n},\n],\n},
    const fallbackPattern = /],\n\s*},\n\s*],\n\s*},/;
    const fallbackMatch = stateContent.match(fallbackPattern);
    if (fallbackMatch) {
      const endPos = fallbackMatch.index + fallbackMatch[0].length;
      stateContent = stateContent.substring(0, endPos).trim();
      stateContent = stateContent.replace(/,\s*$/, '');
    } else {
      // Last resort: just use what we have, but trim to reasonable size
      // Remove everything after we see the pattern that suggests end of state
      const simpleEnd = stateContent.lastIndexOf('\n  },\n');
      if (simpleEnd > stateContent.length - 100) {
        stateContent = stateContent.substring(0, simpleEnd + 6).trim();
        stateContent = stateContent.replace(/,\s*$/, '');
      } else {
        stateContent = stateContent.trim();
        stateContent = stateContent.replace(/,\s*$/, '');
      }
    }
  }
  
  const filename = `${stateCodeMap[state.code]}-cities.ts`;
  const filepath = path.join(outputDir, filename);
  
  const content = header + `\nexport const ${state.code}_CITIES: USState = ${stateContent};\n`;
  fs.writeFileSync(filepath, content);
  stateFiles.push({ code: state.code, name: state.name, file: filename });
  console.log(`✓ Extracted ${state.name} (${state.code}) - ${filename}`);
}

console.log(`\n✓ Successfully split ${stateFiles.length} states`);

// Generate index file
stateFiles.sort((a, b) => a.code.localeCompare(b.code));
const indexContent = `// Auto-generated index file for US cities by state
// Generated at ${new Date().toISOString()}

${stateFiles.map(s => `import { ${s.code}_CITIES } from './us-states/${s.file.replace('.ts', '')}';`).join('\n')}

import type { USState } from './us-cities-types';

export const US_STATES_WITH_COUNTIES: USState[] = [
${stateFiles.map(s => `  ${s.code}_CITIES,`).join('\n')}
];
`;

fs.writeFileSync(indexFile, indexContent);
console.log(`✓ Generated index file: ${indexFile}`);
console.log(`✓ State files written to: ${outputDir}`);

