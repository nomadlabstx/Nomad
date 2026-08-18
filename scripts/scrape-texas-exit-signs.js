#!/usr/bin/env node

/**
 * Scrape Texas Highway Exit Sign Data
 * 
 * This script scrapes exit sign data from multiple sources:
 * 1. OpenStreetMap Overpass API (motorway_junction nodes)
 * 2. Google Places API (nearby search at exit coordinates)
 * 3. State DOT websites (if available)
 * 
 * Output: JSON file with exit sign descriptions matching highway sign format
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_FILE = path.join(__dirname, '../data/texas-exit-signs.json');
const PROGRESS_FILE = path.join(__dirname, '../data/texas-exit-signs-progress.json');
// Try populated file first, fallback to integrated file
const POPULATED_EXITS_FILE = path.join(__dirname, '../data/texas-highway-exits-populated.ts');
const INTEGRATED_EXITS_FILE = path.join(__dirname, '../data/texas-highway-exits-integrated.ts');

// Google Maps API key (optional - for Places API)
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Rate limiting
const OSM_DELAY = 1100; // OSM requires 1 request per second
const PLACES_DELAY = 200; // Google Places API
let lastOsmTime = 0;
let lastPlacesTime = 0;

// Texas bounding box
const TEXAS_BBOX = '25.8,-106.6,36.5,-93.5'; // south,west,north,east

/**
 * Query OpenStreetMap Overpass API for exit junctions
 */
async function queryOSMExits(highwayRef) {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastOsmTime;
  if (timeSinceLastRequest < OSM_DELAY) {
    await new Promise(resolve => setTimeout(resolve, OSM_DELAY - timeSinceLastRequest));
  }
  lastOsmTime = Date.now();

  // Overpass QL query to find motorway junctions (exits) in Texas
  // Use a simpler approach: query all motorway_junctions, then filter in code
  // This avoids complex regex in Overpass that can cause XML errors
  const query = `[out:json][timeout:25][bbox:${TEXAS_BBOX}];node["highway"="motorway_junction"];out;`;

  const encodedQuery = encodeURIComponent(query);
  const url = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;

  return new Promise((resolve) => {
    const options = {
      headers: {
        'User-Agent': 'NomadApp/1.0 (Texas Exit Sign Data Collection)'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Check if response is XML (error case)
          if (data.trim().startsWith('<?xml') || data.trim().startsWith('<')) {
            console.warn(`   ⚠️  OSM returned XML instead of JSON for ${highwayRef} (query may be too complex or rate limited)`);
            resolve([]);
            return;
          }
          
          const json = JSON.parse(data);
          if (json.elements) {
            // Filter exits that match this highway reference
            // Match ref like "I 10", "I-10", "10", etc.
            const highwayNum = highwayRef.replace(/^(I|US|TX SH|FM|RR)\s*/i, '').trim();
            const exits = json.elements
              .filter(el => {
                if (el.type !== 'node' || !el.tags) return false;
                const ref = el.tags.ref || el.tags['exit:ref'] || '';
                // Match if ref contains the highway number
                return ref && (ref.includes(highwayNum) || highwayRef.includes(ref));
              })
              .map(el => ({
                exitNumber: el.tags.ref || el.tags['exit:ref'] || '',
                description: el.tags.name || el.tags['exit:name'] || el.tags['exit_to'] || '',
                coordinates: {
                  latitude: el.lat,
                  longitude: el.lon
                },
                highway: highwayRef,
                source: 'osm'
              }));
            resolve(exits);
          } else {
            resolve([]);
          }
        } catch (error) {
          // Log first 200 chars of response for debugging
          const preview = data.substring(0, 200);
          console.warn(`   ⚠️  OSM query error for ${highwayRef}:`, error.message);
          if (preview.includes('<?xml') || preview.includes('<')) {
            console.warn(`   Response appears to be XML, not JSON. Query may need adjustment.`);
          }
          resolve([]);
        }
      });
    }).on('error', (error) => {
      console.warn(`   ⚠️  OSM request error for ${highwayRef}:`, error.message);
      resolve([]);
    });
  });
}

