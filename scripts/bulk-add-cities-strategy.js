#!/usr/bin/env node

/**
 * Strategy for Bulk Adding Cities
 * Provides options for adding the discovered missing cities
 */

const fs = require('fs').promises;
const path = require('path');

async function analyzeMissingCities() {
  const missingPath = path.join(__dirname, '..', 'data', 'discovered-missing-cities.json');
  const data = JSON.parse(await fs.readFile(missingPath, 'utf8'));
  
  console.log('📊 Missing Cities Analysis');
  console.log('='.repeat(70));
  console.log(`\n   Total Missing: ${data.total}`);
  console.log(`   Missing Major Cities: ${data.missingMajorCities.length}`);
  
  // Prioritize by city name patterns (major cities)
  const majorCityKeywords = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Indianapolis', 'Columbus', 'Charlotte', 'Seattle', 'Denver', 'Boston',
    'Nashville', 'Portland', 'Detroit', 'Memphis', 'Oklahoma City', 'Las Vegas',
    'Louisville', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento'
  ];
  
  const priorityCities = data.cities.filter(city => 
    majorCityKeywords.some(keyword => city.name.includes(keyword))
  );
  
  console.log(`\n   High Priority (Major Cities): ${priorityCities.length}`);
  
  // Group by population estimates based on city names
  const bySize = {
    major: [],      // Known major metros
    medium: [],     // Medium cities
    small: [],      // Smaller cities
    unknown: []
  };
  
  for (const city of data.cities) {
    const name = city.name.toLowerCase();
    if (name.includes('new york') || name.includes('los angeles') || 
        name.includes('chicago') || name.includes('houston')) {
      bySize.major.push(city);
    } else if (priorityCities.includes(city)) {
      bySize.medium.push(city);
    } else {
      bySize.small.push(city);
    }
  }
  
  console.log(`\n   Breakdown:`);
  console.log(`     Major metros: ${bySize.major.length}`);
  console.log(`     Medium cities: ${bySize.medium.length}`);
  console.log(`     Small cities: ${bySize.small.length}`);
  
  // Recommendations
  console.log('\n\n💡 Recommendations:');
  console.log('='.repeat(70));
  console.log('\n1. PRIORITY: Add Major Missing Cities First');
  console.log('   - These are major metros that should definitely be included');
  console.log('   - Use geocoding API to get accurate county data');
  console.log('   - Estimated: ~100-200 cities');
  
  console.log('\n2. BATCH PROCESSING Options:');
  console.log('   A. Use existing geocoding script (geocode-all-us-cities.js)');
  console.log('      - Already set up for batch processing');
  console.log('      - Has rate limiting and progress tracking');
  console.log('      - Cost: ~$0.005 per city');
  
  console.log('\n   B. Manual review and selective addition');
  console.log('      - Review discovered-missing-cities.json');
  console.log('      - Add cities by state or priority');
  console.log('      - More control, slower process');
  
  console.log('\n3. VERIFICATION:');
  console.log('   - Some "missing" cities might be duplicates with different names');
  console.log('   - Check for name variations (e.g., "St. Louis" vs "Saint Louis")');
  console.log('   - Verify against current database before adding');
  
  console.log('\n4. PERFORMANCE CONSIDERATIONS:');
  console.log('   - Current database: ~19,410 cities');
  console.log('   - Adding all 3,093 would bring total to ~22,500');
  console.log('   - Should be manageable with proper indexing');
  
  // Save priority list
  const priorityPath = path.join(__dirname, '..', 'data', 'priority-cities-to-add.json');
  await fs.writeFile(priorityPath, JSON.stringify({
    priorityMajor: bySize.major,
    priorityMedium: bySize.medium,
    totalMissing: data.total,
    recommendation: 'Start with priority major cities, then batch process remaining'
  }, null, 2));
  
  console.log(`\n📄 Priority list saved to: ${priorityPath}`);
}

analyzeMissingCities().catch(console.error);
