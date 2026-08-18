#!/usr/bin/env node

/**
 * Populate Texas Highway Exit Coordinates
 * 
 * This script:
 * 1. Reads exit data from texas-highway-exits-integrated.ts
 * 2. Uses milepost data to calculate approximate coordinates along highway routes
 * 3. Optionally uses Google Geocoding API to refine coordinates based on exit descriptions
 * 4. Outputs populated exit data with real coordinates
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const EXITS_FILE = path.join(__dirname, '../data/texas-highway-exits-integrated.ts');
const OUTPUT_FILE = path.join(__dirname, '../data/texas-highway-exits-populated.ts');
const PROGRESS_FILE = path.join(__dirname, '../data/texas-exits-geocoding-progress.json');

// Google Maps API key (optional - will use OSM if not available)
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Rate limiting
const GEOCODE_DELAY = 100; // ms between geocoding requests
let lastGeocodeTime = 0;

/**
 * Geocode an exit using OpenStreetMap Nominatim API (free, no key required)
 */
async function geocodeExitOSM(exitDescription, highwayName, milepost) {
  // Rate limiting (OSM requires max 1 request per second)
  const now = Date.now();
  const timeSinceLastRequest = now - lastGeocodeTime;
  if (timeSinceLastRequest < 1100) { // 1.1 seconds for safety
    await new Promise(resolve => setTimeout(resolve, 1100 - timeSinceLastRequest));
  }
  lastGeocodeTime = Date.now();

  // Build query: "Exit 123, I-10, Texas" or use description
  const query = exitDescription.includes('Exit') 
    ? `${exitDescription}, ${highwayName}, Texas, USA`
    : `Exit ${exitDescription}, ${highwayName}, Texas, USA`;

  return new Promise((resolve) => {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`;

    const options = {
      headers: {
        'User-Agent': 'NomadApp/1.0 (Texas Exit Data Collection)' // Required by OSM
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json) && json.length > 0) {
            const result = json[0];
            resolve({
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon),
              source: 'osm'
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Geocode an exit using Google Geocoding API (if available)
 */
async function geocodeExitGoogle(exitDescription, highwayName, milepost) {
  if (!GOOGLE_API_KEY) {
    return null;
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastGeocodeTime;
  if (timeSinceLastRequest < GEOCODE_DELAY) {
    await new Promise(resolve => setTimeout(resolve, GEOCODE_DELAY - timeSinceLastRequest));
  }
  lastGeocodeTime = Date.now();

  // Build query: "Exit 123, I-10, Texas" or use description
  const query = exitDescription.includes('Exit') 
    ? `${exitDescription}, ${highwayName}, Texas`
    : `Exit ${exitDescription}, ${highwayName}, Texas`;

  return new Promise((resolve) => {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${GOOGLE_API_KEY}`;

    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results && json.results.length > 0) {
            const location = json.results[0].geometry.location;
            resolve({
              latitude: location.lat,
              longitude: location.lng,
              source: 'google'
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Geocode an exit - tries Google first, then OSM
 */
async function geocodeExit(exitDescription, highwayName, milepost) {
  // Try Google first (more accurate, but requires API key)
  if (GOOGLE_API_KEY) {
    const googleResult = await geocodeExitGoogle(exitDescription, highwayName, milepost);
    if (googleResult) {
      return googleResult;
    }
  }

  // Fallback to OSM (free, but slower due to rate limiting)
  return await geocodeExitOSM(exitDescription, highwayName, milepost);
}

/**
 * Calculate approximate coordinates from milepost using highway route data
 * This is a fallback when geocoding fails
 */
function calculateCoordinatesFromMilepost(highwayNumber, highwayType, direction, milepost) {
  // This is a simplified approach - in reality, we'd need actual highway route data
  // For now, return null and rely on geocoding
  return null;
}

/**
 * Parse exit data from the integrated file
 */
function parseExitData() {
  const content = fs.readFileSync(EXITS_FILE, 'utf8');
  const exits = new Map();

  // Match all exit exports: export const I10_EAST_EXITS: ... = [...]
  const exportRegex = /export const (\w+_EXITS):\s*Omit<ExplorerHighwayExit[^>]+>\[\]\s*=\s*\[([\s\S]*?)\];/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    const highwayKey = match[1]; // e.g., "I10_EAST_EXITS"
    const exitsArray = match[2];

    // Parse individual exits
    const exitRegex = /\{\s*exitNumber:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"],\s*coordinates:\s*\{\s*latitude:\s*([\d.]+),\s*longitude:\s*([\d.]+)\s*\},\s*milepointStart:\s*([\d.]+),\s*milepointEnd:\s*([\d.]+)\s*\}/g;
    const highwayExits = [];
    let exitMatch;

    while ((exitMatch = exitRegex.exec(exitsArray)) !== null) {
      highwayExits.push({
        exitNumber: exitMatch[1],
        description: exitMatch[2],
        coordinates: {
          latitude: parseFloat(exitMatch[3]),
          longitude: parseFloat(exitMatch[4])
        },
        milepointStart: parseFloat(exitMatch[5]),
        milepointEnd: parseFloat(exitMatch[6])
      });
    }

    exits.set(highwayKey, highwayExits);
  }

  return exits;
}

/**
 * Get highway name from exit export key
 */
function getHighwayNameFromKey(key) {
  // I10_EAST_EXITS -> "Interstate 10 East"
  // I35E_NORTH_EXITS -> "Interstate 35E North"
  // US59_EAST_EXITS -> "US Highway 59 East"
  
  const match = key.match(/^(I|US|SH|FM|RR)(\d+[EW]?)(?:_(EAST|WEST|NORTH|SOUTH))?_EXITS$/);
  if (!match) return null;

  const [, prefix, number, direction] = match;
  
  let highwayName = '';
  if (prefix === 'I') {
    highwayName = `Interstate ${number}`;
  } else if (prefix === 'US') {
    highwayName = `US Highway ${number}`;
  } else if (prefix === 'SH') {
    highwayName = `Texas State Highway ${number}`;
  } else if (prefix === 'FM') {
    highwayName = `Farm to Market Road ${number}`;
  } else if (prefix === 'RR') {
    highwayName = `Ranch Road ${number}`;
  }

  if (direction) {
    highwayName += ` ${direction.charAt(0) + direction.slice(1).toLowerCase()}`;
  }

  return highwayName;
}

/**
 * Main function to populate exit coordinates
 */
async function populateExitCoordinates() {
  console.log('🛣️  Populating Texas Highway Exit Coordinates');
  console.log('='.repeat(70));

  // Load progress if exists
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch (e) {
      console.warn('   ⚠️  Could not load progress file, starting fresh');
    }
  }

  // Parse exit data
  console.log('\n📖 Reading exit data...');
  const exitData = parseExitData();
  console.log(`   ✓ Found ${exitData.size} highways with exit data`);

  // Count total exits
  let totalExits = 0;
  let exitsNeedingCoordinates = 0;
  exitData.forEach((exits) => {
    totalExits += exits.length;
    exitsNeedingCoordinates += exits.filter(e => 
      e.coordinates.latitude === 0 && e.coordinates.longitude === 0
    ).length;
  });

  console.log(`   ✓ Total exits: ${totalExits}`);
  console.log(`   ✓ Exits needing coordinates: ${exitsNeedingCoordinates}`);

  if (exitsNeedingCoordinates === 0) {
    console.log('\n✅ All exits already have coordinates!');
    return;
  }

  if (!GOOGLE_API_KEY) {
    console.log('\n⚠️  No Google Maps API key found. Set GOOGLE_MAPS_API_KEY environment variable.');
    console.log('   Will use OpenStreetMap Nominatim API (free, but slower due to rate limiting).');
  } else {
    console.log('\n✓ Using Google Maps API for geocoding (with OSM fallback).');
  }

  // Process each highway
  let processedCount = 0;
  let geocodedCount = 0;
  let failedCount = 0;

  for (const [highwayKey, exits] of exitData.entries()) {
    const highwayName = getHighwayNameFromKey(highwayKey);
    if (!highwayName) {
      console.log(`\n   ⚠️  Skipping ${highwayKey} (unknown format)`);
      continue;
    }

    console.log(`\n🛣️  Processing ${highwayName} (${exits.length} exits)...`);

    // Check if already processed
    if (progress[highwayKey] && progress[highwayKey].completed) {
      console.log(`   ⏭️  Already processed, skipping`);
      continue;
    }

    const highwayProgress = progress[highwayKey] || { processed: 0, geocoded: 0, failed: 0 };

    for (let i = 0; i < exits.length; i++) {
      const exit = exits[i];
      
      // Skip if already has coordinates
      if (exit.coordinates.latitude !== 0 || exit.coordinates.longitude !== 0) {
        continue;
      }

      // Try geocoding
      const geocoded = await geocodeExit(
        exit.description,
        highwayName,
        exit.milepointStart
      );

      if (geocoded) {
        exit.coordinates = {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude
        };
        geocodedCount++;
        highwayProgress.geocoded++;
      } else {
        // Fallback: use milepost calculation (placeholder for now)
        // In a real implementation, we'd use actual highway route data
        failedCount++;
        highwayProgress.failed++;
        console.warn(`   ⚠️  Could not geocode Exit ${exit.exitNumber} (${exit.description})`);
      }

      processedCount++;
      highwayProgress.processed++;

      // Save progress every 10 exits
      if (processedCount % 10 === 0) {
        progress[highwayKey] = highwayProgress;
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      }
    }

    // Mark highway as completed
    progress[highwayKey] = { ...highwayProgress, completed: true };
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

    console.log(`   ✓ Processed ${highwayProgress.processed} exits (${highwayProgress.geocoded} geocoded, ${highwayProgress.failed} failed)`);
  }

  // Generate output file
  console.log('\n📝 Generating output file...');
  generateOutputFile(exitData);

  console.log('\n✅ Done!');
  console.log(`   • Total processed: ${processedCount}`);
  console.log(`   • Geocoded: ${geocodedCount}`);
  console.log(`   • Failed: ${failedCount}`);
  console.log(`   • Output: ${OUTPUT_FILE}`);
}

/**
 * Generate the output TypeScript file with populated coordinates
 */
function generateOutputFile(exitData) {
  let output = `/**
 * Texas Highway Exit Data - Populated
 * Generated from texas-highway-exits-integrated.ts
 * Maps exits to highways in texas-highways-complete.ts
 * 
 * Generated: ${new Date().toISOString()}
 */

import type { ExplorerHighwayExit } from '../types/explorer';


`;

  // Generate exports for each highway
  for (const [highwayKey, exits] of exitData.entries()) {
    const highwayName = getHighwayNameFromKey(highwayKey);
    output += `/**
 * ${highwayName} Exits
 * Total: ${exits.length} exits
 */
export const ${highwayKey}: Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] = [\n`;

    for (const exit of exits) {
      output += `  {\n`;
      output += `    exitNumber: '${exit.exitNumber}',\n`;
      output += `    description: '${exit.description.replace(/'/g, "\\'")}',\n`;
      output += `    coordinates: { latitude: ${exit.coordinates.latitude}, longitude: ${exit.coordinates.longitude} },\n`;
      output += `    milepointStart: ${exit.milepointStart},\n`;
      output += `    milepointEnd: ${exit.milepointEnd},\n`;
      output += `  },\n`;
    }

    output += `];\n\n`;
  }

  // Add summary
  let totalExits = 0;
  let exitsWithCoordinates = 0;
  exitData.forEach((exits) => {
    totalExits += exits.length;
    exitsWithCoordinates += exits.filter(e => 
      e.coordinates.latitude !== 0 || e.coordinates.longitude !== 0
    ).length;
  });

  output += `/**
 * Summary:
 * Total exits: ${totalExits}
 * Exits with coordinates: ${exitsWithCoordinates}
 * Coverage: ${((exitsWithCoordinates / totalExits) * 100).toFixed(1)}%
 */
`;

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`   ✓ Generated ${OUTPUT_FILE}`);
}

// Run the script
if (require.main === module) {
  populateExitCoordinates().catch(console.error);
}

module.exports = { populateExitCoordinates };

