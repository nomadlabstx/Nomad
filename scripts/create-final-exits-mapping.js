#!/usr/bin/env node

/**
 * Create Final Complete Texas Highway Exit Mapping
 */

const fs = require('fs');
const path = require('path');

const exitsPath = path.join(__dirname, '..', 'data', 'texas-highway-exits-integrated.ts');
const exitsContent = fs.readFileSync(exitsPath, 'utf8');

// Find all exports
const exports = [];
const exportRegex = /export const (I[\d_]+)_EXITS/g;
let match;

while ((match = exportRegex.exec(exitsContent)) !== null) {
  exports.push(match[1]);
}

console.log(`Found ${exports.length} exit exports`);

// Create mapping
const mapping = {};
exports.forEach(varName => {
  // Convert I10_EAST to interstate-10-east
  let highwayId = varName.toLowerCase();
  highwayId = highwayId.replace(/^i/, 'interstate-');
  highwayId = highwayId.replace(/_east$/, '-east');
  highwayId = highwayId.replace(/_west$/, '-west');
  highwayId = highwayId.replace(/_north$/, '-north');
  highwayId = highwayId.replace(/_south$/, '-south');
  highwayId = highwayId.replace(/_/g, '-');
  
  mapping[highwayId] = varName;
});

// Generate mapping file
let output = `/**
 * Texas Highway Exit Data Mapping
 * Maps highway IDs to their exit data
 * 
 * Generated: ${new Date().toISOString()}
 */

import type { ExplorerHighwayExit } from '../types/explorer';
import * as ExitData from './texas-highway-exits-integrated';

export const TEXAS_HIGHWAY_EXITS: Record<string, Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[]> = {\n`;

Object.entries(mapping).sort().forEach(([highwayId, varName]) => {
  output += `  '${highwayId}': ExitData.${varName}_EXITS,\n`;
});

output += `};\n\n`;

output += `export function getTexasHighwayExits(highwayId: string): Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] {\n`;
output += `  return TEXAS_HIGHWAY_EXITS[highwayId] || [];\n`;
output += `}\n`;

const mappingPath = path.join(__dirname, '..', 'data', 'texas-exits-mapping.ts');
fs.writeFileSync(mappingPath, output, 'utf8');

console.log(`\n✅ Created mapping with ${Object.keys(mapping).length} highways`);
console.log(`   File: ${mappingPath}`);

