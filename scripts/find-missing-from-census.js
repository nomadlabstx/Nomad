#!/usr/bin/env node

/**
 * Find cities from Census data that are missing from our database
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const censusPath = path.join(__dirname, '..', 'data', 'us-cities-census.ts');

console.log('🔍 Finding Missing Cities from Census Data');
console.log('='.repeat(70));

// Load database
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Extract cities from database
const dbCities = new Set();

dbLines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].toLowerCase()}|${stateCodeMatch[1]}`;
      dbCities.add(key);
    }
  }
});

console.log(`\n📊 Found ${dbCities.size} cities in database`);

// Load Census data
const censusContent = fs.readFileSync(censusPath, 'utf8');
const censusLines = censusContent.split('\n');

// Extract cities from Census data
const censusCities = [];
let currentCity = null;

censusLines.forEach(line => {
  // Look for city entries
  if (line.includes('name:') && line.includes('stateCode:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    const latMatch = line.match(/latitude:\s*([0-9.-]+)/);
    const lngMatch = line.match(/longitude:\s*([0-9.-]+)/);
    const stateMatch = line.match(/state:\s*['"]([^'"]+)['"]/);
    const popMatch = line.match(/population:\s*([0-9]+)/);
    
    if (nameMatch && stateCodeMatch) {
      currentCity = {
        name: nameMatch[1],
        stateCode: stateCodeMatch[1],
        state: stateMatch ? stateMatch[1] : '',
        latitude: latMatch ? parseFloat(latMatch[1]) : null,
        longitude: lngMatch ? parseFloat(lngMatch[1]) : null,
        population: popMatch ? parseInt(popMatch[1]) : null
      };
      
      const key = `${currentCity.name.toLowerCase()}|${currentCity.stateCode}`;
      
      if (!dbCities.has(key)) {
        censusCities.push(currentCity);
      }
    }
  }
});

console.log(`\n📊 Found ${censusCities.length} cities in Census data missing from database`);

// Group by state
const byState = new Map();
censusCities.forEach(city => {
  if (!byState.has(city.stateCode)) {
    byState.set(city.stateCode, []);
  }
  byState.get(city.stateCode).push(city);
});

console.log(`\n📊 Missing cities by state:`);
const sortedStates = Array.from(byState.entries()).sort((a, b) => b[1].length - a[1].length);
sortedStates.forEach(([state, cities]) => {
  console.log(`   ${state}: ${cities.length} missing`);
});

// Save missing cities
const outputPath = path.join(__dirname, '..', 'data', 'missing-from-census.json');
fs.writeFileSync(outputPath, JSON.stringify(censusCities, null, 2));

console.log(`\n✅ Saved ${censusCities.length} missing cities to: data/missing-from-census.json`);

// Show first 20
console.log(`\n📋 First 20 missing cities from Census data:`);
censusCities.slice(0, 20).forEach((city, i) => {
  console.log(`   ${i + 1}. ${city.name}, ${city.stateCode} (pop: ${city.population || 'N/A'})`);
});

if (censusCities.length > 20) {
  console.log(`   ... and ${censusCities.length - 20} more`);
}

