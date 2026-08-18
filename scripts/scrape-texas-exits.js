/**
 * Texas Highway Exit Scraper
 * Scrapes exit data from iExit app and generates TypeScript files
 * 
 * Usage: node scripts/scrape-texas-exits.js
 */

/* eslint-env node */
/* global __dirname */

const https = require('https');
const fs = require('fs');
const path = require('path');

const IEXIT_BASE_URL = 'https://www.iexitapp.com';

// Major Texas Interstates to scrape (starting with most important)
const TEXAS_INTERSTATES = [
  { number: '35', directions: ['North', 'South'], id: 680 }, // I-35
  { number: '10', directions: ['East', 'West'], id: 645 },   // I-10
  { number: '45', directions: ['North', 'South'], id: 670 }, // I-45
  { number: '20', directions: ['East', 'West'], id: 650 },   // I-20
  { number: '30', directions: ['East', 'West'], id: 655 },   // I-30
  { number: '37', directions: ['North', 'South'], id: 660 }, // I-37
  { number: '27', directions: ['North', 'South'], id: 652 }, // I-27
  { number: '35E', directions: ['North', 'South'], id: 681 },// I-35E
  { number: '35W', directions: ['North', 'South'], id: 682 },// I-35W
  { number: '410', directions: ['Loop'], id: 685 },          // I-410 (San Antonio Loop)
  { number: '610', directions: ['Loop'], id: 690 },          // I-610 (Houston Loop)
  { number: '820', directions: ['Loop'], id: 695 },          // I-820 (Fort Worth Loop)
  { number: '635', directions: ['Loop'], id: 692 },          // I-635 (Dallas Loop)
];

/**
 * Fetch HTML from a URL
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

/**
 * Parse exit data from iExit HTML
 */
