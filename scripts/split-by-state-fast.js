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

// Extract header (everything before US_STATES_WITH_COUNTIES)
const headerMatch = fileContent.match(/^(.*?)export const US_STATES_WITH_COUNTIES/s);
if (!headerMatch) {
  throw new Error('Could not find US_STATES_WITH_COUNTIES declaration');
}
const header = headerMatch[1];

// Extract data section (may not have closing ]; if file is incomplete)
const dataMatch = fileContent.match(/export const US_STATES_WITH_COUNTIES: USState\[\] = \[(.*?)(?:\];|$)/s);
if (!dataMatch) {
  throw new Error('Could not find data array');
}
let dataContent = dataMatch[1];
// Remove trailing closing brace if present
dataContent = dataContent.replace(/]\s*\}\s*$/, '');

console.log('Extracting states...');

// Split states by matching: { name: 'StateName', code: 'XX',
const statePattern = /{\s*name:\s*['"]([^'"]+)['"],\s*code:\s*['"]([A-Z]{2})['"],\s*counties:\s*\[([\s\S]*?)\]\s*},?/g;

const stateFiles = [];
let match;
let stateCount = 0;

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

while ((match = statePattern.exec(dataContent)) !== null) {
  const stateName = match[1];
  const stateCode = stateCodeMap[match[2]];
  const stateData = match[0].replace(/,\s*$/, ''); // Remove trailing comma
  
  if (!stateCode) {
    console.warn(`⚠ Unknown state code: ${match[2]} for ${stateName}`);
    continue;
  }
  
  const filename = `${stateCode}-cities.ts`;
  const filepath = path.join(outputDir, filename);
  
  // Write state file
  const content = header + `\nexport const ${match[2]}_CITIES: USState = ${stateData};\n`;
  fs.writeFileSync(filepath, content);
  
  stateFiles.push({ code: match[2], name: stateName, file: filename });
  stateCount++;
  console.log(`✓ Extracted ${stateName} (${match[2]}) - ${filename}`);
}

console.log(`\n✓ Successfully split ${stateCount} states`);

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

