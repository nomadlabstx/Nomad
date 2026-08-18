#!/usr/bin/env node

/**
 * Calculate API Costs for Populating Texas Exit Data
 */

const fs = require('fs');
const path = require('path');

const EXITS_FILE = path.join(__dirname, '../data/texas-highway-exits-integrated.ts');

function parseExitData() {
  const content = fs.readFileSync(EXITS_FILE, 'utf8');
  const exits = new Map();

  const exportRegex = /export const (\w+_EXITS):\s*Omit<ExplorerHighwayExit[^>]+>\[\]\s*=\s*\[([\s\S]*?)\];/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    const highwayKey = match[1];
    const exitsArray = match[2];

    const exitRegex = /\{\s*exitNumber:\s*['"]([^'"]+)['"],[\s\S]*?description:\s*['"]([^'"]+)['"],[\s\S]*?latitude:\s*([\d.]+),[\s\S]*?longitude:\s*([\d.]+)[\s\S]*?milepointStart:\s*([\d.]+),[\s\S]*?milepointEnd:\s*([\d.]+)[\s\S]*?\}/g;
    const highwayExits = [];
    let exitMatch;

    while ((exitMatch = exitRegex.exec(exitsArray)) !== null) {
      highwayExits.push({
        exitNumber: exitMatch[1],
        description: exitMatch[2],
      });
    }

    exits.set(highwayKey, highwayExits);
  }

  return exits;
}

console.log('💰 Calculating API Costs for Texas Exit Data Population');
console.log('='.repeat(70));
console.log('');

const exitData = parseExitData();
const totalHighways = exitData.size;
const totalExits = Array.from(exitData.values()).reduce((sum, exits) => sum + exits.length, 0);

// Count exits that need geocoding (generic descriptions)
let exitsNeedingGeocoding = 0;
exitData.forEach((exits) => {
  exits.forEach(exit => {
    if (exit.description === `Exit ${exit.exitNumber}` || exit.description.trim() === '') {
      exitsNeedingGeocoding++;
    }
  });
});

console.log('📊 Usage Estimates:\n');
console.log(`   • Total highways: ${totalHighways}`);
console.log(`   • Total exits: ${totalExits}`);
console.log(`   • Exits needing geocoding: ${exitsNeedingGeocoding}`);
console.log('');

// API Pricing (as of 2024/2025)
// Directions API: $5.00 per 1,000 requests (first 10,000 free/month)
// Geocoding API: $5.00 per 1,000 requests (first 10,000 free/month)

const DIRECTIONS_API_COST_PER_1K = 5.00;
const GEOCODING_API_COST_PER_1K = 5.00;
const FREE_MONTHLY_LIMIT = 10000; // Per API

console.log('💵 API Costs:\n');

// Directions API costs
const directionsRequests = totalHighways;
const directionsOverFree = Math.max(0, directionsRequests - FREE_MONTHLY_LIMIT);
const directionsCost = (directionsOverFree / 1000) * DIRECTIONS_API_COST_PER_1K;

console.log(`   Directions API:`);
console.log(`      • Requests: ${directionsRequests} (1 per highway)`);
console.log(`      • Free tier: ${Math.min(directionsRequests, FREE_MONTHLY_LIMIT)} requests`);
console.log(`      • Over limit: ${directionsOverFree} requests`);
console.log(`      • Cost: $${directionsCost.toFixed(2)}`);
console.log('');

// Geocoding API costs
const geocodingRequests = exitsNeedingGeocoding;
const geocodingOverFree = Math.max(0, geocodingRequests - FREE_MONTHLY_LIMIT);
const geocodingCost = (geocodingOverFree / 1000) * GEOCODING_API_COST_PER_1K;

console.log(`   Geocoding API:`);
console.log(`      • Requests: ${geocodingRequests} (reverse geocode exits)`);
console.log(`      • Free tier: ${Math.min(geocodingRequests, FREE_MONTHLY_LIMIT)} requests`);
console.log(`      • Over limit: ${geocodingOverFree} requests`);
console.log(`      • Cost: $${geocodingCost.toFixed(2)}`);
console.log('');

// Total
const totalCost = directionsCost + geocodingCost;
const totalRequests = directionsRequests + geocodingRequests;
const totalFree = Math.min(directionsRequests, FREE_MONTHLY_LIMIT) + Math.min(geocodingRequests, FREE_MONTHLY_LIMIT);

console.log('='.repeat(70));
console.log(`\n💰 Total Estimated Cost: $${totalCost.toFixed(2)}`);
console.log(`   • Total API requests: ${totalRequests.toLocaleString()}`);
console.log(`   • Free tier usage: ${totalFree.toLocaleString()} requests`);
console.log(`   • Paid requests: ${(totalRequests - totalFree).toLocaleString()} requests`);
console.log('');

if (totalCost === 0) {
  console.log('✅ GREAT NEWS: All requests are within the free tier!');
  console.log('   No charges will apply.');
} else {
  console.log(`💡 Cost Breakdown:`);
  console.log(`   • Directions API: $${directionsCost.toFixed(2)}`);
  console.log(`   • Geocoding API: $${geocodingCost.toFixed(2)}`);
  console.log(`   • Total: $${totalCost.toFixed(2)}`);
}

console.log('\n📝 Notes:');
console.log('   • Google Maps Platform offers $200/month credit (if available)');
console.log('   • Free tier: 10,000 requests/month per API');
console.log('   • Pricing: $5.00 per 1,000 requests after free tier');
console.log('   • Costs are per month - if you spread across months, costs reduce');
console.log('\n💡 Cost-Saving Tips:');
console.log('   • Run in test mode first (--test flag) to verify');
console.log('   • Spread the work across multiple months to stay in free tier');
console.log('   • Only geocode exits that need it (script already does this)');
console.log('   • Consider using OSM data for some exits to reduce geocoding calls');

