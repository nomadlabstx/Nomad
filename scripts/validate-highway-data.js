#!/usr/bin/env node

/**
 * Highway Data Validation Script
 * Validates collected highway data for accuracy and completeness
 * 
 * Usage: node scripts/validate-highway-data.js [state-codes]
 * Example: node scripts/validate-highway-data.js CA FL NY
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Validate highway data structure
 */
function validateHighwayData(highways, stateCode) {
  const errors = [];
  const warnings = [];
  
  for (const highway of highways) {
    // Required fields
    if (!highway.id) errors.push(`Missing id for highway in ${stateCode}`);
    if (!highway.name) errors.push(`Missing name for highway ${highway.id} in ${stateCode}`);
    if (!highway.type || highway.type !== 'highway') errors.push(`Invalid type for highway ${highway.id} in ${stateCode}`);
    if (!highway.highwayType) errors.push(`Missing highwayType for highway ${highway.id} in ${stateCode}`);
    if (!highway.number) errors.push(`Missing number for highway ${highway.id} in ${stateCode}`);
    if (!highway.fullName) errors.push(`Missing fullName for highway ${highway.id} in ${stateCode}`);
    if (!highway.states || !Array.isArray(highway.states)) errors.push(`Invalid states for highway ${highway.id} in ${stateCode}`);
    if (!highway.states.includes(stateCode)) errors.push(`Highway ${highway.id} missing state ${stateCode} in states array`);
    
    // Type-specific validation
    if (highway.highwayType === 'interstate') {
      if (!highway.number.match(/^[0-9]+[A-Z]?$/)) {
        warnings.push(`Interstate ${highway.id} has unusual number format: ${highway.number}`);
      }
    } else if (highway.highwayType === 'us') {
      if (!highway.number.match(/^[0-9]+[A-Z]?$/)) {
        warnings.push(`US Highway ${highway.id} has unusual number format: ${highway.number}`);
      }
    } else if (highway.highwayType === 'state') {
      if (!highway.number.match(/^[0-9]+[A-Z]?$/)) {
        warnings.push(`State Highway ${highway.id} has unusual number format: ${highway.number}`);
      }
    }
    
    // ID format validation
    const expectedId = `${highway.highwayType}-${highway.number}`.toLowerCase().replace(/\s+/g, '-');
    if (highway.id !== expectedId) {
      warnings.push(`Highway ${highway.id} has unexpected ID format. Expected: ${expectedId}`);
    }
    
    // Exit count validation
    if (typeof highway.totalExits !== 'number' || highway.totalExits < 0) {
      warnings.push(`Highway ${highway.id} has invalid totalExits: ${highway.totalExits}`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Check for duplicate highways
 */
function checkDuplicates(highways, stateCode) {
  const seen = new Set();
  const duplicates = [];
  
  for (const highway of highways) {
    if (seen.has(highway.id)) {
      duplicates.push(`Duplicate highway ID: ${highway.id} in ${stateCode}`);
    }
    seen.add(highway.id);
  }
  
  return duplicates;
}

/**
 * Validate state highway file
 */
async function validateStateFile(stateCode) {
  const filename = `${stateCode.toLowerCase()}-highways.ts`;
  const filepath = path.join(__dirname, '..', 'data', filename);
  
  try {
    const content = await fs.readFile(filepath, 'utf8');
    
    // Extract highway data using regex (simple approach)
    const highwayMatches = content.match(/{\s*id:\s*'([^']+)',[\s\S]*?}/g);
    
    if (!highwayMatches) {
      return {
        stateCode,
        status: 'error',
        message: 'No highway data found in file',
        highways: 0,
        errors: ['No highway data found'],
        warnings: [],
        duplicates: []
      };
    }
    
    // Parse highways (simplified parsing)
    const highways = [];
    for (const match of highwayMatches) {
      const idMatch = match.match(/id:\s*'([^']+)'/);
      const nameMatch = match.match(/name:\s*'([^']+)'/);
      const typeMatch = match.match(/type:\s*'([^']+)'/);
      const highwayTypeMatch = match.match(/highwayType:\s*'([^']+)'/);
      const numberMatch = match.match(/number:\s*'([^']+)'/);
      const fullNameMatch = match.match(/fullName:\s*'([^']+)'/);
      const statesMatch = match.match(/states:\s*\[([^\]]+)\]/);
      const totalExitsMatch = match.match(/totalExits:\s*(\d+)/);
      
      if (idMatch && nameMatch && typeMatch && highwayTypeMatch && numberMatch && fullNameMatch && statesMatch) {
        highways.push({
          id: idMatch[1],
          name: nameMatch[1],
          type: typeMatch[1],
          highwayType: highwayTypeMatch[1],
          number: numberMatch[1],
          fullName: fullNameMatch[1],
          states: statesMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')),
          totalExits: totalExitsMatch ? parseInt(totalExitsMatch[1]) : 0
        });
      }
    }
    
    // Validate data
    const { errors, warnings } = validateHighwayData(highways, stateCode);
    const duplicates = checkDuplicates(highways, stateCode);
    
    return {
      stateCode,
      status: errors.length > 0 ? 'error' : 'success',
      message: errors.length > 0 ? `${errors.length} errors found` : 'Validation passed',
      highways: highways.length,
      errors,
      warnings,
      duplicates
    };
    
  } catch (error) {
    return {
      stateCode,
      status: 'error',
      message: `File read error: ${error.message}`,
      highways: 0,
      errors: [error.message],
      warnings: [],
      duplicates: []
    };
  }
}

/**
 * Main validation function
 */
async function main() {
  const args = process.argv.slice(2);
  const statesToValidate = args.length > 0 ? args : ['CA', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI', 'NJ'];
  
  console.log('🔍 Starting highway data validation...');
  console.log(`📊 Validating states: ${statesToValidate.join(', ')}`);
  
  const results = [];
  
  for (const stateCode of statesToValidate) {
    console.log(`\n🔍 Validating ${stateCode}...`);
    
    const result = await validateStateFile(stateCode);
    results.push(result);
    
    if (result.status === 'error') {
      console.log(`❌ ${result.message}`);
      if (result.errors.length > 0) {
        console.log('   Errors:');
        result.errors.forEach(error => console.log(`   - ${error}`));
      }
    } else {
      console.log(`✅ ${result.message} (${result.highways} highways)`);
    }
    
    if (result.warnings.length > 0) {
      console.log('   Warnings:');
      result.warnings.slice(0, 5).forEach(warning => console.log(`   - ${warning}`));
      if (result.warnings.length > 5) {
        console.log(`   ... and ${result.warnings.length - 5} more warnings`);
      }
    }
    
    if (result.duplicates.length > 0) {
      console.log('   Duplicates:');
      result.duplicates.forEach(dup => console.log(`   - ${dup}`));
    }
  }
  
  // Summary
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log('=====================');
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n📈 Highway Counts:');
    successful.forEach(result => {
      console.log(`   ${result.stateCode}: ${result.highways} highways`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed States:');
    failed.forEach(result => {
      console.log(`   ${result.stateCode}: ${result.message}`);
    });
  }
  
  const totalHighways = successful.reduce((sum, r) => sum + r.highways, 0);
  console.log(`\n🎯 Total Highways Validated: ${totalHighways}`);
  
  if (failed.length === 0) {
    console.log('🎉 All validations passed!');
  } else {
    console.log('⚠️  Some validations failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { validateHighwayData, checkDuplicates, validateStateFile };
