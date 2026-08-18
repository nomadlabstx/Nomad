#!/usr/bin/env node

/**
 * Populate Exit Data for All 148 Texas Highways
 * 
 * Maps exit data from texas-exits-complete.ts to highways in texas-highways-complete.ts
 * Handles directional highways (exits shared or direction-specific)
 */

const fs = require('fs');
const path = require('path');

console.log('🛣️  Populating Texas Highway Exit Data');
console.log('='.repeat(70));

// Load exit data
const exitsPath = path.join(__dirname, '..', 'data', 'texas-exits-complete.ts');
const exitsContent = fs.readFileSync(exitsPath, 'utf8');

// Load highway data
const highwaysPath = path.join(__dirname, '..', 'data', 'texas-highways-complete.ts');
const highwaysContent = fs.readFileSync(highwaysPath, 'utf8');

// Extract highway definitions
const highwayMatches = highwaysContent.matchAll(/id:\s*['"]([^'"]+)['"][\s\S]*?number:\s*['"]([^'"]+)['"][\s\S]*?totalExits:\s*(\d+)/g);
const highways = [];
for (const match of highwayMatches) {
  highways.push({
    id: match[1],
    number: match[2],
    totalExits: parseInt(match[3])
  });
}

console.log(`\n📊 Found ${highways.length} highways in texas-highways-complete.ts`);

// Extract exit data exports
const exitExports = exitsContent.matchAll(/export const (IH_\d+)_EXITS:\s*TexasExit\[\]\s*=\s*\[([\s\S]*?)\];/g);
const exitData = new Map();

