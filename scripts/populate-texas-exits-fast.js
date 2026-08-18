#!/usr/bin/env node

/**
 * Populate Texas Highway Exit Coordinates - Fast & Accurate Approach
 * 
 * This script:
 * 1. Uses Google Directions API to get highway route polylines
 * 2. Calculates exit coordinates from mileposts along the route (much faster than geocoding)
 * 3. Enhances exit descriptions to match highway sign format (e.g., "Exit 69 - CT Route 8, Putnam Rd")
 * 4. Tests on a small subset first
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const EXITS_FILE = path.join(__dirname, '../data/texas-highway-exits-integrated.ts');
const OUTPUT_FILE = path.join(__dirname, '../data/texas-highway-exits-populated.ts');
const PROGRESS_FILE = path.join(__dirname, '../data/texas-exits-progress.json');
const TEST_MODE = process.argv.includes('--test'); // Test on small subset
const PARSE_ONLY_MODE = process.argv.includes('--parse-only'); // Only test parsing, no API calls

// Google Maps API key (required for this approach)
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

if (!GOOGLE_API_KEY && !PARSE_ONLY_MODE) {
  console.error('❌ Error: GOOGLE_MAPS_API_KEY environment variable is required');
  console.error('');
  console.error('   This script uses Google Directions API to get highway route polylines,');
  console.error('   then calculates exit coordinates from mileposts along the route.');
  console.error('');
  console.error('   To set the API key:');
  console.error('   - Windows PowerShell: $env:GOOGLE_MAPS_API_KEY="your_key_here"');
  console.error('   - Windows CMD: set GOOGLE_MAPS_API_KEY=your_key_here');
  console.error('   - Linux/Mac: export GOOGLE_MAPS_API_KEY=your_key_here');
  console.error('');
  console.error('   Then run: node scripts/populate-texas-exits-fast.js --test');
  console.error('');
  console.error('   Or test parsing only: node scripts/populate-texas-exits-fast.js --parse-only');
  process.exit(1);
}

// Rate limiting
const API_DELAY = 200; // ms between API requests
const GEOCODE_DELAY = 100; // ms between geocoding requests
let lastApiTime = 0;
let lastGeocodeTime = 0;

/**
 * Decode polyline string to coordinates array
 * Uses Google's polyline encoding algorithm
 */
function decodePolyline(encoded) {
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }

  return poly;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * Get coordinate at a specific milepost along a route polyline
 */
function getCoordinateAtMilepost(polyline, milepost) {
  if (!polyline || polyline.length === 0) return null;

  const totalMiles = calculateRouteLength(polyline) / 1609.34; // Convert meters to miles
  
  if (milepost > totalMiles) {
    // Return last point if milepost exceeds route length
    return polyline[polyline.length - 1];
  }

  let accumulatedDistance = 0;
  const targetDistance = milepost * 1609.34; // Convert miles to meters

  for (let i = 0; i < polyline.length - 1; i++) {
    const segmentDistance = calculateDistance(polyline[i], polyline[i + 1]);
    
    if (accumulatedDistance + segmentDistance >= targetDistance) {
      // Interpolate between these two points
      const ratio = (targetDistance - accumulatedDistance) / segmentDistance;
      return {
        latitude: polyline[i].latitude + (polyline[i + 1].latitude - polyline[i].latitude) * ratio,
        longitude: polyline[i].longitude + (polyline[i + 1].longitude - polyline[i].longitude) * ratio
      };
    }
    
    accumulatedDistance += segmentDistance;
  }

  return polyline[polyline.length - 1];
}

/**
 * Calculate total length of a route in meters
 */
function calculateRouteLength(polyline) {
  let totalDistance = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    totalDistance += calculateDistance(polyline[i], polyline[i + 1]);
  }
  return totalDistance;
}

/**
 * Get highway route polyline from Google Directions API
 */
