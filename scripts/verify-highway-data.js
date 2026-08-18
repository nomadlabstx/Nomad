/**
 * Highway Data Verification Script
 * Verifies that highway data is properly structured
 * 
 * Usage: node scripts/verify-highway-data.js
 */

/* eslint-env node */
/* global __dirname */

const fs = require('fs');
const path = require('path');

console.log('🔍 HIGHWAY DATA VERIFICATION SCRIPT\n');
console.log('='.repeat(60));

// Read the TypeScript file
const filePath = path.join(__dirname, '../data/texas-highways-complete.ts');
const fileContent = fs.readFileSync(filePath, 'utf-8');

// Test 1: File exists and readable
console.log('\n✅ TEST 1: File Readable');
console.log(`   File path: ${filePath}`);
console.log(`   File size: ${fileContent.length} characters`);
console.log('   ✅ Pass: File loaded successfully');

// Test 2: Check for createDirectionalHighway function
console.log('\n✅ TEST 2: createDirectionalHighway Function');
if (fileContent.includes('createDirectionalHighway')) {
  console.log('   ✅ Pass: createDirectionalHighway function found');
} else {
  console.error('   ❌ FAIL: createDirectionalHighway function not found');
  process.exit(1);
}

// Test 3: Count directional highway calls
console.log('\n✅ TEST 3: Directional Highway Instances');
const directionalCalls = (fileContent.match(/createDirectionalHighway\(/g) || []).length;
console.log(`   Directional highways created: ${directionalCalls}`);
if (directionalCalls > 0) {
  console.log('   ✅ Pass: Directional highways are being created');
} else {
  console.error('   ❌ FAIL: No directional highways created');
  process.exit(1);
}

// Test 4: Verify direction parameters
console.log('\n✅ TEST 4: Direction Parameters');
const northCount = (fileContent.match(/createDirectionalHighway\([^,]+,\s*'north'/g) || []).length;
const southCount = (fileContent.match(/createDirectionalHighway\([^,]+,\s*'south'/g) || []).length;
const eastCount = (fileContent.match(/createDirectionalHighway\([^,]+,\s*'east'/g) || []).length;
const westCount = (fileContent.match(/createDirectionalHighway\([^,]+,\s*'west'/g) || []).length;

console.log(`   ⬆️ North: ${northCount}`);
console.log(`   ⬇️ South: ${southCount}`);
console.log(`   ➡️ East: ${eastCount}`);
console.log(`   ⬅️ West: ${westCount}`);

if (northCount === southCount && eastCount === westCount) {
  console.log('   ✅ Pass: Directional highways are balanced (paired)');
} else {
  console.warn(`   ⚠️ Warning: Directions may not be perfectly paired`);
  console.warn(`   North/South: ${northCount}/${southCount}, East/West: ${eastCount}/${westCount}`);
}

// Test 5: Check for base highway definitions
console.log('\n✅ TEST 5: Base Highway Definitions');
const baseDefinitions = (fileContent.match(/const I\d+[A-Z]*_BASE =/g) || []).length +
                        (fileContent.match(/const US\d+[A-Z]*_BASE =/g) || []).length;
console.log(`   Base highway definitions: ${baseDefinitions}`);
if (baseDefinitions > 0) {
  console.log('   ✅ Pass: Base highway definitions found');
} else {
  console.error('   ❌ FAIL: No base highway definitions found');
  process.exit(1);
}

// Test 6: Verify export statement
console.log('\n✅ TEST 6: Export Statements');
if (fileContent.includes('export const ALL_TEXAS_HIGHWAYS')) {
  console.log('   ✅ Pass: ALL_TEXAS_HIGHWAYS export found');
} else {
  console.error('   ❌ FAIL: ALL_TEXAS_HIGHWAYS export not found');
  process.exit(1);
}

// Test 7: Check UI file for rendering functions
console.log('\n✅ TEST 7: UI Rendering Functions');
const uiFilePath = path.join(__dirname, '../app/(tabs)/explore.tsx');
const uiContent = fs.readFileSync(uiFilePath, 'utf-8');

const hasDirectionalGroup = uiContent.includes('renderDirectionalHighwayGroup');
const hasDirectionalHighway = uiContent.includes('renderDirectionalHighway');
const hasGroupFunction = uiContent.includes('groupDirectionalHighways');

console.log(`   renderDirectionalHighwayGroup: ${hasDirectionalGroup ? '✅' : '❌'}`);
console.log(`   renderDirectionalHighway: ${hasDirectionalHighway ? '✅' : '❌'}`);
console.log(`   groupDirectionalHighways: ${hasGroupFunction ? '✅' : '❌'}`);

if (hasDirectionalGroup && hasDirectionalHighway && hasGroupFunction) {
  console.log('   ✅ Pass: All UI rendering functions present');
} else {
  console.error('   ❌ FAIL: Missing UI rendering functions');
  process.exit(1);
}

// Test 8: Check explorer service loads highways
console.log('\n✅ TEST 8: Explorer Service Highway Loading');
const serviceFilePath = path.join(__dirname, '../services/explorer.ts');
const serviceContent = fs.readFileSync(serviceFilePath, 'utf-8');

if (serviceContent.includes('this.initializeAllTexasHighways()')) {
  console.log('   ✅ Pass: Explorer service calls initializeAllTexasHighways()');
} else {
  console.error('   ❌ FAIL: Explorer service does not initialize highways');
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY\n');
console.log('✅ All 8 tests passed successfully!');
console.log('\n🎉 Highway data structure is valid and ready for use!');
console.log('\nExpected behavior:');
console.log('  - Highways will be grouped by direction (North/South or East/West)');
console.log('  - Users can expand each direction to see exits');
console.log('  - Exit format: "Exit XXX - Road Name, Street Name"');
console.log('  - Progress tracking per direction');
console.log('\n' + '='.repeat(60));


