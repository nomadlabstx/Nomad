#!/usr/bin/env node

/**
 * Fix Texas Highway Exit Labeling Issues
 * 
 * Fixes:
 * 1. Deduplicates exits with same number and very close mileposts (< 0.5 miles apart)
 * 2. Adds directional suffixes (A/B) to exits with same number but different mileposts
 * 3. Fixes overlapping milepost ranges
 * 4. Merges exits that are clearly duplicates
 */

const fs = require('fs');
const path = require('path');

const EXITS_FILE = path.join(__dirname, '../data/texas-highway-exits-integrated.ts');
const OUTPUT_FILE = path.join(__dirname, '../data/texas-highway-exits-fixed.ts');

function parseExitData() {
  const content = fs.readFileSync(EXITS_FILE, 'utf8');
  const exits = new Map();

  const exportRegex = /export const (\w+_EXITS):\s*Omit<ExplorerHighwayExit[^>]+>\[\]\s*=\s*\[([\s\S]*?)\];/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    const highwayKey = match[1];
    const exitsArray = match[2];

    const exitRegex = /\{\s*exitNumber:\s*['"]([^'"]+)['"],[\s\S]*?description:\s*['"]([^'"]+)['"],[\s\S]*?latitude:\s*([\d.]+),[\s\S]*?longitude:\s*([\d.]+)[\s\S]*?milepointStart:\s*([\d.]+),[\s\S]*?milepointEnd:\s*([\d.]+)[\s\S]*?\}/g;
    const highwayExits = [];
    let exitMatch;

    while ((exitMatch = exitRegex.exec(exitsArray)) !== null) {
      highwayExits.push({
        exitNumber: exitMatch[1],
        description: exitMatch[2],
        coordinates: {
          latitude: parseFloat(exitMatch[3]),
          longitude: parseFloat(exitMatch[4])
        },
        milepointStart: parseFloat(exitMatch[5]),
        milepointEnd: parseFloat(exitMatch[6])
      });
    }

    exits.set(highwayKey, highwayExits);
  }

  return exits;
}

function fixHighwayExits(exits) {
  // Sort by milepost
  const sorted = [...exits].sort((a, b) => a.milepointStart - b.milepointStart);
  const fixed = [];
  const processed = new Set();

  for (let i = 0; i < sorted.length; i++) {
    if (processed.has(i)) continue;

    const current = sorted[i];
    const duplicates = [current];
    const duplicateIndices = [i];

    // Find all exits with same number
    for (let j = i + 1; j < sorted.length; j++) {
      if (processed.has(j)) continue;
      if (sorted[j].exitNumber === current.exitNumber) {
        duplicates.push(sorted[j]);
        duplicateIndices.push(j);
      }
    }

    if (duplicates.length === 1) {
      // No duplicates, keep as is
      fixed.push(current);
      processed.add(i);
    } else {
      // Handle duplicates
      duplicates.sort((a, b) => a.milepointStart - b.milepointStart);

      // Check if they're very close (< 0.5 miles apart) - likely same exit
      const firstMilepost = duplicates[0].milepointStart;
      const lastMilepost = duplicates[duplicates.length - 1].milepointStart;
      const range = lastMilepost - firstMilepost;

      if (range < 0.5) {
        // Merge into single exit - use the one with the widest range
        const merged = duplicates.reduce((best, exit) => {
          const exitRange = exit.milepointEnd - exit.milepointStart;
          const bestRange = best.milepointEnd - best.milepointStart;
          return exitRange > bestRange ? exit : best;
        });
        
        // Expand range to cover all duplicates
        merged.milepointStart = Math.min(...duplicates.map(e => e.milepointStart));
        merged.milepointEnd = Math.max(...duplicates.map(e => e.milepointEnd));
        
        fixed.push(merged);
        duplicateIndices.forEach(idx => processed.add(idx));
      } else {
        // Different exits - add directional suffixes
        duplicates.forEach((exit, idx) => {
          const suffix = duplicates.length === 2 
            ? (idx === 0 ? 'A' : 'B')
            : String.fromCharCode(65 + idx); // A, B, C, etc.
          
          const fixedExit = {
            ...exit,
            exitNumber: `${exit.exitNumber}${suffix}`,
            description: exit.description.replace(
              new RegExp(`Exit ${exit.exitNumber}(?!\\d)`, 'g'),
              `Exit ${exit.exitNumber}${suffix}`
            )
          };
          
          fixed.push(fixedExit);
          processed.add(duplicateIndices[idx]);
        });
      }
    }
  }

  // Fix overlapping mileposts
  fixed.sort((a, b) => a.milepointStart - b.milepointStart);
  for (let i = 1; i < fixed.length; i++) {
    const prev = fixed[i - 1];
    const curr = fixed[i];
    
    if (prev.milepointEnd > curr.milepointStart) {
      // Overlap detected - adjust ranges
      const midpoint = (prev.milepointEnd + curr.milepointStart) / 2;
      prev.milepointEnd = midpoint;
      curr.milepointStart = midpoint + 0.01; // Small gap
    }
  }

  return fixed.sort((a, b) => a.milepointStart - b.milepointStart);
}