function parseExits(html, highwayNumber, direction) {
  const exits = [];
  
  // iExit uses a specific HTML structure for exits
  // Pattern: <div class="exit-item">...</div> or similar
  // We'll look for exit numbers and descriptions
  
  // Match patterns like:
  // Exit 330B - Meridian, Marlin
  // Exit 234 - FM 2222 / Koenig Lane
  
  const exitPattern = /(?:Exit\s+)?(\d+[A-Z]?)\s*[-–—]\s*([^<>\n]+)/gi;
  let match;
  
  while ((match = exitPattern.exec(html)) !== null) {
    const exitNumber = match[1].trim();
    const description = match[2].trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .slice(0, 200); // Limit description length
    
    if (description && description.length > 2) {
      exits.push({
        exitNumber,
        description,
      });
    }
  }
  
  // Alternative pattern: Look for structured data
  // Some pages might have JSON-LD or data attributes
  const jsonLdPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let jsonMatch;
  
  while ((jsonMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      // Extract exit data from JSON-LD if available
      if (jsonData.exits) {
        jsonData.exits.forEach(exit => {
          exits.push({
            exitNumber: exit.number || exit.exitNumber,
            description: exit.name || exit.description,
          });
        });
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }
  
  console.log(`  Found ${exits.length} exits for I-${highwayNumber} ${direction}`);
  return exits;
}

/**
 * Scrape exits for a single highway direction
 */
async function scrapeHighwayDirection(highway, direction) {
  const url = `${IEXIT_BASE_URL}/exits/Texas/I-${highway.number}/${direction}/${highway.id}`;
  
  console.log(`\nScraping: I-${highway.number} ${direction}`);
  console.log(`URL: ${url}`);
  
  try {
    const html = await fetchHTML(url);
    const exits = parseExits(html, highway.number, direction);
    
    // Remove duplicates (keep first occurrence)
    const uniqueExits = [];
    const seen = new Set();
    
    for (const exit of exits) {
      const key = `${exit.exitNumber}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueExits.push(exit);
      }
    }
    
    return {
      highway: highway.number,
      direction,
      exits: uniqueExits,
    };
  } catch (error) {
    console.error(`  ❌ Error scraping I-${highway.number} ${direction}:`, error.message);
    return {
      highway: highway.number,
      direction,
      exits: [],
      error: error.message,
    };
  }
}

/**
 * Scrape all directions for all highways
 */
async function scrapeAllHighways() {
  const results = [];
  
  for (const highway of TEXAS_INTERSTATES) {
    for (const direction of highway.directions) {
      const result = await scrapeHighwayDirection(highway, direction);
      results.push(result);
      
      // Be polite: wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

/**
 * Merge exits from different directions (Northbound + Southbound, etc.)
 */
function mergeDirections(results) {
  const merged = {};
  
  for (const result of results) {
    const key = `I-${result.highway}`;
    
    if (!merged[key]) {
      merged[key] = {
        highway: result.highway,
        exits: [],
      };
    }
    
    merged[key].exits.push(...result.exits);
  }
  
  // Sort exits by exit number (numeric sort)
  for (const key in merged) {
    merged[key].exits.sort((a, b) => {
      const aNum = parseInt(a.exitNumber);
      const bNum = parseInt(b.exitNumber);
      return aNum - bNum;
    });
    
    // Remove duplicates again after merging
    const uniqueExits = [];
    const seen = new Set();
    
    for (const exit of merged[key].exits) {
      const exitKey = `${exit.exitNumber}-${exit.description}`;
      if (!seen.has(exitKey)) {
        seen.add(exitKey);
        uniqueExits.push(exit);
      }
    }
    
    merged[key].exits = uniqueExits;
  }
  
  return merged;
}

/**
 * Generate TypeScript file with exit data
 */
function generateTypeScriptFile(mergedData, outputPath) {
  let tsContent = `/**
 * Texas Highway Exit Data
 * Auto-generated from iExit app data
 * Generated: ${new Date().toISOString()}
 * 
 * DO NOT EDIT MANUALLY - Run scripts/scrape-texas-exits.js to regenerate
 */

import type { ExplorerHighwayExit } from '../types/explorer';

`;

  // Generate individual arrays for each highway
  for (const [key, data] of Object.entries(mergedData)) {
    const varName = `INTERSTATE_${data.highway.replace(/[^A-Z0-9]/gi, '_')}_EXITS`;
    
    tsContent += `export const ${varName}: Omit<ExplorerHighwayExit, 'id' | 'type' | 'highwayId' | 'visited' | 'firstVisited' | 'lastVisited' | 'visitCount'>[] = [\n`;
    
    for (const exit of data.exits) {
      const description = exit.description.replace(/'/g, "\\'");
      tsContent += `  { exitNumber: '${exit.exitNumber}', description: '${description}', coordinates: { latitude: 0, longitude: 0 } },\n`;
    }
    
    tsContent += `];\n\n`;
  }
  
  // Generate summary object
  tsContent += `/**
 * All Texas Interstate Exits
 */
export const ALL_TEXAS_INTERSTATE_EXITS = {\n`;
  
  for (const [key, data] of Object.entries(mergedData)) {
    const varName = `INTERSTATE_${data.highway.replace(/[^A-Z0-9]/gi, '_')}_EXITS`;
    tsContent += `  'interstate-${data.highway.toLowerCase()}': ${varName},\n`;
  }
  
  tsContent += `};\n\n`;
  
  // Generate stats
  let totalExits = 0;
  for (const data of Object.values(mergedData)) {
    totalExits += data.exits.length;
  }
  
  tsContent += `/**
 * Exit Statistics
 * Total Interstates: ${Object.keys(mergedData).length}
 * Total Exits: ${totalExits}
 */\n`;
  
  fs.writeFileSync(outputPath, tsContent, 'utf8');
  console.log(`\n✅ Generated TypeScript file: ${outputPath}`);
  console.log(`📊 Total Interstates: ${Object.keys(mergedData).length}`);
  console.log(`📊 Total Exits: ${totalExits}`);
}

/**
 * Save raw JSON data for inspection
 */
function saveRawData(results, mergedData) {
  const rawPath = path.join(__dirname, '../data/texas-exits-raw.json');
  fs.writeFileSync(rawPath, JSON.stringify({ raw: results, merged: mergedData }, null, 2), 'utf8');
  console.log(`\n💾 Saved raw data: ${rawPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Texas Highway Exit Scraper...\n');
  console.log(`Scraping ${TEXAS_INTERSTATES.length} interstates...`);
  console.log('This will take several minutes to be polite to the server.\n');
  
  try {
    // Scrape all highways
    const results = await scrapeAllHighways();
    
    // Merge directions
    const mergedData = mergeDirections(results);
    
    // Save raw data
    saveRawData(results, mergedData);
    
    // Generate TypeScript file
    const outputPath = path.join(__dirname, '../data/texas-interstate-exits.ts');
    generateTypeScriptFile(mergedData, outputPath);
    
    console.log('\n✅ Scraping complete!');
    console.log('\nNext steps:');
    console.log('1. Review data/texas-exits-raw.json');
    console.log('2. Import exits in services/explorer.ts');
    console.log('3. Update highway initialization to include exit data');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scrapeAllHighways, parseExits, mergeDirections };



