/**
 * Fetch Texas Highway Exits from OpenStreetMap
 * 
 * This script queries the Overpass API to get actual exit numbers,
 * descriptions, and GPS coordinates for all Texas highways.
 */

/* eslint-env node */
/* global __dirname */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../data/texas-exits-osm.json');
const PROGRESS_FILE = path.join(__dirname, '../data/texas-exits-progress.json');

// List of Texas highways to query
const TEXAS_HIGHWAYS = [
  // Interstates
  { ref: 'I 10', type: 'interstate', number: '10' },
  { ref: 'I 20', type: 'interstate', number: '20' },
  { ref: 'I 27', type: 'interstate', number: '27' },
  { ref: 'I 30', type: 'interstate', number: '30' },
  { ref: 'I 35', type: 'interstate', number: '35' },
  { ref: 'I 35E', type: 'interstate', number: '35E' },
  { ref: 'I 35W', type: 'interstate', number: '35W' },
  { ref: 'I 37', type: 'interstate', number: '37' },
  { ref: 'I 40', type: 'interstate', number: '40' },
  { ref: 'I 45', type: 'interstate', number: '45' },
  { ref: 'I 69', type: 'interstate', number: '69' },
  { ref: 'I 110', type: 'interstate', number: '110' },
  { ref: 'I 345', type: 'interstate', number: '345' },
  { ref: 'I 410', type: 'interstate', number: '410' },
  { ref: 'I 610', type: 'interstate', number: '610' },
  { ref: 'I 635', type: 'interstate', number: '635' },
  { ref: 'I 820', type: 'interstate', number: '820' },
  
  // US Highways (major ones)
  { ref: 'US 59', type: 'us-highway', number: '59' },
  { ref: 'US 67', type: 'us-highway', number: '67' },
  { ref: 'US 69', type: 'us-highway', number: '69' },
  { ref: 'US 75', type: 'us-highway', number: '75' },
  { ref: 'US 77', type: 'us-highway', number: '77' },
  { ref: 'US 79', type: 'us-highway', number: '79' },
  { ref: 'US 80', type: 'us-highway', number: '80' },
  { ref: 'US 81', type: 'us-highway', number: '81' },
  { ref: 'US 82', type: 'us-highway', number: '82' },
  { ref: 'US 83', type: 'us-highway', number: '83' },
  { ref: 'US 84', type: 'us-highway', number: '84' },
  { ref: 'US 87', type: 'us-highway', number: '87' },
  { ref: 'US 90', type: 'us-highway', number: '90' },
  { ref: 'US 96', type: 'us-highway', number: '96' },
  { ref: 'US 175', type: 'us-highway', number: '175' },
  { ref: 'US 180', type: 'us-highway', number: '180' },
  { ref: 'US 181', type: 'us-highway', number: '181' },
  { ref: 'US 183', type: 'us-highway', number: '183' },
  { ref: 'US 190', type: 'us-highway', number: '190' },
  { ref: 'US 277', type: 'us-highway', number: '277' },
  { ref: 'US 281', type: 'us-highway', number: '281' },
  { ref: 'US 287', type: 'us-highway', number: '287' },
  { ref: 'US 290', type: 'us-highway', number: '290' },
  { ref: 'US 377', type: 'us-highway', number: '377' },
  { ref: 'US 380', type: 'us-highway', number: '380' },
  { ref: 'US 385', type: 'us-highway', number: '385' },
];

// Texas bounding box
const TEXAS_BBOX = '25.8,-106.6,36.5,-93.5'; // south,west,north,east

/**
 * Query Overpass API for exits on a specific highway
 */
function queryHighwayExits(highway) {
  return new Promise((resolve, reject) => {
    // Overpass QL query to find motorway junctions (exits) in Texas
    const query = `
      [out:json][timeout:60][bbox:${TEXAS_BBOX}];
      (
        node["highway"="motorway_junction"]["ref:${highway.ref}"];
        node["highway"="motorway_junction"][~"ref"~"${highway.ref}"];
      );
      out body;
      >;
      out skel qt;
    `;

    const encodedQuery = encodeURIComponent(query);
    const url = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;

    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.elements || []);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Parse OSM node to exit data
 */
function parseExit(node, highway) {
  return {
    exitNumber: node.tags.ref || node.tags.exit_to || 'Unknown',
    description: node.tags.name || node.tags.exit_to || node.tags.destination || 'Unknown',
    coordinates: {
      latitude: node.lat,
      longitude: node.lon,
    },
    osmId: node.id,
    highwayRef: highway.ref,
    highwayType: highway.type,
    highwayNumber: highway.number,
  };
}

/**
 * Main function
 */
async function main() {
  console.log('🌍 Fetching Texas Highway Exits from OpenStreetMap...\n');
  console.log(`📍 Texas Bounding Box: ${TEXAS_BBOX}\n`);
  console.log(`🛣️  Processing ${TEXAS_HIGHWAYS.length} highways...\n`);

  const allExits = {};
  let totalExits = 0;

  for (let i = 0; i < TEXAS_HIGHWAYS.length; i++) {
    const highway = TEXAS_HIGHWAYS[i];
    const progress = `[${i + 1}/${TEXAS_HIGHWAYS.length}]`;

    try {
      process.stdout.write(`${progress} Querying ${highway.ref}... `);
      
      const nodes = await queryHighwayExits(highway);
      const exits = nodes
        .filter(node => node.type === 'node' && node.tags)
        .map(node => parseExit(node, highway));

      const highwayKey = `${highway.type}-${highway.number}`;
      allExits[highwayKey] = exits;
      totalExits += exits.length;

      console.log(`✓ Found ${exits.length} exits`);

      // Be nice to the Overpass API - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
  }

  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allExits, null, 2), 'utf-8');
  console.log(`\n✅ Complete! Found ${totalExits} total exits`);
  console.log(`📄 Saved to: ${OUTPUT_FILE}\n`);
}

main().catch(console.error);



