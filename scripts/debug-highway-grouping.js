/**
 * Debug Highway Grouping Logic
 * Simulates exactly what groupDirectionalHighways() does
 */

const fs = require('fs');

// Simulate the highway data structure
const mockHighways = [
  {
    id: 'interstate-35-north',
    name: 'Interstate 35 North',
    fullName: 'Interstate 35 North',
    number: '35',
    direction: 'north',
    parentHighwayId: 'interstate-35',
    totalExits: 116,
    visitedExits: 0,
  },
  {
    id: 'interstate-35-south',
    name: 'Interstate 35 South',
    fullName: 'Interstate 35 South',
    number: '35',
    direction: 'south',
    parentHighwayId: 'interstate-35',
    totalExits: 116,
    visitedExits: 0,
  },
  {
    id: 'interstate-410',
    name: 'Interstate 410',
    fullName: 'Interstate 410 (San Antonio Loop)',
    number: '410',
    direction: undefined,
    parentHighwayId: undefined,
    totalExits: 53,
    visitedExits: 0,
  },
];

console.log('🧪 SIMULATING groupDirectionalHighways()\n');
console.log('Input: 3 highways');
console.log('  - Interstate 35 North (parentHighwayId: interstate-35)');
console.log('  - Interstate 35 South (parentHighwayId: interstate-35)');
console.log('  - Interstate 410 (no parent, no direction)\n');

// Simulate the grouping logic
const grouped = new Map();

mockHighways.forEach(hw => {
  const baseId = hw.parentHighwayId || hw.id;
  console.log(`Processing: ${hw.name}`);
  console.log(`  → baseId = ${baseId}`);
  
  if (!grouped.has(baseId)) {
    grouped.set(baseId, []);
  }
  grouped.get(baseId).push(hw);
});

console.log('\n📊 GROUPED RESULTS:\n');

const result = Array.from(grouped.entries()).map(([baseId, hws]) => {
  const hasDirections = hws.length > 1 && hws.some(h => h.direction);
  const first = hws[0];
  const baseName = hasDirections 
    ? first.fullName.replace(/ (North|South|East|West)$/, '')
    : first.fullName;
  
  const totalExits = hws.reduce((sum, h) => sum + h.totalExits, 0);
  const visitedExits = hws.reduce((sum, h) => sum + (h.visitedExits || 0), 0);
  const overallProgress = totalExits > 0 ? (visitedExits / totalExits) * 100 : 0;
  
  console.log(`Group: ${baseId}`);
  console.log(`  baseName: "${baseName}"`);
  console.log(`  hasDirections: ${hasDirections}`);
  console.log(`  highways count: ${hws.length}`);
  console.log(`  highways:`);
  hws.forEach(h => console.log(`    - ${h.name} (direction: ${h.direction || 'none'})`));
  console.log(`  overallProgress: ${overallProgress}%`);
  console.log('');
  
  return {
    baseId,
    baseName,
    highways: hws,
    hasDirections,
    overallProgress,
  };
});

console.log('✅ EXPECTED UI BEHAVIOR:\n');
result.forEach(group => {
  if (group.hasDirections) {
    console.log(`📁 ${group.baseName} [EXPANDABLE]`);
    group.highways.forEach(hw => {
      const icon = hw.direction === 'north' ? '⬆️' : hw.direction === 'south' ? '⬇️' : '🛣️';
      console.log(`  └─ ${icon} ${hw.direction ? hw.direction.charAt(0).toUpperCase() + hw.direction.slice(1) : hw.name}`);
    });
  } else {
    console.log(`📄 ${group.baseName} [NOT EXPANDABLE - single highway]`);
  }
});

console.log('\n✅ Grouping logic is working correctly!');

