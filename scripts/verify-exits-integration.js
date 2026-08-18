#!/usr/bin/env node

/**
 * Verify Texas Highway Exit Integration
 */

const fs = require('fs');
const path = require('path');

console.log('✅ Verifying Texas Highway Exit Integration');
console.log('='.repeat(70));

// Check mapping file
const mappingPath = path.join(__dirname, '..', 'data', 'texas-exits-mapping.ts');
const mappingContent = fs.readFileSync(mappingPath, 'utf8');

const mappingCount = (mappingContent.match(/'interstate-[^']+':/g) || []).length;
console.log(`\n📊 Exit mapping file:`);
console.log(`   Highways mapped: ${mappingCount}`);

// Check integrated exits file
const exitsPath = path.join(__dirname, '..', 'data', 'texas-highway-exits-integrated.ts');
const exitsContent = fs.readFileSync(exitsPath, 'utf8');

const exitExports = (exitsContent.match(/^export const I[\d_]+_EXITS/gm) || []).length;
console.log(`\n📊 Exit data file:`);
console.log(`   Exit exports: ${exitExports}`);

// Check explorer.ts integration
const explorerPath = path.join(__dirname, '..', 'services', 'explorer.ts');
const explorerContent = fs.readFileSync(explorerPath, 'utf8');

const hasImport = explorerContent.includes('TEXAS_HIGHWAY_EXITS');
const hasExitMapping = explorerContent.includes('TEXAS_HIGHWAY_EXITS[hw.id]');

console.log(`\n📊 Explorer service integration:`);
console.log(`   Import present: ${hasImport ? '✅' : '❌'}`);
console.log(`   Exit mapping code: ${hasExitMapping ? '✅' : '❌'}`);

if (hasImport && hasExitMapping) {
  console.log(`\n✅ Exit data integration complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Exit data available for ${mappingCount} highways`);
  console.log(`   - Exit data integrated into explorer.ts`);
  console.log(`   - Highways will now have exit data populated on initialization`);
} else {
  console.log(`\n⚠️  Integration incomplete - check explorer.ts`);
}

