#!/usr/bin/env node

/**
 * Combined Script: Populate Exit Coordinates and Scrape Exit Signs
 * 
 * This script runs both processes:
 * 1. Populates exit coordinates using highway route polylines
 * 2. Scrapes exit sign data from OSM and Google Places
 * 
 * Can run both steps sequentially or in parallel mode
 */

const { spawn } = require('child_process');
const path = require('path');

const POPULATE_SCRIPT = path.join(__dirname, 'populate-texas-exits-fast.js');
const SCRAPE_SCRIPT = path.join(__dirname, 'scrape-texas-exit-signs.js');

const PARALLEL_MODE = process.argv.includes('--parallel');
const TEST_MODE = process.argv.includes('--test');

console.log('🛣️  Combined Exit Data Population & Scraping');
console.log('='.repeat(70));
console.log(`Mode: ${PARALLEL_MODE ? 'PARALLEL' : 'SEQUENTIAL'}`);
if (TEST_MODE) {
  console.log('🧪 TEST MODE: Processing small subset only');
}
console.log('');

if (PARALLEL_MODE) {
  console.log('⚡ Running both scripts in parallel...\n');
  
  // Run both scripts simultaneously
  const populateProcess = spawn('node', [POPULATE_SCRIPT, ...(TEST_MODE ? ['--test'] : [])], {
    stdio: 'inherit',
    shell: true
  });
  
  const scrapeProcess = spawn('node', [SCRAPE_SCRIPT], {
    stdio: 'inherit',
    shell: true
  });
  
  let populateDone = false;
  let scrapeDone = false;
  
  populateProcess.on('close', (code) => {
    populateDone = true;
    if (code === 0) {
      console.log('\n✅ Populate script completed successfully');
    } else {
      console.log(`\n⚠️  Populate script exited with code ${code}`);
    }
    if (scrapeDone) {
      console.log('\n✅ Both scripts completed!');
      process.exit(0);
    }
  });
  
  scrapeProcess.on('close', (code) => {
    scrapeDone = true;
    if (code === 0) {
      console.log('\n✅ Scrape script completed successfully');
    } else {
      console.log(`\n⚠️  Scrape script exited with code ${code}`);
    }
    if (populateDone) {
      console.log('\n✅ Both scripts completed!');
      process.exit(0);
    }
  });
  
  // Handle errors
  populateProcess.on('error', (error) => {
    console.error('❌ Error running populate script:', error);
    process.exit(1);
  });
  
  scrapeProcess.on('error', (error) => {
    console.error('❌ Error running scrape script:', error);
    process.exit(1);
  });
  
} else {
  // Sequential mode: run populate first, then scrape
  console.log('📋 Running scripts sequentially...\n');
  console.log('Step 1: Populating exit coordinates...\n');
  
  const populateProcess = spawn('node', [POPULATE_SCRIPT, ...(TEST_MODE ? ['--test'] : [])], {
    stdio: 'inherit',
    shell: true
  });
  
  populateProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Populate script failed with code ${code}`);
      process.exit(code);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('Step 2: Scraping exit sign data...\n');
    
    const scrapeProcess = spawn('node', [SCRAPE_SCRIPT], {
      stdio: 'inherit',
      shell: true
    });
    
    scrapeProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Both scripts completed successfully!');
      } else {
        console.error(`\n⚠️  Scrape script exited with code ${code}`);
      }
      process.exit(code);
    });
    
    scrapeProcess.on('error', (error) => {
      console.error('❌ Error running scrape script:', error);
      process.exit(1);
    });
  });
  
  populateProcess.on('error', (error) => {
    console.error('❌ Error running populate script:', error);
    process.exit(1);
  });
}

