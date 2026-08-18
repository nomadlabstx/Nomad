#!/usr/bin/env node

/**
 * Final Integration of Texas Highway Exit Data
 * 
 * Creates a proper mapping that explorer.ts can use to populate exits
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Final Integration of Texas Highway Exit Data');
console.log('='.repeat(70));

// Load exit data
const exitsPath = path.join(__dirname, '..', 'data', 'texas-highway-exits-integrated.ts');
const exitsContent = fs.readFileSync(exitsPath, 'utf8');

// Extract all exit exports
const exitMatches = exitsContent.matchAll(/export const (I[\d_]+)_EXITS[\s\S]*?\[([\s\S]*?)\];/g);
const exitDataMap = new Map();

for (const match of exitMatches) {
  const varName = match[1]; // e.g., "I10_EAST", "I410"
  const exitsArray = match[2];
  
  // Parse exits
  const exits = [];
  const exitItemMatches = exitsArray.matchAll(/{\s*exitNumber:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"],[\s\S]*?milepointStart:\s*([\d.]+)[\s\S]*?milepointEnd:\s*([\d.]+)[\s\S]*?}/g);
  
  for (const exitMatch of exitItemMatches) {
    exits.push({
      exitNumber: exitMatch[1],
      description: exitMatch[2],
      milepointStart: parseFloat(exitMatch[3]),
      milepointEnd: parseFloat(exitMatch[4])
    });
  }
  
  exitDataMap.set(varName, exits);
}

console.log(`\n📊 Found exit data for ${exitDataMap.size} highway variants`);

// Map var names to highway IDs
// I10_EAST -> interstate-10-east
// I10_WEST -> interstate-10-west
// I410 -> interstate-410
// etc.

const highwayIdMapping = {};
exitDataMap.forEach((exits, varName) => {
  // Convert I10_EAST to interstate-10-east
  let highwayId = varName.toLowerCase();
  
  // Remove I prefix
  highwayId = highwayId.replace(/^i/, 'interstate-');
  
  // Handle directional suffixes
  if (highwayId.includes('_east')) {
    highwayId = highwayId.replace('_east', '-east');
  } else if (highwayId.includes('_west')) {
    highwayId = highwayId.replace('_west', '-west');
  } else if (highwayId.includes('_north')) {
    highwayId = highwayId.replace('_north', '-north');
  } else if (highwayId.includes('_south')) {
    highwayId = highwayId.replace('_south', '-south');
  }
  
  // Replace underscores with hyphens
  highwayId = highwayId.replace(/_/g, '-');
  
  highwayIdMapping[highwayId] = varName;
});

// Create the mapping file
const mappingPath = path.join(__dirname, '..', 'data', 'texas-exits-mapping.ts');
let mappingContent = `/**
 * Texas Highway Exit Data Mapping
 * Maps highway IDs to their exit data
 * 
 * Generated: ${new Date().toISOString()}
 * 
 * This file provides a mapping from highway IDs (e.g., "interstate-10-east")
 * to their exit data arrays. Use this in explorer.ts to populate exits.
 */

import type { ExplorerHighwayExit } from '../types/explorer';
import * as ExitData from './texas-highway-exits-integrated';

/**
 * Map highway IDs to their exit data
 * Key: highway ID (e.g., "interstate-10-east")
 * Value: Array of exits for that highway
 */
export const TEXAS_HIGHWAY_EXITS: Record<string, Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[]> = {\n`;

// Add mappings
Object.entries(highwayIdMapping).forEach(([highwayId, varName]) => {
  const exits = exitDataMap.get(varName);
  mappingContent += `  '${highwayId}': ExitData.${varName}_EXITS,\n`;
});

mappingContent += `};\n\n`;

// Add helper function
mappingContent += `/**\n * Get exits for a specific highway ID\n */\nexport function getTexasHighwayExits(highwayId: string): Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] {\n`;
mappingContent += `  return TEXAS_HIGHWAY_EXITS[highwayId] || [];\n`;
mappingContent += `}\n\n`;

// Add summary
let totalExits = 0;
Object.entries(highwayIdMapping).forEach(([highwayId, varName]) => {
  totalExits += exitDataMap.get(varName).length;
});

mappingContent += `/**\n * Summary:\n * Total highways with exit data: ${Object.keys(highwayIdMapping).length}\n`;
mappingContent += ` * Total exits: ${totalExits}\n`;
mappingContent += ` * \n`;
mappingContent += ` * Highways with exit data:\n`;
Object.entries(highwayIdMapping).forEach(([highwayId, varName]) => {
  const exitCount = exitDataMap.get(varName).length;
  mappingContent += ` *   ${highwayId}: ${exitCount} exits\n`;
});
mappingContent += ` */\n`;

fs.writeFileSync(mappingPath, mappingContent, 'utf8');

console.log(`\n✅ Created exit mapping file: ${mappingPath}`);
console.log(`   Total highways with exit data: ${Object.keys(highwayIdMapping).length}`);
console.log(`   Total exits: ${totalExits}`);
console.log(`\n📋 Highways with exit data:`);
Object.entries(highwayIdMapping).forEach(([highwayId, varName]) => {
  const exitCount = exitDataMap.get(varName).length;
  console.log(`   ${highwayId}: ${exitCount} exits`);
});

console.log(`\n📝 Next: Update explorer.ts to use TEXAS_HIGHWAY_EXITS mapping`);