function generateOutput(exitData) {
  let output = `/**
 * Texas Highway Exit Data - Fixed
 * Generated from texas-highway-exits-integrated.ts
 * 
 * Fixes applied:
 * - Deduplicated exits with same number and close mileposts
 * - Added directional suffixes (A/B) to distinct exits with same number
 * - Fixed overlapping milepost ranges
 * 
 * Generated: ${new Date().toISOString()}
 */

import type { ExplorerHighwayExit } from '../types/explorer';


`;

  let totalFixed = 0;
  let totalMerged = 0;
  let totalSuffixed = 0;

  for (const [highwayKey, exits] of exitData.entries()) {
    const originalCount = exits.length;
    const fixed = fixHighwayExits(exits);
    const fixedCount = fixed.length;
    
    totalFixed += fixedCount;
    totalMerged += (originalCount - fixedCount);

    // Count how many got suffixes
    const suffixed = fixed.filter(e => /[A-Z]$/.test(e.exitNumber)).length;
    totalSuffixed += suffixed;

    output += `export const ${highwayKey}: Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] = [\n`;

    for (const exit of fixed) {
      output += `  {\n`;
      output += `    exitNumber: '${exit.exitNumber}',\n`;
      output += `    description: '${exit.description.replace(/'/g, "\\'")}',\n`;
      output += `    coordinates: { latitude: ${exit.coordinates.latitude}, longitude: ${exit.coordinates.longitude} },\n`;
      output += `    milepointStart: ${exit.milepointStart},\n`;
      output += `    milepointEnd: ${exit.milepointEnd},\n`;
      output += `  },\n`;
    }

    output += `];\n\n`;
  }

  output += `/**
 * Summary:
 * Total highways: ${exitData.size}
 * Total exits (fixed): ${totalFixed}
 * Exits merged: ${totalMerged}
 * Exits with directional suffixes: ${totalSuffixed}
 */
`;

  return output;
}

function fixExitLabeling() {
  console.log('🔧 Fixing Texas Highway Exit Labeling Issues');
  console.log('='.repeat(70));

  console.log('\n📖 Reading exit data...');
  const exitData = parseExitData();
  console.log(`   ✓ Found ${exitData.size} highways`);

  const totalBefore = Array.from(exitData.values()).reduce((sum, exits) => sum + exits.length, 0);
  console.log(`   ✓ Total exits before: ${totalBefore}`);

  console.log('\n🔧 Applying fixes...');
  const output = generateOutput(exitData);

  console.log('\n📝 Writing fixed exit data...');
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`   ✓ Saved to: ${OUTPUT_FILE}`);

  // Count exits in the generated output
  const fixedExits = output.match(/exitNumber:/g) || [];
  const totalAfter = fixedExits.length;

  // Count merged and suffixed
  const mergedCount = totalBefore - totalAfter;
  const suffixedCount = (output.match(/exitNumber:\s*['"][^'"]*[A-Z]['"]/g) || []).length;

  console.log('\n✅ Done!');
  console.log(`   • Exits before: ${totalBefore}`);
  console.log(`   • Exits after: ${totalAfter}`);
  console.log(`   • Exits merged: ${mergedCount}`);
  console.log(`   • Exits with suffixes: ${suffixedCount}`);
  console.log(`\n   Next step: Review ${OUTPUT_FILE} and replace the original if satisfied`);
}

fixExitLabeling();

