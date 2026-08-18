#!/usr/bin/env node

/**
 * Extract Cities with Missing County Data
 * Generates a list of cities that need county information
 */

const fs = require('fs').promises;
const path = require('path');

async function extractMissingCounties() {
  try {
    const progressFile = path.join(__dirname, '..', 'data', 'us-county-progress.json');
    const content = await fs.readFile(progressFile, 'utf8');
    const data = JSON.parse(content);
    
    // Filter cities with null county
    const citiesWithoutCounties = data.processed.filter(city => city.county === null);
    
    console.log(`Found ${citiesWithoutCounties.length} cities without county data:`);
    console.log('=====================================');
    
    // Group by state for easier processing
    const byState = {};
    citiesWithoutCounties.forEach(city => {
      if (!byState[city.state]) {
        byState[city.state] = [];
      }
      byState[city.state].push(city);
    });
    
    // Output organized by state
    for (const [state, cities] of Object.entries(byState)) {
      console.log(`\n${state} (${cities.length} cities):`);
      cities.forEach(city => {
        console.log(`  - ${city.name} (${city.stateCode}) - Lat: ${city.latitude}, Lng: ${city.longitude}`);
      });
    }
    
    // Generate CSV format for easy data entry
    console.log('\n\nCSV Format for Data Entry:');
    console.log('City Name,State,State Code,County,Latitude,Longitude');
    citiesWithoutCounties.forEach(city => {
      console.log(`"${city.name}","${city.state}","${city.stateCode}","","${city.latitude}","${city.longitude}"`);
    });
    
    // Generate JSON format for bulk update
    const jsonOutput = {
      totalCities: citiesWithoutCounties.length,
      cities: citiesWithoutCounties.map(city => ({
        name: city.name,
        state: city.state,
        stateCode: city.stateCode,
        latitude: city.latitude,
        longitude: city.longitude,
        county: null // To be filled in
      }))
    };
    
    const outputFile = path.join(__dirname, '..', 'data', 'missing-counties.json');
    await fs.writeFile(outputFile, JSON.stringify(jsonOutput, null, 2));
    
    console.log(`\n\n📄 JSON data saved to: ${outputFile}`);
    console.log('📊 Summary:');
    console.log(`   Total cities missing counties: ${citiesWithoutCounties.length}`);
    console.log(`   States affected: ${Object.keys(byState).length}`);
    
    // Show state breakdown
    console.log('\nState Breakdown:');
    Object.entries(byState)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([state, cities]) => {
        console.log(`   ${state}: ${cities.length} cities`);
      });
    
  } catch (error) {
    console.error('Error extracting missing counties:', error.message);
  }
}

extractMissingCounties();