async function getHighwayRoute(highwayName, direction) {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastApiTime;
  if (timeSinceLastRequest < API_DELAY) {
    await new Promise(resolve => setTimeout(resolve, API_DELAY - timeSinceLastRequest));
  }
  lastApiTime = Date.now();

  // Build origin and destination based on highway and direction
  // For Texas highways, we'll use major cities as endpoints
  const endpoints = getHighwayEndpoints(highwayName, direction);
  if (!endpoints) {
    console.warn(`   ⚠️  Could not determine endpoints for ${highwayName}`);
    return null;
  }

  const query = `origin=${encodeURIComponent(endpoints.origin)}&destination=${encodeURIComponent(endpoints.destination)}&key=${GOOGLE_API_KEY}`;
  const url = `https://maps.googleapis.com/maps/api/directions/json?${query}`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.routes && json.routes.length > 0) {
            const route = json.routes[0];
            const leg = route.legs[0];
            const polyline = route.overview_polyline.points;
            const decoded = decodePolyline(polyline);
            
            resolve({
              polyline: decoded,
              startLocation: {
                latitude: leg.start_location.lat,
                longitude: leg.start_location.lng
              },
              endLocation: {
                latitude: leg.end_location.lat,
                longitude: leg.end_location.lng
              },
              totalDistance: leg.distance.value, // meters
              totalDuration: leg.duration.value // seconds
            });
          } else {
            console.warn(`   ⚠️  Directions API failed: ${json.status}`);
            resolve(null);
          }
        } catch (error) {
          console.warn(`   ⚠️  Directions API error:`, error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.warn(`   ⚠️  Directions API request error:`, error.message);
      resolve(null);
    });
  });
}

/**
 * Get origin and destination for a highway based on direction
 */
function getHighwayEndpoints(highwayName, direction) {
  // Extract highway number and type
  const match = highwayName.match(/(Interstate|US Highway|Texas State Highway|Farm to Market Road|Ranch Road)\s+(\d+[EW]?)/);
  if (!match) return null;

  const [, type, number] = match;
  const dir = direction ? direction.toLowerCase() : '';

  // Major Texas highways with known endpoints
  const endpoints = {
    'Interstate 10': {
      east: { origin: 'El Paso, TX', destination: 'Beaumont, TX' },
      west: { origin: 'Beaumont, TX', destination: 'El Paso, TX' }
    },
    'Interstate 20': {
      east: { origin: 'Midland, TX', destination: 'Marshall, TX' },
      west: { origin: 'Marshall, TX', destination: 'Midland, TX' }
    },
    'Interstate 35': {
      north: { origin: 'Laredo, TX', destination: 'Gainesville, TX' },
      south: { origin: 'Gainesville, TX', destination: 'Laredo, TX' }
    },
    'Interstate 35E': {
      north: { origin: 'Hillsboro, TX', destination: 'Denton, TX' },
      south: { origin: 'Denton, TX', destination: 'Hillsboro, TX' }
    },
    'Interstate 35W': {
      north: { origin: 'Alvarado, TX', destination: 'Wichita Falls, TX' },
      south: { origin: 'Wichita Falls, TX', destination: 'Alvarado, TX' }
    },
    'Interstate 45': {
      north: { origin: 'Galveston, TX', destination: 'Dallas, TX' },
      south: { origin: 'Dallas, TX', destination: 'Galveston, TX' }
    },
    'Interstate 27': {
      north: { origin: 'Lubbock, TX', destination: 'Amarillo, TX' },
      south: { origin: 'Amarillo, TX', destination: 'Lubbock, TX' }
    },
    'Interstate 30': {
      east: { origin: 'Fort Worth, TX', destination: 'Texarkana, TX' },
      west: { origin: 'Texarkana, TX', destination: 'Fort Worth, TX' }
    },
    'Interstate 37': {
      north: { origin: 'Corpus Christi, TX', destination: 'San Antonio, TX' },
      south: { origin: 'San Antonio, TX', destination: 'Corpus Christi, TX' }
    },
    'Interstate 40': {
      east: { origin: 'Amarillo, TX', destination: 'Shamrock, TX' },
      west: { origin: 'Shamrock, TX', destination: 'Amarillo, TX' }
    },
    'Interstate 69': {
      north: { origin: 'Rosenberg, TX', destination: 'Houston, TX' },
      south: { origin: 'Houston, TX', destination: 'Rosenberg, TX' }
    },
    'Interstate 410': {
      // Loop - use San Antonio as center
      default: { origin: 'San Antonio, TX', destination: 'San Antonio, TX' }
    },
    'Interstate 610': {
      // Loop - use Houston as center
      default: { origin: 'Houston, TX', destination: 'Houston, TX' }
    },
    'Interstate 820': {
      // Loop - use Fort Worth as center
      default: { origin: 'Fort Worth, TX', destination: 'Fort Worth, TX' }
    },
    'Interstate 635': {
      // LBJ Freeway - Dallas area
      default: { origin: 'Mesquite, TX', destination: 'Carrollton, TX' }
    }
  };

  const key = highwayName.replace(/\s+(East|West|North|South)$/, '');
  const highwayEndpoints = endpoints[key];
  
  if (!highwayEndpoints) {
    // Try to find a generic endpoint
    return { origin: 'Texas', destination: 'Texas' };
  }

  if (highwayEndpoints.default) {
    return highwayEndpoints.default;
  }

  return highwayEndpoints[dir] || highwayEndpoints.default || highwayEndpoints.east || highwayEndpoints.north;
}

