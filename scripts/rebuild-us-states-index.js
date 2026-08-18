/**
 * Generate data/us-cities-index.ts using require() to avoid tsc parsing huge JSON.
 */
const fs = require('fs');
const path = require('path');

const jsonDir = path.join(__dirname, '../data/us-states-json');
const outTs = path.join(__dirname, '../data/us-cities-index.ts');

const files = fs
  .readdirSync(jsonDir)
  .filter((f) => f.endsWith('-cities.json') && !f.includes('-part'))
  .sort();

const requires = files.map((f) => `  require('./us-states-json/${f}') as USState`);

const content = `// Auto-generated — run: node scripts/rebuild-us-states-index.js
import type { USState } from './us-cities-types';

export const US_STATES_WITH_COUNTIES: USState[] = [
${requires.join(',\n')},
];
`;

fs.writeFileSync(outTs, content);
console.log(`Built index with ${files.length} states → ${outTs}`);
