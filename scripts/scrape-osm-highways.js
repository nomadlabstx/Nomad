#!/usr/bin/env node

/**
 * OpenStreetMap Highway Data Scraper
 * Collects highway data for all US states using Overpass API
 * 
 * Usage: node scripts/scrape-osm-highways.js [state-codes]
 * Example: node scripts/scrape-osm-highways.js CA FL NY PA IL
 */

const fs = require('fs').promises;
const path = require('path');

// Top 10 populous states (in order of population)
const TOP_10_STATES = [
  { code: 'CA', name: 'California', population: 39538223 },
  { code: 'TX', name: 'Texas', population: 29145505 }, // Already done
  { code: 'FL', name: 'Florida', population: 21538187 },
  { code: 'NY', name: 'New York', population: 20201249 },
  { code: 'PA', name: 'Pennsylvania', population: 13002700 },
  { code: 'IL', name: 'Illinois', population: 12812508 },
  { code: 'OH', name: 'Ohio', population: 11799448 },
  { code: 'GA', name: 'Georgia', population: 10711908 },
  { code: 'NC', name: 'North Carolina', population: 10439388 },
  { code: 'MI', name: 'Michigan', population: 10037261 },
  { code: 'NJ', name: 'New Jersey', population: 9288994 }
];

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

/**
 * Generate Overpass QL query for highways in a specific state
 */
function generateOverpassQuery(stateCode) {
  return `
[out:json][timeout:300];
(
  // Interstate highways - more comprehensive search
  way["highway"="motorway"]["ref"~"^I-[0-9]+"];
  way["highway"="motorway"]["ref"~"^I [0-9]+"];
  way["highway"="trunk"]["ref"~"^I-[0-9]+"];
  way["highway"="trunk"]["ref"~"^I [0-9]+"];
  
  // US Highways - more comprehensive search
  way["highway"="trunk"]["ref"~"^US [0-9]+"];
  way["highway"="trunk"]["ref"~"^US-[0-9]+"];
  way["highway"="primary"]["ref"~"^US [0-9]+"];
  way["highway"="primary"]["ref"~"^US-[0-9]+"];
  
  // State Highways - multiple patterns
  way["highway"="primary"]["ref"~"^${stateCode} [0-9]+"];
  way["highway"="primary"]["ref"~"^${stateCode}-[0-9]+"];
  way["highway"="primary"]["ref"~"^${stateCode}[0-9]+"];
  way["highway"="secondary"]["ref"~"^${stateCode} [0-9]+"];
  way["highway"="secondary"]["ref"~"^${stateCode}-[0-9]+"];
  
  // Alternative state highway patterns
  way["highway"="primary"]["ref"~"^${stateCode} Route [0-9]+"];
  way["highway"="primary"]["ref"~"^${stateCode} Rte [0-9]+"];
  way["highway"="primary"]["ref"~"^${stateCode} SR [0-9]+"];
  
  // State-specific patterns
  way["highway"="primary"]["ref"~"^CA [0-9]+"];
  way["highway"="primary"]["ref"~"^CA-([0-9]+)"];
  way["highway"="primary"]["ref"~"^FL [0-9]+"];
  way["highway"="primary"]["ref"~"^FL-([0-9]+)"];
  way["highway"="primary"]["ref"~"^NY [0-9]+"];
  way["highway"="primary"]["ref"~"^NY-([0-9]+)"];
  way["highway"="primary"]["ref"~"^PA [0-9]+"];
  way["highway"="primary"]["ref"~"^PA-([0-9]+)"];
  way["highway"="primary"]["ref"~"^IL [0-9]+"];
  way["highway"="primary"]["ref"~"^IL-([0-9]+)"];
  way["highway"="primary"]["ref"~"^OH [0-9]+"];
  way["highway"="primary"]["ref"~"^OH-([0-9]+)"];
  way["highway"="primary"]["ref"~"^GA [0-9]+"];
  way["highway"="primary"]["ref"~"^GA-([0-9]+)"];
  way["highway"="primary"]["ref"~"^NC [0-9]+"];
  way["highway"="primary"]["ref"~"^NC-([0-9]+)"];
  way["highway"="primary"]["ref"~"^MI [0-9]+"];
  way["highway"="primary"]["ref"~"^MI-([0-9]+)"];
  way["highway"="primary"]["ref"~"^NJ [0-9]+"];
  way["highway"="primary"]["ref"~"^NJ-([0-9]+)"];
);
out geom;
`;
}

/**
 * Fetch highway data from Overpass API
 */
