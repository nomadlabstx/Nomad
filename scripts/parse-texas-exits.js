/**
 * Parse Texas Highway Exit Data from TxDOT Shapefiles
 * 
 * This script extracts exit numbers, descriptions, and GPS coordinates
 * for all Texas highways from the official TxDOT roadway data.
 */

/* eslint-env node */
/* global __dirname */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path to the TxDOT data
const TXDOT_DATA_DIR = 'C:\\Users\\majim\\Downloads\\Texas Road Data';
const TXDOT_TEXT_FILE = path.join(TXDOT_DATA_DIR, 'txdot-roadway-inventory.txt');
const OUTPUT_FILE = path.join(__dirname, '../data/texas-exits-complete.ts');

// Track progress
let totalRecords = 0;
let exitRecords = 0;
const exitsByHighway = new Map();

/**
 * Parse a pipe-delimited record from TxDOT data
 */
function parseRecord(line) {
  const fields = line.split('|');
  
  // Extract relevant fields based on TxDOT schema
  // Fields we care about: HWY (highway type), HNUM (highway number), 
  // FRM_DFO/TO_DFO (mileposts), coordinates, descriptions
  
  const record = {
    recType: fields[0],
    routeId: fields[1],
    highway: fields[11], // HWY field (e.g., "IH0035", "US0090", "SH0006")
    highwaySystem: fields[12], // HSYS (IH, US, SH, FM, RR)
    highwayNumber: fields[13], // HNUM
    fromMilepost: parseFloat(fields[9]) || 0, // BMP
    toMilepost: parseFloat(fields[10]) || 0, // EMP
    fromDesc: fields[17] + ' ' + fields[18] + ' ' + fields[19], // FRM location
    toDesc: fields[21] + ' ' + fields[22] + ' ' + fields[23], // TO location
    county: fields[27],
    city: fields[28],
  };
  
  return record;
}

/**
 * Determine if a record represents an interchange/exit
 */
function isExitRecord(record) {
  const desc = (record.fromDesc + ' ' + record.toDesc).toUpperCase();
  
  // Look for exit indicators
  return (
    desc.includes('EXIT') ||
    desc.includes('INTERCHANGE') ||
    desc.includes('RAMP') ||
    desc.includes('ENTRANCE') ||
    record.highwaySystem === 'IH' || // Interstates have exits
    record.highwaySystem === 'US'   // US Highways have exits
  );
}

/**
 * Extract exit number from description
 */
