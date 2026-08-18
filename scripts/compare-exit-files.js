#!/usr/bin/env node

/**
 * Compare Original vs Fixed Exit Data
 */

const fs = require('fs');
const path = require('path');

const INTEGRATED_FILE = path.join(__dirname, '../data/texas-highway-exits-integrated.ts');
const FIXED_FILE = path.join(__dirname, '../data/texas-highway-exits-fixed.ts');

function parseExitData(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  
  const content = fs.readFileSync(filePath, 'utf8');
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

function analyzeExits(exits, label) {
  const totalExits = Array.from(exits.values()).reduce((sum, e) => sum + e.length, 0);
  
  // Count duplicates
  let duplicates = 0;
  exits.forEach((highwayExits) => {
    const exitNumbers = new Map();
    highwayExits.forEach(exit => {
      const num = exit.exitNumber;
      if (!exitNumbers.has(num)) exitNumbers.set(num, 0);
      exitNumbers.set(num, exitNumbers.get(num) + 1);
    });
    exitNumbers.forEach((count) => {
      if (count > 1) duplicates += count - 1;
    });
  });
  
  // Count exits with suffixes
  const suffixed = Array.from(exits.values())
    .flat()
    .filter(e => /[A-Z]$/.test(e.exitNumber)).length;
  
  // Count overlapping mileposts
  let overlaps = 0;
  exits.forEach((highwayExits) => {
    const sorted = [...highwayExits].sort((a, b) => a.milepointStart - b.milepointStart);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i-1].milepointEnd > sorted[i].milepointStart) {
        overlaps++;
      }
    }
  });
  
  // Count generic descriptions
  const generic = Array.from(exits.values())
    .flat()
    .filter(e => e.description === `Exit ${e.exitNumber}` || e.description.trim() === '').length;
  
  return {
    label,
    totalExits,
    duplicates,
    suffixed,
    overlaps,
    generic
  };
}

console.log('📊 Comparing Original vs Fixed Exit Data');
console.log('='.repeat(70));
console.log('');

const original = parseExitData(INTEGRATED_FILE);
const fixed = parseExitData(FIXED_FILE);

const origStats = analyzeExits(original, 'Original (Integrated)');
const fixedStats = analyzeExits(fixed, 'Fixed');

console.log('📋 Comparison:\n');
console.log('Metric'.padEnd(25) + 'Original'.padEnd(15) + 'Fixed'.padEnd(15) + 'Improvement');
console.log('-'.repeat(70));
console.log('Total Exits'.padEnd(25) + origStats.totalExits.toString().padEnd(15) + fixedStats.totalExits.toString().padEnd(15) + `-${origStats.totalExits - fixedStats.totalExits} (merged)`);
console.log('Duplicate Numbers'.padEnd(25) + origStats.duplicates.toString().padEnd(15) + fixedStats.duplicates.toString().padEnd(15) + `-${origStats.duplicates - fixedStats.duplicates} (fixed)`);
console.log('Exits with Suffixes'.padEnd(25) + origStats.suffixed.toString().padEnd(15) + fixedStats.suffixed.toString().padEnd(15) + `+${fixedStats.suffixed - origStats.suffixed} (added)`);
console.log('Overlapping Mileposts'.padEnd(25) + origStats.overlaps.toString().padEnd(15) + fixedStats.overlaps.toString().padEnd(15) + `-${origStats.overlaps - fixedStats.overlaps} (fixed)`);
console.log('Generic Descriptions'.padEnd(25) + origStats.generic.toString().padEnd(15) + fixedStats.generic.toString().padEnd(15) + 'Same (needs scraping)');

console.log('\n' + '='.repeat(70));
console.log('\n✅ Key Improvements:');
console.log(`   • Merged ${origStats.totalExits - fixedStats.totalExits} duplicate exits`);
console.log(`   • Fixed ${origStats.duplicates} duplicate exit number issues`);
console.log(`   • Added directional suffixes to ${fixedStats.suffixed} exits`);
console.log(`   • Fixed ${origStats.overlaps} overlapping milepost issues`);
console.log('\n📝 Remaining Work:');
console.log(`   • ${fixedStats.generic} exits need road name descriptions (run scrape script)`);
console.log(`   • All exits need coordinates (run populate script)`);