for (const match of exitExports) {
  const highwayCode = match[1]; // e.g., "IH_0010"
  const exitsArray = match[2];
  
  // Parse exits
  const exits = [];
  const exitMatches = exitsArray.matchAll(/{\s*exitNumber:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"],[\s\S]*?milepost:\s*([\d.]+)[\s\S]*?}/g);
  
  for (const exitMatch of exitMatches) {
    exits.push({
      exitNumber: exitMatch[1],
      description: exitMatch[2],
      milepost: parseFloat(exitMatch[3])
    });
  }
  
  exitData.set(highwayCode, exits);
}

console.log(`\n📊 Found exit data for ${exitData.size} highways in texas-exits-complete.ts`);

// Map highway codes to highway IDs
// IH_0002 = Interstate 2 (doesn't exist, might be I-35E?)
// IH_0010 = Interstate 10
// IH_0014 = Interstate 14 (doesn't exist in Texas)
// IH_0020 = Interstate 20
// IH_0027 = Interstate 27
// IH_0030 = Interstate 30
// IH_0035 = Interstate 35
// IH_0037 = Interstate 37
// IH_0040 = Interstate 40
// IH_0044 = Interstate 44 (doesn't exist in Texas)
// IH_0045 = Interstate 45
// IH_0069 = Interstate 69
// IH_0110 = Interstate 110
// IH_0169 = Interstate 169 (doesn't exist in Texas)
// IH_0345 = Interstate 345
// IH_0369 = Interstate 369 (doesn't exist in Texas)
// IH_0410 = Interstate 410
// IH_0610 = Interstate 610
// IH_0635 = Interstate 635
// IH_0820 = Interstate 820

const highwayCodeToNumber = {
  'IH_0002': '2', // Might be I-35E or another
  'IH_0010': '10',
  'IH_0014': '14', // Not in Texas
  'IH_0020': '20',
  'IH_0027': '27',
  'IH_0030': '30',
  'IH_0035': '35',
  'IH_0037': '37',
  'IH_0040': '40',
  'IH_0044': '44', // Not in Texas
  'IH_0045': '45',
  'IH_0069': '69',
  'IH_0110': '110',
  'IH_0169': '169', // Not in Texas
  'IH_0345': '345',
  'IH_0369': '369', // Not in Texas
  'IH_0410': '410',
  'IH_0610': '610',
  'IH_0635': '635',
  'IH_0820': '820',
};

// Create mapping: highway number -> exit data
const highwayExitsMap = new Map();

exitData.forEach((exits, code) => {
  const number = highwayCodeToNumber[code];
  if (number) {
    // Group exits by exit number (handle duplicates)
    const uniqueExits = new Map();
    exits.forEach(exit => {
      const key = exit.exitNumber;
      if (!uniqueExits.has(key) || uniqueExits.get(key).milepost > exit.milepost) {
        uniqueExits.set(key, exit);
      }
    });
    
    highwayExitsMap.set(number, Array.from(uniqueExits.values()));
  }
});

console.log(`\n📊 Mapped exit data for ${highwayExitsMap.size} highways`);

// Now generate the exit data format for ExplorerHighwayExit
// We need to convert to the format expected by ExplorerHighwayExit:
// { id, type: 'highway-exit', highwayId, exitNumber, description, coordinates, milepointStart?, milepointEnd? }

// Create output file
const outputPath = path.join(__dirname, '..', 'data', 'texas-highway-exits-populated.ts');
let output = `/**
 * Texas Highway Exit Data - Populated
 * Generated from texas-exits-complete.ts
 * Maps exits to highways in texas-highways-complete.ts
 * 
 * Generated: ${new Date().toISOString()}
 */

import type { ExplorerHighwayExit } from '../types/explorer';

`;

// For each highway, generate exit data
let totalExits = 0;
const highwaysWithExits = [];

highways.forEach(highway => {
  // Extract highway number (e.g., "10" from "interstate-10-east")
  const numberMatch = highway.id.match(/-(\d+[EW]?)(?:-|$)/);
  if (!numberMatch) return;
  
  let highwayNumber = numberMatch[1];
  // Handle directional variants (35E, 35W)
  if (highwayNumber.endsWith('E') || highwayNumber.endsWith('W')) {
    highwayNumber = highwayNumber.replace(/[EW]$/, '');
  }
  
  // Get exit data for this highway
  const exits = highwayExitsMap.get(highwayNumber);
  if (!exits || exits.length === 0) {
    return; // No exit data for this highway
  }
  
  // Generate exit exports
  const highwayVarName = highway.id.toUpperCase().replace(/-/g, '_').replace(/[^A-Z0-9_]/g, '');
  output += `// ${highway.id} (${highway.number})\n`;
  output += `export const ${highwayVarName}_EXITS: Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] = [\n`;
  
  exits.forEach((exit, index) => {
    // Clean description
    let description = exit.description;
    // Remove numeric codes at the start (e.g., "0131 -0.677" -> "")
    description = description.replace(/^\d+\s+[-+]?\d*\.?\d*\s*/, '').trim();
    if (!description) {
      description = `Exit ${exit.exitNumber}`;
    }
    
    // Generate coordinates placeholder (we'll need to geocode these later)
    // For now, use approximate coordinates based on milepost
    output += `  {\n`;
    output += `    exitNumber: '${exit.exitNumber}',\n`;
    output += `    description: '${description.replace(/'/g, "\\'")}',\n`;
    output += `    coordinates: { latitude: 0, longitude: 0 }, // TODO: Geocode from milepost\n`;
    output += `    milepointStart: ${exit.milepost},\n`;
    output += `    milepointEnd: ${exit.milepost + 0.5},\n`;
    output += `  }${index < exits.length - 1 ? ',' : ''}\n`;
  });
  
  output += `];\n\n`;
  
  totalExits += exits.length;
  highwaysWithExits.push({
    id: highway.id,
    number: highway.number,
    exitCount: exits.length
  });
});

output += `\n/**\n * Summary:\n * Total exits populated: ${totalExits}\n * Highways with exits: ${highwaysWithExits.length}\n */\n`;

fs.writeFileSync(outputPath, output, 'utf8');

console.log(`\n✅ Generated exit data file: ${outputPath}`);
console.log(`   Total exits: ${totalExits}`);
console.log(`   Highways with exits: ${highwaysWithExits.length}`);
console.log(`\n📋 Highways with exit data:`);
highwaysWithExits.forEach(hw => {
  console.log(`   ${hw.number} (${hw.id}): ${hw.exitCount} exits`);
});

console.log(`\n⚠️  Note: Coordinates are placeholders (0, 0).`);
console.log(`   Next step: Geocode exits using milepost data or exit descriptions.`);