/**
 * Reverse geocode coordinates to get road names and landmarks
 * Uses Places API nearby search for better exit-specific results
 */
async function reverseGeocodeExit(coordinates, exitNumber) {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastGeocodeTime;
  if (timeSinceLastRequest < GEOCODE_DELAY) {
    await new Promise(resolve => setTimeout(resolve, GEOCODE_DELAY - timeSinceLastRequest));
  }
  lastGeocodeTime = Date.now();

  // First, try Places API nearby search for intersections/roads
  // This is better for finding exit-specific roads
  const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.latitude},${coordinates.longitude}&radius=150&type=route&key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve) => {
    https.get(placesUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          let roadName = '';
          let city = '';
          
          // Try Places API first (better for intersections)
          if (json.status === 'OK' && json.results && json.results.length > 0) {
            // Filter out highway names and get actual exit roads
            const roads = json.results
              .map(place => place.name)
              .filter(name => {
                // Filter out highway names (I-10, US-281, etc.)
                const highwayPattern = /^(I-?\d+|US\s*\d+|TX\s*SH\s*\d+|FM\s*\d+|RR\s*\d+)/i;
                return name && !highwayPattern.test(name) && !name.includes('Interstate');
              })
              .slice(0, 2); // Get up to 2 road names
            
            if (roads.length > 0) {
              roadName = roads.join(', ');
            }
          }
          
          // Fallback to reverse geocoding if Places didn't find good results
          if (!roadName) {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${GOOGLE_API_KEY}`;
            
            https.get(geocodeUrl, (geoRes) => {
              let geoData = '';
              
              geoRes.on('data', (chunk) => {
                geoData += chunk;
              });
              
              geoRes.on('end', () => {
                try {
                  const geoJson = JSON.parse(geoData);
                  if (geoJson.status === 'OK' && geoJson.results && geoJson.results.length > 0) {
                    // Look for intersection or street_address results
                    const intersectionResult = geoJson.results.find(r => 
                      r.types.includes('intersection') || r.types.includes('street_address')
                    );
                    
                    if (intersectionResult) {
                      // Extract route names from intersection
                      for (const component of intersectionResult.address_components || []) {
                        if (component.types.includes('route')) {
                          const routeName = component.long_name;
                          // Skip if it's a highway
                          if (!/^(I-?\d+|US\s*\d+|TX\s*SH\s*\d+|FM\s*\d+|RR\s*\d+)/i.test(routeName)) {
                            roadName = routeName;
                            break;
                          }
                        }
                      }
                    }
                    
                    // Get city
                    for (const result of geoJson.results) {
                      for (const component of result.address_components || []) {
                        if (component.types.includes('locality') || component.types.includes('administrative_area_level_3')) {
                          city = component.long_name;
                          break;
                        }
                      }
                      if (city) break;
                    }
                  }
                  
                  resolve(roadName ? {
                    roadName: roadName,
                    city: city,
                    fullAddress: geoJson.results?.[0]?.formatted_address || ''
                  } : null);
                } catch (error) {
                  resolve(null);
                }
              });
            }).on('error', () => {
              resolve(null);
            });
          } else {
            // Got road name from Places API, get city from geocoding
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${GOOGLE_API_KEY}`;
            
            https.get(geocodeUrl, (geoRes) => {
              let geoData = '';
              
              geoRes.on('data', (chunk) => {
                geoData += chunk;
              });
              
              geoRes.on('end', () => {
                try {
                  const geoJson = JSON.parse(geoData);
                  if (geoJson.status === 'OK' && geoJson.results) {
                    for (const result of geoJson.results) {
                      for (const component of result.address_components || []) {
                        if (component.types.includes('locality') || component.types.includes('administrative_area_level_3')) {
                          city = component.long_name;
                          break;
                        }
                      }
                      if (city) break;
                    }
                  }
                  
                  resolve({
                    roadName: roadName,
                    city: city,
                    fullAddress: geoJson.results?.[0]?.formatted_address || ''
                  });
                } catch (error) {
                  resolve({
                    roadName: roadName,
                    city: '',
                    fullAddress: ''
                  });
                }
              });
            }).on('error', () => {
              resolve({
                roadName: roadName,
                city: '',
                fullAddress: ''
              });
            });
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
 * Enhance exit description to match highway sign format
 * Format: "Exit 69 - CT Route 8, Putnam Rd"
 * 
 * Highway signs typically show: Exit Number - Road Name(s), Landmark
 */
function enhanceExitDescription(exitNumber, currentDescription, geocodeData = null) {
  // If description is already in good format (Exit X - ...), return it
  if (currentDescription.match(/^Exit \d+[A-Z]?\s*-\s*.+/)) {
    return currentDescription;
  }

  // If we have geocode data, use it to build the description
  if (geocodeData && geocodeData.roadName) {
    const parts = [geocodeData.roadName];
    if (geocodeData.city) {
      parts.push(geocodeData.city);
    }
    return `Exit ${exitNumber} - ${parts.join(', ')}`;
  }

  // If it's just "Exit X" with no additional info, keep as is
  if (currentDescription === `Exit ${exitNumber}` || currentDescription.trim() === '') {
    return `Exit ${exitNumber}`;
  }

  // If description already starts with "Exit", check if it needs formatting
  if (currentDescription.startsWith('Exit ')) {
    // Check if it has the dash format
    if (!currentDescription.includes(' - ')) {
      // Format: "Exit X" -> "Exit X - [rest of description]"
      const rest = currentDescription.replace(/^Exit \d+[A-Z]?\s*/, '').trim();
      if (rest) {
        return `Exit ${exitNumber} - ${rest}`;
      }
    }
    return currentDescription;
  }

  // Format as "Exit X - [description]"
  // Clean up common patterns
  let cleaned = currentDescription.trim();
  
  // Remove leading "Exit X" if present
  cleaned = cleaned.replace(/^Exit \d+[A-Z]?\s*[-:]?\s*/i, '');
  
  // Format with dash
  return cleaned ? `Exit ${exitNumber} - ${cleaned}` : `Exit ${exitNumber}`;
}

/**
 * Parse exit data from the integrated file
 */
function parseExitData() {
  const content = fs.readFileSync(EXITS_FILE, 'utf8');
  const exits = new Map();

  // Match all exit exports
  const exportRegex = /export const (\w+_EXITS):\s*Omit<ExplorerHighwayExit[^>]+>\[\]\s*=\s*\[([\s\S]*?)\];/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    const highwayKey = match[1];
    const exitsArray = match[2];

    // Parse individual exits
    // Use non-greedy matching to handle newlines and various formatting
    const exitRegex = /\{\s*exitNumber:\s*['"]([^'"]+)['"],[\s\S]*?description:\s*['"]([^'"]+)['"],[\s\S]*?latitude:\s*([\d.]+),[\s\S]*?longitude:\s*([\d.]+)[\s\S]*?milepointStart:\s*([\d.]+),[\s\S]*?milepointEnd:\s*([\d.]+)[\s\S]*?\}/g;
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
    
    // Debug: log if no exits found
    if (highwayExits.length === 0 && exitsArray.trim().length > 0) {
      console.warn(`   ⚠️  Warning: No exits parsed for ${highwayKey}. Array length: ${exitsArray.length}`);
      // Try to find exit numbers with simpler pattern for debugging
      const simpleCount = (exitsArray.match(/exitNumber:\s*['"][^'"]+['"]/g) || []).length;
      console.warn(`   Found ${simpleCount} exit numbers with simple pattern`);
    }

    exits.set(highwayKey, highwayExits);
  }

  return exits;
}

/**
 * Get highway name and direction from exit export key
 */
function getHighwayInfoFromKey(key) {
  // I10_EAST_EXITS -> { name: "Interstate 10", direction: "east" }
  // I35E_NORTH_EXITS -> { name: "Interstate 35E", direction: "north" }
  
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

  return {
    name: highwayName,
    direction: direction ? direction.toLowerCase() : null
  };
}

/**
 * Main function to populate exit coordinates
 */
async function populateExitCoordinates() {
  console.log('🛣️  Populating Texas Highway Exit Coordinates (Fast & Accurate)');
  console.log('='.repeat(70));

  if (TEST_MODE) {
    console.log('🧪 TEST MODE: Processing small subset only\n');
  }

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

  if (PARSE_ONLY_MODE) {
    console.log('\n✅ Parse-only mode: Exits parsed successfully!');
    console.log(`   • Found ${exitData.size} highways`);
    console.log(`   • Total ${totalExits} exits parsed`);
    console.log('\n   To populate coordinates, set GOOGLE_MAPS_API_KEY and run without --parse-only');
    return;
  }

  if (exitsNeedingCoordinates === 0) {
    console.log('\n✅ All exits already have coordinates!');
    return;
  }

  // Process each highway
  let processedCount = 0;
  let populatedCount = 0;
  let failedCount = 0;
  let highwayCount = 0;

  const highwaysToProcess = TEST_MODE 
    ? Array.from(exitData.entries()).slice(0, 3) // Test with first 3 highways
    : Array.from(exitData.entries());

  for (const [highwayKey, exits] of highwaysToProcess) {
    const highwayInfo = getHighwayInfoFromKey(highwayKey);
    if (!highwayInfo) {
      console.log(`\n   ⚠️  Skipping ${highwayKey} (unknown format)`);
      continue;
    }

    const highwayName = `${highwayInfo.name}${highwayInfo.direction ? ' ' + highwayInfo.direction.charAt(0).toUpperCase() + highwayInfo.direction.slice(1) : ''}`;
    console.log(`\n🛣️  Processing ${highwayName} (${exits.length} exits)...`);

    // Check if already processed
    if (progress[highwayKey] && progress[highwayKey].completed) {
      console.log(`   ⏭️  Already processed, skipping`);
      continue;
    }

    // Get highway route
    console.log(`   📍 Fetching route polyline...`);
    const route = await getHighwayRoute(highwayInfo.name, highwayInfo.direction);
    
    if (!route) {
      console.log(`   ❌ Could not get route for ${highwayName}`);
      failedCount += exits.length;
      continue;
    }

    console.log(`   ✓ Route fetched (${route.polyline.length} points, ${(route.totalDistance / 1609.34).toFixed(1)} miles)`);

    // Process each exit
    const highwayProgress = progress[highwayKey] || { processed: 0, populated: 0, failed: 0 };

    for (let i = 0; i < exits.length; i++) {
      const exit = exits[i];
      
      // Skip if already has coordinates
      if (exit.coordinates.latitude !== 0 || exit.coordinates.longitude !== 0) {
        continue;
      }

      // Calculate coordinate from milepost
      const coordinate = getCoordinateAtMilepost(route.polyline, exit.milepointStart);
      
      if (coordinate) {
        exit.coordinates = {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude
        };
        
        // Skip reverse geocoding for now - it's not accurate enough
        // The scraping script will get better exit sign data from OSM
        // Just keep the basic "Exit X" format for now
        exit.description = enhanceExitDescription(exit.exitNumber, exit.description);
        
        populatedCount++;
        highwayProgress.populated++;
      } else {
        failedCount++;
        highwayProgress.failed++;
        console.warn(`   ⚠️  Could not calculate coordinate for Exit ${exit.exitNumber} (milepost ${exit.milepointStart})`);
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

    console.log(`   ✓ Processed ${highwayProgress.processed} exits (${highwayProgress.populated} populated, ${highwayProgress.failed} failed)`);
    highwayCount++;
  }

  // Generate output file
  console.log('\n📝 Generating output file...');
  generateOutputFile(exitData);

  console.log('\n✅ Done!');
  console.log(`   • Highways processed: ${highwayCount}`);
  console.log(`   • Total processed: ${processedCount}`);
  console.log(`   • Populated: ${populatedCount}`);
  console.log(`   • Failed: ${failedCount}`);
  console.log(`   • Output: ${OUTPUT_FILE}`);
  
  if (TEST_MODE) {
    console.log('\n🧪 Test complete! Run without --test to process all highways.');
  }
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
 * Method: Fast polyline-based coordinate calculation
 */

import type { ExplorerHighwayExit } from '../types/explorer';


`;

  // Generate exports for each highway
  for (const [highwayKey, exits] of exitData.entries()) {
    const highwayInfo = getHighwayInfoFromKey(highwayKey);
    const highwayName = highwayInfo 
      ? `${highwayInfo.name}${highwayInfo.direction ? ' ' + highwayInfo.direction.charAt(0).toUpperCase() + highwayInfo.direction.slice(1) : ''}`
      : highwayKey;

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