/**
 * Query Google Places API for nearby roads at exit coordinates
 */
async function queryPlacesNearExit(coordinates, exitNumber) {
  if (!GOOGLE_API_KEY) {
    return null;
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastPlacesTime;
  if (timeSinceLastRequest < PLACES_DELAY) {
    await new Promise(resolve => setTimeout(resolve, PLACES_DELAY - timeSinceLastRequest));
  }
  lastPlacesTime = Date.now();

  // Use Places API Nearby Search to find roads/intersections
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.latitude},${coordinates.longitude}&radius=100&type=route&key=${GOOGLE_API_KEY}`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results && json.results.length > 0) {
            // Extract route names
            const routes = json.results
              .map(place => place.name)
              .filter(name => name && !name.includes('Exit'))
              .slice(0, 2); // Get up to 2 route names
            
            resolve({
              routes: routes,
              source: 'google_places'
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
 * Parse exit data from populated or integrated file
 */
function parseExitData() {
  // Try populated file first (has coordinates), fallback to integrated file
  let filePath = POPULATED_EXITS_FILE;
  if (!fs.existsSync(filePath)) {
    filePath = INTEGRATED_EXITS_FILE;
    if (!fs.existsSync(filePath)) {
      console.error(`   ❌ Exit files not found: ${POPULATED_EXITS_FILE} or ${INTEGRATED_EXITS_FILE}`);
      return new Map();
    }
    console.log(`   ℹ️  Using integrated file (coordinates may be placeholders)`);
  } else {
    console.log(`   ✓ Using populated file (has coordinates)`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const exits = new Map();

  // Match all exit exports - find the start of each array, then find its matching closing bracket
  const exportRegex = /export const (\w+_EXITS):\s*Omit<ExplorerHighwayExit[^>]+>\[\]\s*=\s*\[/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    const highwayKey = match[1];
    const arrayStart = match.index + match[0].length;
    
    // Find the matching closing bracket by counting brackets
    let depth = 1;
    let arrayEnd = arrayStart;
    for (let i = arrayStart; i < content.length && depth > 0; i++) {
      if (content[i] === '[') depth++;
      else if (content[i] === ']') depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
    
    // Safety check: if we didn't find a closing bracket, skip this highway
    if (depth !== 0) {
      console.warn(`   ⚠️  ${highwayKey}: Could not find matching closing bracket (depth: ${depth})`);
      continue;
    }
    
    const exitsArray = content.substring(arrayStart, arrayEnd);

    // Parse individual exits - match complete exit objects including nested braces
    // Use a balanced brace matcher approach
    const exitObjects = [];
    let exitDepth = 0;
    let start = -1;
    for (let i = 0; i < exitsArray.length; i++) {
      if (exitsArray[i] === '{') {
        if (exitDepth === 0) start = i;
        exitDepth++;
      } else if (exitsArray[i] === '}') {
        exitDepth--;
        if (exitDepth === 0 && start !== -1) {
          const exitStr = exitsArray.substring(start, i + 1);
          if (exitStr.includes('exitNumber')) {
            exitObjects.push(exitStr);
          }
          start = -1;
        }
      }
    }
    
    const highwayExits = [];
    for (const exitStr of exitObjects) {
      // Extract fields using simpler regex patterns
      const exitNumberMatch = exitStr.match(/exitNumber:\s*['"]([^'"]+)['"]/);
      const descriptionMatch = exitStr.match(/description:\s*['"]([^'"]+)['"]/);
      const latMatch = exitStr.match(/latitude:\s*(-?[\d.]+)/);
      const lonMatch = exitStr.match(/longitude:\s*(-?[\d.]+)/);
      const mileStartMatch = exitStr.match(/milepointStart:\s*([\d.]+)/);
      const mileEndMatch = exitStr.match(/milepointEnd:\s*([\d.]+)/);
      
      if (exitNumberMatch && descriptionMatch && latMatch && lonMatch && mileStartMatch && mileEndMatch) {
        highwayExits.push({
          exitNumber: exitNumberMatch[1],
          description: descriptionMatch[1],
          coordinates: {
            latitude: parseFloat(latMatch[1]),
            longitude: parseFloat(lonMatch[1])
          },
          milepointStart: parseFloat(mileStartMatch[1]),
          milepointEnd: parseFloat(mileEndMatch[1])
        });
      }
    }

    if (highwayExits.length > 0) {
      exits.set(highwayKey, highwayExits);
    } else {
      // Debug: log if we found exit objects but couldn't parse them
      if (exitObjects.length > 0) {
        console.warn(`   ⚠️  ${highwayKey}: Found ${exitObjects.length} exit objects but couldn't parse them`);
      }
    }
  }

  return exits;
}

