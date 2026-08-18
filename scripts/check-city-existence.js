#!/usr/bin/env node

/**
 * Check which cities from the update list actually exist in the main file
 */

const fs = require('fs').promises;
const path = require('path');

const CITY_UPDATES = [
  'Washington', 'Baltimore', 'Marydel', 'Virginia Beach', 'Chesapeake', 'Norfolk', 'Richmond',
  'Newport News', 'Alexandria', 'Hampton', 'Suffolk', 'Roanoke', 'Portsmouth', 'Lynchburg',
  'Harrisonburg', 'Charlottesville', 'Manassas', 'Danville', 'Petersburg', 'Fredericksburg',
  'Winchester', 'Staunton', 'Salem', 'Fairfax', 'Waynesboro', 'Hopewell', 'Colonial Heights',
  'Radford', 'Bristol', 'Manassas Park', 'Williamsburg', 'Falls Church', 'Martinsville',
  'Poquoson', 'Lexington', 'Galax', 'Buena Vista', 'Covington', 'Emporia', 'Norton',
  'Lincoln', 'Grant', 'Fairfield', 'Union', 'St. Louis', 'Stamford', 'Carson', 'Tumwater',
  'Litchfield', 'Los Ranchos de Albuquerque', 'Utqiaġvik', 'Drew', 'Oceana', 'De Soto'
];

async function checkExistence() {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const content = await fs.readFile(filePath, 'utf8');
  
  const existing = [];
  const missing = [];
  
  for (const cityName of CITY_UPDATES) {
    // Search for the city name in the file
    const pattern = new RegExp(`name:\\s*['"]${cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'i');
    
    if (pattern.test(content)) {
      existing.push(cityName);
    } else {
      missing.push(cityName);
    }
  }
  
  console.log(`✅ Cities that exist in main file: ${existing.length}`);
  for (const city of existing) {
    console.log(`   - ${city}`);
  }
  
  console.log(`\n❌ Cities missing from main file: ${missing.length}`);
  for (const city of missing) {
    console.log(`   - ${city}`);
  }
  
  return { existing, missing };
}

checkExistence().catch(console.error);