async function fetchHighwayData(stateCode) {
  const query = generateOverpassQuery(stateCode);
  
  console.log(`🛣️  Fetching highway data for ${stateCode}...`);
  
  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.elements.length} highway segments for ${stateCode}`);
    
    return data.elements;
  } catch (error) {
    console.error(`❌ Error fetching data for ${stateCode}:`, error.message);
    return [];
  }
}

/**
 * Process raw OSM data into our highway format
 */
function processHighwayData(elements, stateCode) {
  const highways = new Map();
  
  for (const element of elements) {
    if (element.type !== 'way') continue;
    
    const ref = element.tags.ref;
    if (!ref) continue;
    
    // Determine highway type
    let highwayType = 'state';
    let number = ref;
    
    if (ref.startsWith('I-')) {
      highwayType = 'interstate';
      number = ref.substring(2);
    } else if (ref.startsWith('US ')) {
      highwayType = 'us';
      number = ref.substring(3);
    } else if (ref.startsWith(`${stateCode} `)) {
      highwayType = 'state';
      number = ref.substring(stateCode.length + 1);
    } else if (ref.startsWith(`${stateCode}-`)) {
      highwayType = 'state';
      number = ref.substring(stateCode.length + 1);
    }
    
    // Create highway ID
    const highwayId = `${highwayType}-${number}`.toLowerCase().replace(/\s+/g, '-');
    
    // Get or create highway entry
    if (!highways.has(highwayId)) {
      highways.set(highwayId, {
        id: highwayId,
        name: `Highway ${number}`,
        type: 'highway',
        highwayType,
        number,
        fullName: `${highwayType === 'interstate' ? 'Interstate' : highwayType === 'us' ? 'US Highway' : 'State Highway'} ${number}`,
        states: [stateCode],
        direction: null,
        parentHighwayId: null,
        totalExits: 0,
        segments: []
      });
    }
    
    // Add segment data
    const highway = highways.get(highwayId);
    highway.segments.push({
      id: element.id,
      nodes: element.nodes,
      geometry: element.geometry,
      tags: element.tags
    });
  }
  
  return Array.from(highways.values());
}

/**
 * Generate TypeScript file for state highways
 */
function generateTypeScriptFile(highways, stateCode, stateName) {
  const stateVarName = stateCode.toLowerCase();
  const className = stateName.replace(/\s+/g, '');
  
  let content = `/**
 * ${stateName} Highway Database
 * Generated from OpenStreetMap data
 * 
 * Generated: ${new Date().toISOString()}
 */

import type { ExplorerHighway } from '../types/explorer';

type HighwayData = Omit<ExplorerHighway, 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount' | 'exits' | 'visitedExits' | 'completionPercent'>;

