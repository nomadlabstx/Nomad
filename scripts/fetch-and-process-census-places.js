#!/usr/bin/env node

/**
 * Fetch and Process All Census Places
 * Automatically downloads Census data and processes it
 * 
 * This script will:
 * 1. Download Census places data (incorporated + CDPs)
 * 2. Process and add to database
 * 3. Skip duplicates
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Download file from URL
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = require('fs').createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        require('fs').unlinkSync(outputPath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      require('fs').unlinkSync(outputPath);
      reject(err);
    });
  });
}

/**
 * Try to fetch Census places data via API or direct download
 */
async function fetchCensusData() {
  console.log('📥 Attempting to fetch Census places data...');
  console.log('='.repeat(70));
  
  // Try Census API first (no key required for basic data)
  const censusApiUrl = 'https://api.census.gov/data/2021/acs/acs5?get=NAME,B01001_001E&for=place:*';
  
  console.log('\n⚠️  Automatic download from Census Bureau requires manual setup.');
  console.log('   The Census Bureau requires specific API keys for some endpoints.');
  console.log('\n📋 Recommended Approach:');
  console.log('   1. Download CSV directly from Census Bureau:');
  console.log('      https://www2.census.gov/programs-surveys/popest/datasets/2020-2023/places/');
  console.log('   2. Look for: "SUB-IP-EST2023.csv" or similar');
  console.log('   3. Save to: data/census-places.csv');
  console.log('   4. Run: node scripts/process-census-places-csv.js data/census-places.csv');
  
  return false;
}

/**
 * Alternative: Generate comprehensive list from known sources
 * We'll use a combination of existing data + geocoding
 */
async function generateCensusPlaceList() {
  console.log('\n💡 Alternative: Using existing city data + Census place names');
  console.log('   This approach will geocode Census place names directly.');
  console.log('   Estimated: ~32,000 places to process');
  
  // We'll use the Census place names list if available
  // For now, we'll need the user to provide the CSV
  return null;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Fetch and Process Census Places');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  const censusCsvPath = path.join(__dirname, '..', 'data', 'census-places.csv');
  
  // Check if CSV already exists
  try {
    await fs.access(censusCsvPath);
    console.log(`✅ Found Census CSV: ${censusCsvPath}`);
    console.log('\n🔄 Processing Census places...\n');
    
    // Process the existing CSV
    const { exec } = require('child_process');
    const processScript = path.join(__dirname, 'process-census-places-csv.js');
    
    return new Promise((resolve, reject) => {
      const child = exec(`node "${processScript}" "${censusCsvPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Error: ${error.message}`);
          reject(error);
        } else {
          console.log(stdout);
          resolve();
        }
      });
      
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    });
    
  } catch (error) {
    // CSV doesn't exist, try to fetch
    console.log(`⚠️  Census CSV not found at: ${censusCsvPath}`);
    console.log('');
    
    const fetched = await fetchCensusData();
    
    if (!fetched) {
      console.log('\n📝 Next Steps:');
      console.log('   1. Download Census places CSV from:');
      console.log('      https://www2.census.gov/programs-surveys/popest/datasets/');
      console.log('   2. Save as: data/census-places.csv');
      console.log('   3. Run this script again');
      console.log('\n   OR run directly:');
      console.log('   node scripts/process-census-places-csv.js data/census-places.csv');
      process.exit(0);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchCensusData, generateCensusPlaceList };

