#!/usr/bin/env node

/**
 * Create Complete Texas Highway Exit Mapping
 * Properly extracts ALL exit data from texas-highway-exits-integrated.ts
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Creating Complete Texas Highway Exit Mapping');
console.log('='.repeat(70));

const exitsPath = path.join(__dirname, '..', 'data', 'texas-highway-exits-integrated.ts');
const exitsContent = fs.readFileSync(exitsPath, 'utf8');

// Find all export const statements
const exports = [];
const exportRegex = /export const (I[\d_]+)_EXITS[\s\S]*?= \[([\s\S]*?)\];/g;
let match;

while ((match = exportRegex.exec(exitsContent)) !== null) {
  const varName = match[1]; // e.g., "I10_EAST", "I410"
  const exitsArray = match[2];
  
  // Count exits (simple count of { ... } blocks)
  const exitCount = (exitsArray.match(/{[\s\S]*?}/g) || []).length;
  
  exports.push({ varName, exitCount });
}

console.log(`\n📊 Found ${exports.length} exit exports`);

// Create mapping
let mappingContent = `/**
 * Texas Highway Exit Data Mapping
 * Maps highway IDs to their exit data
 * 
 * Generated: ${new Date().toISOString()}
 */

import type { ExplorerHighwayExit } from '../types/explorer';
import * as ExitData from './texas-highway-exits-integrated';

/**
 * Map highway IDs to their exit data
 */
export const TEXAS_HIGHWAY_EXITS: Record<string, Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[]> = {\n`;

let totalExits = 0;
const highwayMappings = [];

exports.forEach(({ varName, exitCount }) => {
  // Convert I10_EAST to interstate-10-east
  let highwayId = varName.toLowerCase();
  
  // Remove I prefix and add interstate prefix
  highwayId = highwayId.replace(/^i/, 'interstate-');
  
  // Handle directional suffixes
  highwayId = highwayId.replace(/_east$/, '-east');
  highwayId = highwayId.replace(/_west$/, '-west');
  highwayId = highwayId.replace(/_north$/, '-north');
  highwayId = highwayId.replace(/_south$/, '-south');
  
  // Replace underscores with hyphens
  highwayId = highwayId.replace(/_/g, '-');
  
  mappingContent += `  '${highwayId}': ExitData.${varName}_EXITS,\n`;
  highwayMappings.push({ highwayId, varName, exitCount });
  totalExits += exitCount;
});

mappingContent += `};\n\n`;

// Add helper function
mappingContent += `export function getTexasHighwayExits(highwayId: string): Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] {\n`;
mappingContent += `  return TEXAS_HIGHWAY_EXITS[highwayId] || [];\n`;
mappingContent += `}\n\n`;

// Add summary
mappingContent += `/**\n * Summary:\n * Total highways with exit data: ${highwayMappings.length}\n`;
mappingContent += ` * Total exits: ${totalExits}\n`;
mappingContent += ` */\n`;

const mappingPath = path.join(__dirname, '..', 'data', 'texas-exits-mapping.ts');
fs.writeFileSync(mappingPath, mappingContent, 'utf8');

console.log(`\n✅ Created complete exit mapping: ${mappingPath}`);
console.log(`   Total highways: ${highwayMappings.length}`);
console.log(`   Total exits: ${totalExits}`);
console.log(`\n📋 Highways with exit data:`);
highwayMappings.forEach(({ highwayId, exitCount }) => {
  console.log(`   ${highwayId}: ${exitCount} exits`);
});

