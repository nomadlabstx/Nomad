#!/usr/bin/env node

/**
 * Geocode and Add Extracted TIGER Places
 * Processes the extracted places JSON and adds them to the database
 * 
 * Usage: node scripts/geocode-extracted-places.js
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Use the robust add function from fix-failed-cities-robust.js
const { addCityRobust } = require('./fix-failed-cities-robust.js');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const DELAY_MS = 100;
const BATCH_SIZE = 50;
const PROGRESS_FILE = path.join(__dirname, '..', 'data', 'geocoding-progress.json');
const NEW_PLACES_FILE = path.join(__dirname, '..', 'data', 'new-places-to-process.json');

/**
 * Geocode a place
 */
async function geocodePlace(place) {
  const query = `${place.name}, ${place.stateCode}`;
  const url = `/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve) => {
    const request = https.request({
      hostname: 'maps.googleapis.com',
      path: url,
      method: 'GET',
      timeout: 10000
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.status === 'OK' && jsonData.results.length > 0) {
            const result = jsonData.results[0];
            const location = result.geometry.location;
            
            let county = null;
            for (const component of result.address_components) {
              if (component.types.includes('administrative_area_level_2')) {
                county = component.long_name;
                if (!county.toLowerCase().includes('county') && 
                    !county.toLowerCase().includes('borough') && 
                    !county.toLowerCase().includes('parish')) {
                  county = `${county} County`;
                }
                break;
              }
            }
            
            resolve({
              name: place.name,
              state: place.stateCode,
              stateCode: place.stateCode,
              county: county || 'Unknown County',
              latitude: location.lat,
              longitude: location.lng,
              population: 50000,
              size: getSize(50000),
              confidence: 'medium',
              type: place.type
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    
    request.on('error', () => resolve(null));
    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
    
    request.end();
  });
}

function getSize(pop) {
  if (pop > 1000000) return 'major';
  if (pop > 250000) return 'medium';
  if (pop > 50000) return 'small';
  return 'village';
}

/**
 * Check if city already exists
 */
async function cityExists(cityName, stateCode) {
  const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');
  const content = await fs.readFile(filePath, 'utf8');
  
  const key = `${cityName.toLowerCase().trim()}|${stateCode.toUpperCase()}`;
  const pattern = new RegExp(`name:\\s*['"]([^'"]+)['"][^}]*stateCode:\\s*['"]${stateCode}['"]`, 'gi');
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    if (match[1].toLowerCase().trim() === cityName.toLowerCase().trim()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('🗺️  Geocoding and Adding TIGER Places');
  console.log('='.repeat(70));
  
  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found!');
    process.exit(1);
  }
  
  // Load extracted places
  const extractedPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
  
  let places = [];
  try {
    const data = JSON.parse(await fs.readFile(extractedPath, 'utf8'));
    places = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`❌ Could not load extracted places: ${error.message}`);
    console.log('   Run: node scripts/process-tiger-places.js first');
    process.exit(1);
  }
  
  console.log(`\n📊 Loaded ${places.length} places from extraction`);
  
  // Check for duplicates
  console.log('\n🔍 Checking for duplicates...');
  const newPlaces = [];
  let checked = 0;
  
  for (const place of places) {
    checked++;
    if (checked % 100 === 0) {
      process.stdout.write(`\r   Checked ${checked}/${places.length}...`);
    }
    
    const exists = await cityExists(place.name, place.stateCode);
    if (!exists) {
      newPlaces.push(place);
    }
  }
  
  console.log(`\n   Total places: ${places.length}`);
  console.log(`   Already in database: ${places.length - newPlaces.length}`);
  console.log(`   New places to add: ${newPlaces.length}`);
  
  if (newPlaces.length === 0) {
    console.log('\n✅ All places already in database!');
    return;
  }
  
  // Save new places list for resume capability
  await fs.writeFile(NEW_PLACES_FILE, JSON.stringify(newPlaces, null, 2));
  console.log(`\n💾 Saved ${newPlaces.length} new places to process (resume file: ${NEW_PLACES_FILE})`);
  
  // Load progress if resuming
  let progress = { lastBatch: 0, lastPlaceIndex: 0, stats: { geocoded: 0, added: 0, failed: 0 } };
  try {
    const progressData = await fs.readFile(PROGRESS_FILE, 'utf8');
    const savedProgress = JSON.parse(progressData);
    if (savedProgress && savedProgress.lastBatch !== undefined) {
      progress = {
        lastBatch: savedProgress.lastBatch || 0,
        lastPlaceIndex: savedProgress.lastPlaceIndex || 0,
        stats: savedProgress.stats || { geocoded: 0, added: 0, failed: 0 }
      };
      console.log(`\n🔄 Resuming from batch ${progress.lastBatch + 1}, place ${progress.lastPlaceIndex + 1}`);
      console.log(`   Previous progress: ${progress.stats.added} added, ${progress.stats.failed} failed`);
    } else {
      console.log('\n▶️  Starting fresh processing...');
    }
  } catch (e) {
    // No progress file, starting fresh
    console.log('\n▶️  Starting fresh processing...');
  }
  
  // Process in batches
  const stats = { ...progress.stats };
  const batches = [];
  
  for (let i = 0; i < newPlaces.length; i += BATCH_SIZE) {
    batches.push(newPlaces.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`\n📦 Processing ${newPlaces.length} places in ${batches.length} batches...\n`);
  
  // Handle graceful shutdown
  let shutdown = false;
  const saveProgress = async () => {
    await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  };
  
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Interrupt received. Saving progress...');
    shutdown = true;
    await saveProgress();
    console.log(`✅ Progress saved. Resume from batch ${progress.lastBatch + 1}`);
    console.log(`   Run the script again to continue where you left off.`);
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n\n⚠️  Termination signal received. Saving progress...');
    shutdown = true;
    await saveProgress();
    console.log(`✅ Progress saved. Resume from batch ${progress.lastBatch + 1}`);
    process.exit(0);
  });
  
  for (let batchNum = progress.lastBatch; batchNum < batches.length; batchNum++) {
    if (shutdown) break;
    
    const batch = batches[batchNum];
    console.log(`\n📦 Batch ${batchNum + 1}/${batches.length} (${batch.length} places)...`);
    
    const startIndex = batchNum === progress.lastBatch ? progress.lastPlaceIndex : 0;
    
    for (let i = startIndex; i < batch.length; i++) {
      if (shutdown) break;
      const place = batch[i];
      const progressMsg = `[${i + 1}/${batch.length}]`;
      
      try {
        const geocoded = await geocodePlace(place);
        if (geocoded) {
          stats.geocoded++;
          process.stdout.write(`${progressMsg} Geocoding ${place.name}, ${place.stateCode}...`);
          
          const added = await addCityRobust(geocoded);
          if (added) {
            stats.added++;
            console.log(` ✅ Added`);
          } else {
            stats.failed++;
            console.log(` ⚠️  Failed to add`);
          }
        } else {
          stats.failed++;
          console.log(`${progressMsg} ❌ ${place.name}, ${place.stateCode} - Geocoding failed`);
        }
        
        // Save progress after each place (in case of interruption)
        progress.lastPlaceIndex = i + 1;
        progress.stats = { ...stats };
        if (i % 10 === 0) { // Save every 10 places to avoid too much I/O
          await saveProgress();
        }
        
        if (i < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        stats.failed++;
        console.log(`${progressMsg} ❌ ${place.name}, ${place.stateCode} - Error: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Batch ${batchNum + 1} complete:`);
    console.log(`   Geocoded: ${stats.geocoded}`);
    console.log(`   Added: ${stats.added}`);
    console.log(`   Failed: ${stats.failed}`);
    
    // Update and save progress after each batch
    progress.lastBatch = batchNum + 1;
    progress.lastPlaceIndex = 0;
    progress.stats = { ...stats };
    await saveProgress();
    
    if (batchNum < batches.length - 1 && !shutdown) {
      console.log(`⏸️  Pausing 2 seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Clean up progress file on successful completion
  if (!shutdown) {
    try {
      await fs.unlink(PROGRESS_FILE);
      await fs.unlink(NEW_PLACES_FILE);
    } catch (e) {
      // Ignore if files don't exist
    }
  }
  
  console.log('\n✅ Processing Complete!');
  console.log('='.repeat(70));
  console.log(`\n📊 Final Statistics:`);
  console.log(`   Total processed: ${newPlaces.length}`);
  console.log(`   Successfully geocoded: ${stats.geocoded}`);
  console.log(`   Successfully added: ${stats.added}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Success rate: ${((stats.added / newPlaces.length) * 100).toFixed(1)}%`);
}

if (require.main === module) {
  main().catch(console.error);
}