`;

  // Group highways by type
  const interstates = highways.filter(h => h.highwayType === 'interstate');
  const usHighways = highways.filter(h => h.highwayType === 'us');
  const stateHighways = highways.filter(h => h.highwayType === 'state');

  // Generate interstate highways
  if (interstates.length > 0) {
    content += `/**
 * INTERSTATE HIGHWAYS IN ${stateCode.toUpperCase()}
 */\n\n`;
    content += `const ${stateCode.toUpperCase()}_INTERSTATES: HighwayData[] = [\n`;
    
    for (const highway of interstates) {
      content += `  {\n`;
      content += `    id: '${highway.id}',\n`;
      content += `    name: '${highway.name}',\n`;
      content += `    type: 'highway',\n`;
      content += `    highwayType: 'interstate',\n`;
      content += `    number: '${highway.number}',\n`;
      content += `    fullName: '${highway.fullName}',\n`;
      content += `    states: ['${stateCode}'],\n`;
      content += `    direction: null,\n`;
      content += `    parentHighwayId: null,\n`;
      content += `    totalExits: ${highway.totalExits},\n`;
      content += `  },\n`;
    }
    
    content += `];\n\n`;
  }

  // Generate US highways
  if (usHighways.length > 0) {
    content += `/**
 * US HIGHWAYS IN ${stateCode.toUpperCase()}
 */\n\n`;
    content += `const ${stateCode.toUpperCase()}_US_HIGHWAYS: HighwayData[] = [\n`;
    
    for (const highway of usHighways) {
      content += `  {\n`;
      content += `    id: '${highway.id}',\n`;
      content += `    name: '${highway.name}',\n`;
      content += `    type: 'highway',\n`;
      content += `    highwayType: 'us',\n`;
      content += `    number: '${highway.number}',\n`;
      content += `    fullName: '${highway.fullName}',\n`;
      content += `    states: ['${stateCode}'],\n`;
      content += `    direction: null,\n`;
      content += `    parentHighwayId: null,\n`;
      content += `    totalExits: ${highway.totalExits},\n`;
      content += `  },\n`;
    }
    
    content += `];\n\n`;
  }

  // Generate state highways
  if (stateHighways.length > 0) {
    content += `/**
 * STATE HIGHWAYS IN ${stateCode.toUpperCase()}
 */\n\n`;
    content += `const ${stateCode.toUpperCase()}_STATE_HIGHWAYS: HighwayData[] = [\n`;
    
    for (const highway of stateHighways) {
      content += `  {\n`;
      content += `    id: '${highway.id}',\n`;
      content += `    name: '${highway.name}',\n`;
      content += `    type: 'highway',\n`;
      content += `    highwayType: 'state',\n`;
      content += `    number: '${highway.number}',\n`;
      content += `    fullName: '${highway.fullName}',\n`;
      content += `    states: ['${stateCode}'],\n`;
      content += `    direction: null,\n`;
      content += `    parentHighwayId: null,\n`;
      content += `    totalExits: ${highway.totalExits},\n`;
      content += `  },\n`;
    }
    
    content += `];\n\n`;
  }

  // Generate combined array
  content += `/**
 * ALL ${stateCode.toUpperCase()} HIGHWAYS
 */\n\n`;
  content += `export const ALL_${stateCode.toUpperCase()}_HIGHWAYS: HighwayData[] = [\n`;
  
  if (interstates.length > 0) {
    content += `  ...${stateCode.toUpperCase()}_INTERSTATES,\n`;
  }
  if (usHighways.length > 0) {
    content += `  ...${stateCode.toUpperCase()}_US_HIGHWAYS,\n`;
  }
  if (stateHighways.length > 0) {
    content += `  ...${stateCode.toUpperCase()}_STATE_HIGHWAYS,\n`;
  }
  
  content += `];\n\n`;

  // Generate statistics
  content += `/**
 * STATISTICS
 */\n`;
  content += `export const ${stateCode.toUpperCase()}_HIGHWAY_STATS = {\n`;
  content += `  totalHighways: ALL_${stateCode.toUpperCase()}_HIGHWAYS.length,\n`;
  content += `  interstates: ${interstates.length},\n`;
  content += `  usHighways: ${usHighways.length},\n`;
  content += `  stateHighways: ${stateHighways.length},\n`;
  content += `  totalExits: ALL_${stateCode.toUpperCase()}_HIGHWAYS.reduce((sum, hw) => sum + hw.totalExits, 0),\n`;
  content += `};\n\n`;

  // Generate helper functions
  content += `/**
 * Helper Functions
 */\n`;
  content += `export function get${className}HighwayById(id: string): HighwayData | undefined {\n`;
  content += `  return ALL_${stateCode.toUpperCase()}_HIGHWAYS.find(hw => hw.id === id);\n`;
  content += `}\n\n`;
  
  content += `export function get${className}HighwaysByType(type: ExplorerHighway['highwayType']): HighwayData[] {\n`;
  content += `  return ALL_${stateCode.toUpperCase()}_HIGHWAYS.filter(hw => hw.highwayType === type);\n`;
  content += `}\n`;

  return content;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const statesToProcess = args.length > 0 ? args : TOP_10_STATES.map(s => s.code);
  
  console.log('🚀 Starting highway data collection...');
  console.log(`📊 Processing states: ${statesToProcess.join(', ')}`);
  
  const results = {};
  
  for (const stateCode of statesToProcess) {
    if (stateCode === 'TX') {
      console.log(`⏭️  Skipping Texas (already processed)`);
      continue;
    }
    
    const stateInfo = TOP_10_STATES.find(s => s.code === stateCode);
    if (!stateInfo) {
      console.log(`⚠️  Unknown state code: ${stateCode}`);
      continue;
    }
    
    try {
      // Fetch data
      const rawData = await fetchHighwayData(stateCode);
      
      if (rawData.length === 0) {
        console.log(`⚠️  No data found for ${stateCode}`);
        continue;
      }
      
      // Process data
      const highways = processHighwayData(rawData, stateCode);
      
      // Generate TypeScript file
      const tsContent = generateTypeScriptFile(highways, stateCode, stateInfo.name);
      
      // Write file
      const filename = `${stateCode.toLowerCase()}-highways.ts`;
      const filepath = path.join(__dirname, '..', 'data', filename);
      
      await fs.writeFile(filepath, tsContent, 'utf8');
      
      console.log(`✅ Generated ${filename} with ${highways.length} highways`);
      
      results[stateCode] = {
        highways: highways.length,
        interstates: highways.filter(h => h.highwayType === 'interstate').length,
        usHighways: highways.filter(h => h.highwayType === 'us').length,
        stateHighways: highways.filter(h => h.highwayType === 'state').length,
      };
      
      // Add delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to process ${stateCode}:`, error.message);
    }
  }
  
  // Print summary
  console.log('\n📊 COLLECTION SUMMARY:');
  console.log('====================');
  
  for (const [stateCode, stats] of Object.entries(results)) {
    console.log(`${stateCode}: ${stats.highways} total (${stats.interstates} I, ${stats.usHighways} US, ${stats.stateHighways} State)`);
  }
  
  console.log('\n🎉 Highway data collection complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchHighwayData, processHighwayData, generateTypeScriptFile };
