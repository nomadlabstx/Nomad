#!/usr/bin/env node

/**
 * Count Texas Highway Exit Coverage
 */

const fs = require('fs');
const path = require('path');

console.log('📊 Texas Highway Exit Coverage');
console.log('='.repeat(70));

// Load highways
const highwaysPath = path.join(__dirname, '..', 'data', 'texas-highways-complete.ts');
const highwaysContent = fs.readFileSync(highwaysPath, 'utf8');

// Count total highways
const highwayMatches = highwaysContent.match(/createDirectionalHighway|id:\s*createHighwayId/g);
const totalHighways = (highwayMatches || []).length;

// Also check ALL_TEXAS_HIGHWAYS export
const allHighwaysMatch = highwaysContent.match(/export const ALL_TEXAS_HIGHWAYS.*?\[([\s\S]*?)\];/);
if (allHighwaysMatch) {
  const highwaysArray = allHighwaysMatch[1];
  // Count spread operators and direct objects
  const spreadCount = (highwaysArray.match(/\.\.\./g) || []).length;
  const directCount = (highwaysArray.match(/{\s*id:/g) || []).length;
  console.log(`\n📊 Total highways in ALL_TEXAS_HIGHWAYS:`);
  console.log(`   Spread arrays: ${spreadCount}`);
  console.log(`   Direct objects: ${directCount}`);
  console.log(`   Estimated total: ${spreadCount * 2 + directCount} (directional highways counted twice)`);
}

// Load exit mapping
const mappingPath = path.join(__dirname, '..', 'data', 'texas-exits-mapping.ts');
const mappingContent = fs.readFileSync(mappingPath, 'utf8');

const exitMappingCount = (mappingContent.match(/'interstate-[^']+':/g) || []).length;

console.log(`\n📊 Exit data coverage:`);
console.log(`   Highways with exit data: ${exitMappingCount}`);
console.log(`   Total highways: 148`);

// Check which highways have exits
const exitsList = [];
const exitMatches = mappingContent.matchAll(/'interstate-([^']+)':/g);
for (const match of exitMatches) {
  exitsList.push(match[1]);
}

console.log(`\n📋 Highways with exit data:`);
exitsList.sort().forEach((hw, i) => {
  if (i < 35) {
    console.log(`   ${i + 1}. ${hw}`);
  }
});

const coverage = ((exitMappingCount / 148) * 100).toFixed(1);
console.log(`\n📊 Coverage: ${coverage}%`);
console.log(`   Status: ${exitMappingCount >= 148 ? '✅ Complete' : exitMappingCount >= 20 ? '⚠️  Partial' : '❌ Incomplete'}`);

console.log(`\n💡 Note: Exit data is available for major Interstate highways.`);
console.log(`   US Highways, State Highways, FM Roads, and Ranch Roads`);
console.log(`   do not have exit data yet (they typically don't have numbered exits).`);

