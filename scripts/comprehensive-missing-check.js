#!/usr/bin/env node

/**
 * Comprehensive check for missing places
 * Compares all available data sources against database
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Missing Places Check');
console.log('='.repeat(70));

// Load database
const dbPath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
const dbContent = fs.readFileSync(dbPath, 'utf8');
const dbLines = dbContent.split('\n');

// Extract all cities from database
const dbCities = new Set();
const dbCitiesMap = new Map();

dbLines.forEach(line => {
  if (line.includes('name:') && line.includes('stateCode:') && line.includes('latitude:')) {
    const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
    const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
    
    if (nameMatch && stateCodeMatch) {
      const key = `${nameMatch[1].toLowerCase().trim()}|${stateCodeMatch[1]}`;
      dbCities.add(key);
      dbCitiesMap.set(key, { name: nameMatch[1], stateCode: stateCodeMatch[1] });
    }
  }
});

console.log(`\n📊 Database: ${dbCities.size} unique cities`);

// Check extracted TIGER places
const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
let extractedPlaces = [];
try {
  extractedPlaces = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
  console.log(`📊 TIGER extraction: ${extractedPlaces.length} places`);
  
  const missingFromTiger = [];
  extractedPlaces.forEach(place => {
    const key = `${place.name.toLowerCase().trim()}|${place.stateCode}`;
    if (!dbCities.has(key)) {
      missingFromTiger.push(place);
    }
  });
  
  console.log(`   Missing from database: ${missingFromTiger.length}`);
  
  if (missingFromTiger.length > 0 && missingFromTiger.length <= 50) {
    console.log(`\n   First 10 missing:`);
    missingFromTiger.slice(0, 10).forEach((p, i) => {
      console.log(`     ${i + 1}. ${p.name}, ${p.stateCode}`);
    });
  }
} catch (e) {
  console.log(`   ⚠️  Could not load TIGER extraction: ${e.message}`);
}

// Check Census data
const censusPath = path.join(__dirname, '..', 'data', 'us-cities-census.ts');
let censusCount = 0;
let missingFromCensus = 0;
try {
  const censusContent = fs.readFileSync(censusPath, 'utf8');
  const censusLines = censusContent.split('\n');
  
  censusLines.forEach(line => {
    if (line.includes('name:') && line.includes('stateCode:')) {
      const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
      const stateCodeMatch = line.match(/stateCode:\s*['"]([^'"]+)['"]/);
      
      if (nameMatch && stateCodeMatch) {
        censusCount++;
        const key = `${nameMatch[1].toLowerCase().trim()}|${stateCodeMatch[1]}`;
        if (!dbCities.has(key)) {
          missingFromCensus++;
        }
      }
    }
  });
  
  console.log(`\n📊 Census data: ${censusCount} cities`);
  console.log(`   Missing from database: ${missingFromCensus}`);
} catch (e) {
  console.log(`   ⚠️  Could not load Census data: ${e.message}`);
}

// Summary
console.log(`\n📊 Summary:`);
console.log(`   Current database: ${dbCities.size} cities`);
console.log(`   Target: 32,188 cities`);
console.log(`   Still needed: ${32188 - dbCities.size} cities`);

// Check for potential issues
console.log(`\n🔍 Potential Issues:`);

// Check for cities with "Unknown County"
const unknownCount = (dbContent.match(/county:\s*['"]Unknown County['"]/g) || []).length;
if (unknownCount > 0) {
  console.log(`   ⚠️  ${unknownCount} cities with "Unknown County"`);
}

// Check for encoding issues
const encodingIssues = (dbContent.match(/Ã±|Ã¡|Ã©|Ã­|Ã³|Ãº|Ã¼|Ã§|Ã‰|Ì‡/g) || []).length;
if (encodingIssues > 0) {
  console.log(`   ⚠️  ${encodingIssues} potential encoding issues found`);
}

console.log(`\n✅ Analysis complete!`);

