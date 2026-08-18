#!/usr/bin/env node

/**
 * Populate Exit Data for All 148 Texas Highways - Version 2
 * 
 * Properly maps exit data from texas-exits-complete.ts to highways in texas-highways-complete.ts
 * Handles directional highways (exits shared between directions)
 */

const fs = require('fs');
const path = require('path');

console.log('🛣️  Populating Texas Highway Exit Data (v2)');
console.log('='.repeat(70));

// Load exit data
const exitsPath = path.join(__dirname, '..', 'data', 'texas-exits-complete.ts');
const exitsContent = fs.readFileSync(exitsPath, 'utf8');

// Load highway data  
const highwaysPath = path.join(__dirname, '..', 'data', 'texas-highways-complete.ts');
const highwaysContent = fs.readFileSync(highwaysPath, 'utf8');

// Extract ALL_TEXAS_HIGHWAYS export to get the actual highway IDs
// We'll need to parse the TypeScript file more carefully
// For now, let's manually map the known highways

// Map exit data exports
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

console.log(`\n📊 Found exit data for ${exitData.size} highways`);

// Highway code to number mapping (IH_0010 = I-10, etc.)
const highwayCodeToNumber = {
  'IH_0002': null, // Unknown/I-35E?
  'IH_0010': '10',
  'IH_0014': null, // Not in Texas
  'IH_0020': '20',
  'IH_0027': '27',
  'IH_0030': '30',
  'IH_0035': '35',
  'IH_0037': '37',
  'IH_0040': '40',
  'IH_0044': null, // Not in Texas
  'IH_0045': '45',
  'IH_0069': '69',
  'IH_0110': '110',
  'IH_0169': null, // Not in Texas
  'IH_0345': '345',
  'IH_0369': null, // Not in Texas
  'IH_0410': '410',
  'IH_0610': '610',
  'IH_0635': '635',
  'IH_0820': '820',
};

// Create exit data structure
// We'll create a mapping file that can be imported into texas-highways-complete.ts
const output = {
  interstates: {},
  usHighways: {},
  stateHighways: {},
  fmRoads: {},
  ranchRoads: {}
};

// Process each exit dataset
exitData.forEach((exits, code) => {
  const number = highwayCodeToNumber[code];
  if (!number) {
    console.log(`   ⚠️  Skipping ${code} (unknown or not in Texas)`);
    return;
  }
  
  // Clean and deduplicate exits
  const uniqueExits = new Map();
  exits.forEach(exit => {
    const key = `${exit.exitNumber}-${Math.round(exit.milepost)}`;
    if (!uniqueExits.has(key) || uniqueExits.get(key).milepost > exit.milepost) {
      uniqueExits.set(key, exit);
    }
  });
  
  const cleanedExits = Array.from(uniqueExits.values())
    .sort((a, b) => a.milepost - b.milepost)
    .map(exit => {
      // Clean description
      let description = exit.description;
      description = description.replace(/^\d+\s+[-+]?\d*\.?\d*\s*/, '').trim();
      if (!description) {
        description = `Exit ${exit.exitNumber}`;
      }
      
      return {
        exitNumber: exit.exitNumber,
        description: description,
        milepointStart: exit.milepost,
        milepointEnd: exit.milepost + 0.5,
        coordinates: { latitude: 0, longitude: 0 } // Placeholder - will need geocoding
      };
    });
  
  // Determine highway type and create IDs
  // For interstates, we need to map to both directional variants
  if (['10', '20', '30', '40', '35', '35E', '35W', '37', '45', '27', '69'].includes(number)) {
    // These have directional splits
    output.interstates[`${number}-east`] = cleanedExits;
    output.interstates[`${number}-west`] = cleanedExits;
    if (number === '35' || number === '37' || number === '45' || number === '27' || number === '69') {
      // North-South highways
      output.interstates[`${number}-north`] = cleanedExits;
      output.interstates[`${number}-south`] = cleanedExits;
    }
  } else {
    // Loops/spurs - no direction
    output.interstates[number] = cleanedExits;
  }
  
  console.log(`   ✅ Mapped ${code} (I-${number}): ${cleanedExits.length} exits`);
});

// Generate TypeScript file
const outputPath = path.join(__dirname, '..', 'data', 'texas-highway-exits-integrated.ts');
let tsOutput = `/**
 * Texas Highway Exit Data - Integrated
 * Generated from texas-exits-complete.ts
 * Maps exits to highways in texas-highways-complete.ts
 * 
 * Generated: ${new Date().toISOString()}
 * 
 * NOTE: This file contains exit data that should be integrated into
 * texas-highways-complete.ts or loaded separately in explorer.ts
 */

import type { ExplorerHighwayExit } from '../types/explorer';

`;

// Generate exit constants
Object.entries(output.interstates).forEach(([highwayId, exits]) => {
  const varName = `I${highwayId.replace(/-/g, '_').toUpperCase()}_EXITS`;
  tsOutput += `export const ${varName}: Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] = [\n`;
  
  exits.forEach((exit, index) => {
    tsOutput += `  {\n`;
    tsOutput += `    exitNumber: '${exit.exitNumber}',\n`;
    tsOutput += `    description: '${exit.description.replace(/'/g, "\\'")}',\n`;
    tsOutput += `    coordinates: { latitude: ${exit.coordinates.latitude}, longitude: ${exit.coordinates.longitude} },\n`;
    tsOutput += `    milepointStart: ${exit.milepointStart},\n`;
    tsOutput += `    milepointEnd: ${exit.milepointEnd},\n`;
    tsOutput += `  }${index < exits.length - 1 ? ',' : ''}\n`;
  });
  
  tsOutput += `];\n\n`;
});

// Generate summary
const totalExits = Object.values(output.interstates).reduce((sum, exits) => sum + exits.length, 0);
tsOutput += `\n/**\n * Summary:\n`;
tsOutput += ` * Total highways with exit data: ${Object.keys(output.interstates).length}\n`;
tsOutput += ` * Total exits: ${totalExits}\n`;
tsOutput += ` * \n`;
tsOutput += ` * Next steps:\n`;
tsOutput += ` * 1. Integrate this data into explorer.ts initialization\n`;
tsOutput += ` * 2. Geocode exit coordinates using milepost data\n`;
tsOutput += ` * 3. Add exit data for US Highways, State Highways, FM Roads\n`;
tsOutput += ` */\n`;

fs.writeFileSync(outputPath, tsOutput, 'utf8');

console.log(`\n✅ Generated exit data file: ${outputPath}`);
console.log(`   Total highways with exits: ${Object.keys(output.interstates).length}`);
console.log(`   Total exits: ${totalExits}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Review the generated file`);
console.log(`   2. Integrate exit data into explorer.ts`);
console.log(`   3. Geocode exit coordinates`);
console.log(`   4. Add exit data for remaining highway types (US, State, FM, Ranch)`);

