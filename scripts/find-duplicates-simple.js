#!/usr/bin/env node

/**
 * Find duplicate cities in the database
 * Uses a simpler approach to extract city entries
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');

console.log('🔍 Finding Duplicate Cities');
console.log('='.repeat(70));

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Extract city entries by looking for city object patterns
const cities = [];
let currentLine = 0;

// Pattern to match city entries - looking for name, stateCode, and coordinates
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Look for city entries (they have name, stateCode, county, latitude, longitude)
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    // Try to extract the city information
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateMatch = line.match(/state:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    const countyMatch = line.match(/county:\s*['"]([^'"]+)['"]/);
    const latMatch = line.match(/latitude:\s*([0-9.-]+)/);
    const lngMatch = line.match(/longitude:\s*([0-9.-]+)/);
    
    if (nameMatch && stateCodeMatch && latMatch && lngMatch) {
      cities.push({
        name: nameMatch[1],
        state: stateMatch ? stateMatch[1] : '',
        stateCode: stateCodeMatch[1],
        county: countyMatch ? countyMatch[1] : '',
        latitude: parseFloat(latMatch[1]),
        longitude: parseFloat(lngMatch[1]),
        lineNumber: i + 1,
        fullLine: line.trim()
      });
    }
  }
}

console.log(`\n📊 Total cities found: ${cities.length}`);

// Group by name and stateCode
const cityMap = new Map();

cities.forEach(city => {
  const key = `${city.name}|${city.stateCode}`;
  if (!cityMap.has(key)) {
    cityMap.set(key, []);
  }
  cityMap.get(key).push(city);
});

// Find duplicates
const exactDuplicates = [];
const similarDuplicates = [];
const potentialDuplicates = [];

cityMap.forEach((group, key) => {
  if (group.length > 1) {
    // Check if they're exact duplicates (same coordinates within 0.0001)
    const exactGroups = [];
    const similarGroups = [];
    
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const city1 = group[i];
        const city2 = group[j];
        
        const latDiff = Math.abs(city1.latitude - city2.latitude);
        const lngDiff = Math.abs(city1.longitude - city2.longitude);
        
        // Exact duplicate (coordinates within 0.0001)
        if (latDiff < 0.0001 && lngDiff < 0.0001) {
          exactGroups.push([city1, city2]);
        } else if (latDiff < 0.01 && lngDiff < 0.01) {
          // Similar duplicate (coordinates within 0.01)
          similarGroups.push([city1, city2]);
        }
      }
    }
    
    if (exactGroups.length > 0) {
      exactDuplicates.push({
        name: group[0].name,
        stateCode: group[0].stateCode,
        entries: group
      });
    } else if (similarGroups.length > 0) {
      similarDuplicates.push({
        name: group[0].name,
        stateCode: group[0].stateCode,
        entries: group
      });
    } else {
      // Potential duplicates (same name/state but different locations)
      potentialDuplicates.push({
        name: group[0].name,
        stateCode: group[0].stateCode,
        entries: group
      });
    }
  }
});

console.log(`\n🔴 Exact Duplicates (same name, state, identical coordinates): ${exactDuplicates.length}`);
if (exactDuplicates.length > 0) {
  console.log('\nExact Duplicates:');
  exactDuplicates.forEach((dup, idx) => {
    console.log(`\n${idx + 1}. ${dup.name}, ${dup.stateCode} (${dup.entries.length} entries)`);
    dup.entries.forEach((entry, i) => {
      console.log(`   ${i + 1}. Line ${entry.lineNumber}: ${entry.county} - (${entry.latitude}, ${entry.longitude})`);
    });
  });
}

console.log(`\n🟡 Similar Duplicates (same name, state, similar coordinates): ${similarDuplicates.length}`);
if (similarDuplicates.length > 0) {
  const displayCount = Math.min(20, similarDuplicates.length);
  console.log(`\nSimilar Duplicates (showing ${displayCount}):`);
  similarDuplicates.slice(0, displayCount).forEach((dup, idx) => {
    console.log(`\n${idx + 1}. ${dup.name}, ${dup.stateCode} (${dup.entries.length} entries)`);
    dup.entries.forEach((entry, i) => {
      console.log(`   ${i + 1}. Line ${entry.lineNumber}: ${entry.county} - (${entry.latitude}, ${entry.longitude})`);
    });
  });
  if (similarDuplicates.length > 20) {
    console.log(`\n   ... and ${similarDuplicates.length - 20} more`);
  }
}

console.log(`\n🟢 Potential Duplicates (same name, state, different locations): ${potentialDuplicates.length}`);
if (potentialDuplicates.length > 0) {
  const displayCount = Math.min(20, potentialDuplicates.length);
  console.log(`\nPotential Duplicates (showing ${displayCount}):`);
  potentialDuplicates.slice(0, displayCount).forEach((group, idx) => {
    console.log(`\n${idx + 1}. ${group.name}, ${group.stateCode} (${group.entries.length} entries)`);
    group.entries.forEach((entry, i) => {
      console.log(`   ${i + 1}. Line ${entry.lineNumber}: ${entry.county} - (${entry.latitude}, ${entry.longitude})`);
    });
  });
  if (potentialDuplicates.length > 20) {
    console.log(`\n   ... and ${potentialDuplicates.length - 20} more`);
  }
}

// Save results to file
const results = {
  totalCities: cities.length,
  exactDuplicates: exactDuplicates.length,
  similarDuplicates: similarDuplicates.length,
  potentialDuplicates: potentialDuplicates.length,
  exactDuplicateList: exactDuplicates,
  similarDuplicateList: similarDuplicates.slice(0, 50),
  potentialDuplicateList: potentialDuplicates.slice(0, 50)
};

const outputPath = path.join(__dirname, '..', 'data', 'duplicate-cities-report.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

console.log('\n✅ Results saved to: data/duplicate-cities-report.json');
console.log(`\n📊 Summary:`);
console.log(`   Total cities: ${cities.length}`);
console.log(`   Exact duplicates: ${exactDuplicates.length}`);
console.log(`   Similar duplicates: ${similarDuplicates.length}`);
console.log(`   Potential duplicates: ${potentialDuplicates.length}`);