/**
 * Get highway reference for OSM query
 */
function getHighwayRef(highwayKey) {
  // I10_EAST_EXITS -> "I 10"
  // I35E_NORTH_EXITS -> "I 35E"
  // US59_EAST_EXITS -> "US 59"
  
  const match = highwayKey.match(/^(I|US|SH|FM|RR)(\d+[EW]?)(?:_(EAST|WEST|NORTH|SOUTH))?_EXITS$/);
  if (!match) return null;

  const [, prefix, number] = match;
  
  if (prefix === 'I') {
    return `I ${number}`;
  } else if (prefix === 'US') {
    return `US ${number}`;
  } else if (prefix === 'SH') {
    return `TX SH ${number}`;
  } else if (prefix === 'FM') {
    return `FM ${number}`;
  } else if (prefix === 'RR') {
    return `RR ${number}`;
  }

  return null;
}

/**
 * Format exit description from scraped data
 */
function formatExitDescription(exitNumber, osmData, placesData, currentDescription) {
  // If current description is already good, keep it
  if (currentDescription && currentDescription.match(/^Exit \d+[A-Z]?\s*-\s*.+/)) {
    return currentDescription;
  }

  // Build description from scraped data
  const parts = [];

  // Prefer OSM exit name/description
  if (osmData && osmData.description) {
    parts.push(osmData.description);
  }

  // Add Google Places route names
  if (placesData && placesData.routes && placesData.routes.length > 0) {
    placesData.routes.forEach(route => {
      if (!parts.includes(route)) {
        parts.push(route);
      }
    });
  }

  // If we have parts, format as "Exit X - Road1, Road2"
  if (parts.length > 0) {
    return `Exit ${exitNumber} - ${parts.join(', ')}`;
  }

  // Fallback to current description or just exit number
  return currentDescription || `Exit ${exitNumber}`;
}

/**
 * Main scraping function
 */
