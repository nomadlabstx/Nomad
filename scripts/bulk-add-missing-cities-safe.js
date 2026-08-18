#!/usr/bin/env node

/**
 * Safe Bulk Addition of Missing Cities
 * Adds missing cities with duplicate detection and validation
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Get all existing cities from the TypeScript file
 */
async function getExistingCities() {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const content = await fs.readFile(filePath, 'utf8');
  
  const cities = new Set();
  
  // Extract city entries using regex
  const cityPattern = /name:\s*['"]([^'"]+)['"][^}]*stateCode:\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = cityPattern.exec(content)) !== null) {
    const key = `${match[1].toLowerCase().trim()}|${match[2].toUpperCase()}`;
    cities.add(key);
  }
  
  console.log(`✅ Found ${cities.size} existing cities in database`);
  return cities;
}

/**
 * Load discovered missing cities
 */
async function loadMissingCities() {
  const missingPath = path.join(__dirname, '..', 'data', 'discovered-missing-cities.json');
  
  try {
    const content = await fs.readFile(missingPath, 'utf8');
    const data = JSON.parse(content);
    return data.cities || [];
  } catch (error) {
    console.error('❌ Error loading discovered missing cities:', error.message);
    return [];
  }
}

/**
 * Filter out duplicates
 */
function filterDuplicates(missingCities, existingCities) {
  const trulyMissing = [];
  const duplicates = [];
  
  for (const city of missingCities) {
    const key = `${city.name.toLowerCase().trim()}|${city.stateCode.toUpperCase()}`;
    
    if (existingCities.has(key)) {
      duplicates.push(city);
    } else {
      // Also check for name variations
      const nameVariations = [
        city.name.toLowerCase().trim(),
        city.name.toLowerCase().trim().replace(/\./g, ''),
        city.name.toLowerCase().trim().replace(/\s+/g, ' '),
        city.name.toLowerCase().trim().replace(/saint\s+/i, 'st. '),
        city.name.toLowerCase().trim().replace(/st\.\s+/i, 'saint '),
      ];
      
      let isDuplicate = false;
      for (const variation of nameVariations) {
        const varKey = `${variation}|${city.stateCode.toUpperCase()}`;
        if (existingCities.has(varKey)) {
          duplicates.push(city);
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        trulyMissing.push(city);
      }
    }
  }
  
  return { trulyMissing, duplicates };
}

/**
 * Prioritize cities by size/importance
 */
function prioritizeCities(cities) {
  // Major metros and well-known cities
  const majorKeywords = [
    'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
    'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
    'indianapolis', 'columbus', 'charlotte', 'seattle', 'denver', 'boston',
    'nashville', 'portland', 'detroit', 'memphis', 'oklahoma city', 'las vegas',
    'louisville', 'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento',
    'kansas city', 'atlanta', 'miami', 'oakland', 'minneapolis', 'tulsa',
    'cleveland', 'wichita', 'arlington', 'tampa', 'new orleans', 'baton rouge'
  ];
  
  const priority = [];
  const standard = [];
  
  for (const city of cities) {
    const nameLower = city.name.toLowerCase();
    const isMajor = majorKeywords.some(keyword => nameLower.includes(keyword));
    
    if (isMajor) {
      priority.push(city);
    } else {
      standard.push(city);
    }
  }
  
  return { priority, standard };
}

/**
 * Generate city entries for geocoding script format
 */
function generateCityEntries(cities) {
  return cities.map(city => ({
    name: city.name,
    state: city.state || '',
    stateCode: city.stateCode || '',
    // These will be filled by geocoding
    county: null,
    latitude: null,
    longitude: null,
    population: null,
    size: null,
    confidence: null
  }));
}

/**
 * Save filtered cities for processing
 */
async function saveFilteredCities(trulyMissing, duplicates) {
  const outputPath = path.join(__dirname, '..', 'data', 'filtered-missing-cities.json');
  
  const { priority, standard } = prioritizeCities(trulyMissing);
  
  const output = {
    summary: {
      totalDiscovered: trulyMissing.length + duplicates.length,
      duplicatesFound: duplicates.length,
      trulyMissing: trulyMissing.length,
      priorityCities: priority.length,
      standardCities: standard.length,
      timestamp: new Date().toISOString()
    },
    duplicates: duplicates,
    priorityCities: priority,
    standardCities: standard,
    allMissing: trulyMissing
  };
  
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n📄 Filtered results saved to: ${outputPath}`);
  
  return output;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Safe Bulk City Addition - Duplicate Detection');
  console.log('='.repeat(70));
  
  try {
    // Step 1: Load existing cities
    console.log('\n📊 Step 1: Loading existing cities...');
    const existingCities = await getExistingCities();
    
    // Step 2: Load discovered missing cities
    console.log('\n📊 Step 2: Loading discovered missing cities...');
    const missingCities = await loadMissingCities();
    console.log(`   Found ${missingCities.length} cities in discovery list`);
    
    if (missingCities.length === 0) {
      console.log('\n⚠️  No missing cities found. Run discover-missing-cities.js first.');
      return;
    }
    
    // Step 3: Filter duplicates
    console.log('\n📊 Step 3: Filtering duplicates...');
    const { trulyMissing, duplicates } = filterDuplicates(missingCities, existingCities);
    
    console.log(`   ✅ Truly missing: ${trulyMissing.length}`);
    console.log(`   ⚠️  Duplicates found: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n   Sample duplicates (first 10):');
      duplicates.slice(0, 10).forEach(city => {
        console.log(`     - ${city.name}, ${city.stateCode}`);
      });
      if (duplicates.length > 10) {
        console.log(`     ... and ${duplicates.length - 10} more`);
      }
    }
    
    // Step 4: Prioritize
    console.log('\n📊 Step 4: Prioritizing cities...');
    const { priority, standard } = prioritizeCities(trulyMissing);
    
    console.log(`   🎯 Priority cities (major metros): ${priority.length}`);
    console.log(`   📋 Standard cities: ${standard.length}`);
    
    // Step 5: Save filtered results
    console.log('\n📊 Step 5: Saving filtered results...');
    const output = await saveFilteredCities(trulyMissing, duplicates);
    
    // Final summary
    console.log('\n✅ Duplicate Detection Complete!');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   Total discovered: ${output.summary.totalDiscovered}`);
    console.log(`   Duplicates removed: ${output.summary.duplicatesFound}`);
    console.log(`   Ready to add: ${output.summary.trulyMissing}`);
    console.log(`   Priority cities: ${output.summary.priorityCities}`);
    console.log(`   Standard cities: ${output.summary.standardCities}`);
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Review filtered-missing-cities.json');
    console.log('   2. Option A: Process priority cities first (recommended)');
    console.log('   3. Option B: Process all missing cities in batches');
    console.log('   4. Use geocode-all-us-cities.js with the filtered list');
    
    console.log('\n📝 To process priority cities:');
    console.log('   node scripts/geocode-filtered-cities.js --priority');
    
    console.log('\n📝 To process all missing cities:');
    console.log('   node scripts/geocode-filtered-cities.js --all');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getExistingCities, filterDuplicates, prioritizeCities };
