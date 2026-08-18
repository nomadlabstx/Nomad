#!/usr/bin/env node

/**
 * Integrate Texas Highway Exit Data into Explorer System
 * 
 * Updates texas-highways-complete.ts to include exit data
 * OR creates a mapping that explorer.ts can use
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Integrating Texas Highway Exit Data');
console.log('='.repeat(70));

// Load exit data
const exitsPath = path.join(__dirname, '..', 'data', 'texas-highway-exits-integrated.ts');
const exitsContent = fs.readFileSync(exitsPath, 'utf8');

// Load highways
const highwaysPath = path.join(__dirname, '..', 'data', 'texas-highways-complete.ts');
let highwaysContent = fs.readFileSync(highwaysPath, 'utf8');

// Extract exit exports from integrated file
const exitExports = exitsContent.matchAll(/export const (I[\d_]+)_EXITS[\s\S]*?\[([\s\S]*?)\];/g);
const exitDataMap = new Map();

for (const match of exitExports) {
  const varName = match[1]; // e.g., "I10_EAST_EXITS"
  const exitsArray = match[2];
  
  // Parse exits
  const exits = [];
  const exitMatches = exitsArray.matchAll(/{\s*exitNumber:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"],[\s\S]*?milepointStart:\s*([\d.]+)[\s\S]*?}/g);
  
  for (const exitMatch of exitMatches) {
    exits.push({
      exitNumber: exitMatch[1],
      description: exitMatch[2],
      milepointStart: parseFloat(exitMatch[3])
    });
  }
  
  // Extract highway ID from var name (I10_EAST_EXITS -> interstate-10-east)
  const highwayId = varName
    .replace(/^I/, 'interstate-')
    .replace(/_EAST$/, '-east')
    .replace(/_WEST$/, '-west')
    .replace(/_NORTH$/, '-north')
    .replace(/_SOUTH$/, '-south')
    .toLowerCase();
  
  exitDataMap.set(highwayId, exits);
}

console.log(`\n📊 Mapped exit data for ${exitDataMap.size} highways`);

// Create a mapping file that explorer.ts can import
const mappingPath = path.join(__dirname, '..', 'data', 'texas-exits-mapping.ts');
let mappingContent = `/**
 * Texas Highway Exit Data Mapping
 * Maps highway IDs to their exit data
 * 
 * Generated: ${new Date().toISOString()}
 */

import type { ExplorerHighwayExit } from '../types/explorer';

`;

// Import all exit arrays
exitDataMap.forEach((exits, highwayId) => {
  const varName = `I${highwayId.replace(/interstate-/, '').replace(/-/g, '_').toUpperCase()}_EXITS`;
  mappingContent += `import { ${varName} } from './texas-highway-exits-integrated';\n`;
});

mappingContent += `\n/**\n * Map highway IDs to their exit data\n */\nexport const TEXAS_HIGHWAY_EXITS: Record<string, Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[]> = {\n`;

// Create mapping object
exitDataMap.forEach((exits, highwayId) => {
  const varName = `I${highwayId.replace(/interstate-/, '').replace(/-/g, '_').toUpperCase()}_EXITS`;
  mappingContent += `  '${highwayId}': ${varName},\n`;
});

mappingContent += `};\n\n`;

// Generate helper function
mappingContent += `/**\n * Get exits for a specific highway ID\n */\nexport function getTexasHighwayExits(highwayId: string): Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] {\n`;
mappingContent += `  return TEXAS_HIGHWAY_EXITS[highwayId] || [];\n`;
mappingContent += `}\n`;

fs.writeFileSync(mappingPath, mappingContent, 'utf8');

console.log(`\n✅ Created exit mapping file: ${mappingPath}`);
console.log(`   Total highways with exit data: ${exitDataMap.size}`);
console.log(`\n📝 Next: Update explorer.ts to use this mapping when initializing highways`);

// Show summary
let totalExits = 0;
exitDataMap.forEach((exits, id) => {
  totalExits += exits.length;
  console.log(`   ${id}: ${exits.length} exits`);
});

console.log(`\n   Total exits: ${totalExits}`);