async function scrapeExitSigns() {
  console.log('🛣️  Scraping Texas Highway Exit Sign Data');
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
  
  if (exitData.size === 0) {
    console.error('\n❌ No exit data found. Run populate-texas-exits-fast.js first.');
    return;
  }

  console.log(`   ✓ Found ${exitData.size} highways with exit data`);

  // Count total exits
  let totalExits = 0;
  exitData.forEach((exits) => {
    totalExits += exits.length;
  });
  console.log(`   ✓ Total exits: ${totalExits}`);

  if (!GOOGLE_API_KEY) {
    console.log('\n⚠️  No Google Maps API key found. Will use OSM data only.');
  }

  // Scrape exit signs
  const exitSigns = {};
  let processedHighways = 0;
  let scrapedExits = 0;
  let osmExits = 0;
  let placesExits = 0;

  for (const [highwayKey, exits] of exitData.entries()) {
    const highwayRef = getHighwayRef(highwayKey);
    if (!highwayRef) {
      console.log(`\n   ⚠️  Skipping ${highwayKey} (unknown format)`);
      continue;
    }

    console.log(`\n🛣️  Processing ${highwayRef} (${exits.length} exits)...`);

    // Check if already processed (only skip if actually scraped exits)
    if (progress[highwayKey] && progress[highwayKey].completed && progress[highwayKey].scraped > 0) {
      console.log(`   ⏭️  Already processed (${progress[highwayKey].scraped} exits), skipping`);
      continue;
    }
    
    // Reset progress if it was marked complete but had 0 scraped (from previous failed run)
    if (progress[highwayKey] && progress[highwayKey].completed && progress[highwayKey].scraped === 0) {
      delete progress[highwayKey];
      console.log(`   🔄 Resetting progress for ${highwayRef} (was marked complete with 0 exits)`);
    }

    // Query OSM for exit junctions
    console.log(`   📍 Querying OpenStreetMap...`);
    const osmExitsData = await queryOSMExits(highwayRef);
    console.log(`   ✓ Found ${osmExitsData.length} exits in OSM`);

    // Create a map of OSM exits by exit number
    const osmExitsMap = new Map();
    osmExitsData.forEach(exit => {
      const key = exit.exitNumber;
      if (!osmExitsMap.has(key) || !osmExitsMap.get(key).description) {
        osmExitsMap.set(key, exit);
      }
    });

    // Process each exit
    const highwaySigns = {};
    const highwayProgress = progress[highwayKey] || { processed: 0, scraped: 0 };

    for (let i = 0; i < exits.length; i++) {
      const exit = exits[i];
      
      // Skip if coordinates are invalid (but allow if we're using integrated file)
      if (exit.coordinates.latitude === 0 && exit.coordinates.longitude === 0 && fs.existsSync(POPULATED_EXITS_FILE)) {
        // Only skip if we have the populated file - if using integrated file, coordinates will be 0
        continue;
      }

      // Get OSM data for this exit
      const osmData = osmExitsMap.get(exit.exitNumber);

      // Query Google Places if available and coordinates are valid
      let placesData = null;
      if (GOOGLE_API_KEY && (!osmData || !osmData.description) && 
          exit.coordinates.latitude !== 0 && exit.coordinates.longitude !== 0) {
        placesData = await queryPlacesNearExit(exit.coordinates, exit.exitNumber);
        if (placesData && i % 10 === 0) {
          console.log(`      📍 Exit ${exit.exitNumber}: ${placesData.routes.join(', ') || 'No routes found'}`);
        }
      }

      // Format exit description
      const description = formatExitDescription(
        exit.exitNumber,
        osmData,
        placesData,
        exit.description
      );

      highwaySigns[exit.exitNumber] = {
        exitNumber: exit.exitNumber,
        description: description,
        coordinates: exit.coordinates,
        milepointStart: exit.milepointStart,
        milepointEnd: exit.milepointEnd,
        sources: {
          osm: !!osmData,
          googlePlaces: !!placesData,
          original: exit.description !== `Exit ${exit.exitNumber}`
        }
      };

      if (osmData) osmExits++;
      if (placesData) placesExits++;
      scrapedExits++;
      highwayProgress.scraped++;

      // Save progress every 20 exits
      if (scrapedExits % 20 === 0) {
        progress[highwayKey] = highwayProgress;
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      }
    }

    exitSigns[highwayKey] = highwaySigns;
    progress[highwayKey] = { ...highwayProgress, completed: true };
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

    console.log(`   ✓ Processed ${highwayProgress.scraped} exits (${osmExitsData.length} from OSM)`);
    processedHighways++;
  }

  // Save output
  console.log('\n📝 Saving exit sign data...');
  const output = {
    generated: new Date().toISOString(),
    totalHighways: processedHighways,
    totalExits: scrapedExits,
    sources: {
      osm: osmExits,
      googlePlaces: placesExits
    },
    exitSigns: exitSigns
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('\n✅ Done!');
  console.log(`   • Highways processed: ${processedHighways}`);
  console.log(`   • Total exits scraped: ${scrapedExits}`);
  console.log(`   • OSM exits: ${osmExits}`);
  console.log(`   • Google Places exits: ${placesExits}`);
  console.log(`   • Output: ${OUTPUT_FILE}`);
}

// Run the script
if (require.main === module) {
  scrapeExitSigns().catch(console.error);
}

module.exports = { scrapeExitSigns };