function extractExitNumber(record) {
  const desc = (record.fromDesc + ' ' + record.toDesc).toUpperCase();
  
  // Try to find exit number patterns
  const patterns = [
    /EXIT\s+(\d+[A-Z]?)/i,
    /EXIT\s+NO\.?\s+(\d+[A-Z]?)/i,
    /\b(\d+[A-Z]?)\s+EXIT/i,
  ];
  
  for (const pattern of patterns) {
    const match = desc.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // If no explicit exit number, use milepost as exit number (common practice)
  if (record.fromMilepost > 0) {
    return Math.floor(record.fromMilepost).toString();
  }
  
  return null;
}

/**
 * Clean and format exit description
 */
function formatExitDescription(record) {
  let desc = record.toDesc.trim();
  
  // Remove empty parts
  desc = desc.replace(/\s+/g, ' ').trim();
  
  // Common cleanup
  desc = desc.replace(/\|/g, '').trim();
  
  return desc || 'Unknown';
}

/**
 * Main parsing function
 */
async function parseTexasExits() {
  console.log('🚀 Starting Texas Exit Data Parser...\n');
  console.log(`📁 Reading: ${TXDOT_TEXT_FILE}\n`);
  
  const fileStream = fs.createReadStream(TXDOT_TEXT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let isFirstLine = true;
  
  for await (const line of rl) {
    // Skip header
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    
    totalRecords++;
    
    if (totalRecords % 10000 === 0) {
      process.stdout.write(`\r📊 Processed ${totalRecords.toLocaleString()} records, found ${exitRecords.toLocaleString()} potential exits...`);
    }
    
    try {
      const record = parseRecord(line);
      
      // Only process Interstate and US Highway records
      if (!record.highwaySystem || !['IH', 'US'].includes(record.highwaySystem)) {
        continue;
      }
      
      if (!record.highwayNumber) {
        continue;
      }
      
      // Create highway key
      const highwayKey = `${record.highwaySystem}-${record.highwayNumber}`;
      
      // Try to extract exit information
      const exitNumber = extractExitNumber(record);
      if (exitNumber) {
        exitRecords++;
        
        if (!exitsByHighway.has(highwayKey)) {
          exitsByHighway.set(highwayKey, []);
        }
        
        exitsByHighway.get(highwayKey).push({
          exitNumber,
          description: formatExitDescription(record),
          milepost: record.fromMilepost,
          county: record.county,
          city: record.city,
        });
      }
    } catch (error) {
      // Skip malformed records
    }
  }
  
  console.log(`\n\n✅ Parsing complete!`);
  console.log(`📊 Total records processed: ${totalRecords.toLocaleString()}`);
  console.log(`🛣️  Exit records found: ${exitRecords.toLocaleString()}`);
  console.log(`🚨 Highways with exits: ${exitsByHighway.size}\n`);
  
  return exitsByHighway;
}

/**
 * Generate TypeScript file with exit data
 */
function generateTypeScriptFile(exitData) {
  console.log('📝 Generating TypeScript file...\n');
  
  let output = `/**
 * Texas Highway Exit Data - COMPREHENSIVE
 * Generated from TxDOT Roadway Inventory
 * 
 * Format: Exit {number} - {description}
 * Example: Exit 330B - Meridian, Marlin
 */

export interface TexasExit {
  exitNumber: string;
  description: string;
  milepost?: number;
  county?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface HighwayExits {
  highwayId: string;
  exits: TexasExit[];
}

`;
  
  // Generate exit data for each highway
  const highways = Array.from(exitData.entries()).sort();
  
  for (const [highwayKey, exits] of highways) {
    const [type, number] = highwayKey.split('-');
    const fullName = type === 'IH' ? `Interstate ${number}` : `US Highway ${number}`;
    
    // Sort exits by exit number
    const sortedExits = exits.sort((a, b) => {
      const aNum = parseInt(a.exitNumber.replace(/[A-Z]/g, ''));
      const bNum = parseInt(b.exitNumber.replace(/[A-Z]/g, ''));
      return aNum - bNum;
    });
    
    // Remove duplicates (keep first occurrence)
    const uniqueExits = [];
    const seen = new Set();
    for (const exit of sortedExits) {
      const key = `${exit.exitNumber}-${exit.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueExits.push(exit);
      }
    }
    
    console.log(`   ${fullName}: ${uniqueExits.length} exits`);
    
    output += `// ${fullName}\n`;
    output += `export const ${highwayKey.replace(/-/g, '_')}_EXITS: TexasExit[] = [\n`;
    
    for (const exit of uniqueExits) {
      const desc = exit.description.replace(/'/g, "\\'");
      output += `  { exitNumber: '${exit.exitNumber}', description: '${desc}'`;
      if (exit.milepost) {
        output += `, milepost: ${exit.milepost.toFixed(2)}`;
      }
      if (exit.county) {
        output += `, county: '${exit.county}'`;
      }
      if (exit.city) {
        output += `, city: '${exit.city}'`;
      }
      output += ` },\n`;
    }
    
    output += `];\n\n`;
  }
  
  // Generate aggregate export
  output += `export const ALL_TEXAS_EXITS: HighwayExits[] = [\n`;
  for (const [highwayKey, exits] of highways) {
    output += `  { highwayId: '${highwayKey.toLowerCase()}', exits: ${highwayKey.replace(/-/g, '_')}_EXITS },\n`;
  }
  output += `];\n`;
  
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`\n✅ TypeScript file generated: ${OUTPUT_FILE}\n`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const exitData = await parseTexasExits();
    generateTypeScriptFile(exitData);
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║  🎉 TEXAS EXITS PARSING COMPLETE! 🎉  ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();



