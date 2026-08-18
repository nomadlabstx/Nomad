#!/usr/bin/env node

/**
 * Process TIGER/Line Place Shapefiles
 * Extracts place data from Census TIGER/Line shapefile ZIPs
 * 
 * Usage: node scripts/process-tiger-places.js
 */

const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');
const shapefile = require('shapefile');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const DATA_DIR = 'C:\\Users\\majim\\OneDrive\\Documents\\Nomad Data';

// State code mapping (FIPS codes to state abbreviations)
const STATE_FIPS_TO_CODE = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY'
};

/**
 * Extract and parse a single state ZIP file using shapefile library
 */
async function processStateZip(zipPath) {
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();
  
  let shpEntry = null;
  let dbfEntry = null;
  let shxEntry = null;
  
  for (const entry of zipEntries) {
    if (entry.entryName.endsWith('.shp') && !entry.isDirectory) {
      shpEntry = entry;
    }
    if (entry.entryName.endsWith('.dbf') && !entry.isDirectory) {
      dbfEntry = entry;
    }
    if (entry.entryName.endsWith('.shx') && !entry.isDirectory) {
      shxEntry = entry;
    }
  }
  
  if (!shpEntry || !dbfEntry) {
    console.log(`   ⚠️  Missing required files (shp or dbf)`);
    return [];
  }
  
  // Extract state FIPS code from filename
  const stateFips = path.basename(zipPath).match(/tl_2024_(\d+)_place/)?.[1];
  const stateCode = STATE_FIPS_TO_CODE[stateFips] || stateFips;
  
  // Extract all shapefile components to temp location
  const tempDir = path.join(__dirname, '..', 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const baseName = path.basename(shpEntry.entryName, '.shp');
  const tempBase = path.join(tempDir, `temp_${Date.now()}_${baseName}`);
  
  // Extract all components
  zip.extractEntryTo(shpEntry, tempDir, false, true);
  zip.extractEntryTo(dbfEntry, tempDir, false, true);
  if (shxEntry) {
    zip.extractEntryTo(shxEntry, tempDir, false, true);
  }
  
  // Rename to have consistent base name
  const shpPath = path.join(tempDir, shpEntry.entryName);
  const dbfPath = path.join(tempDir, dbfEntry.entryName);
  const shxPath = shxEntry ? path.join(tempDir, shxEntry.entryName) : null;
  
  const finalShpPath = `${tempBase}.shp`;
  const finalDbfPath = `${tempBase}.dbf`;
  const finalShxPath = shxPath ? `${tempBase}.shx` : null;
  
  try {
    await fs.rename(shpPath, finalShpPath);
    await fs.rename(dbfPath, finalDbfPath);
    if (shxPath && finalShxPath) {
      await fs.rename(shxPath, finalShxPath);
    }
  } catch (e) {
    // Files might already be in correct location
  }
  
  const places = [];
  
  try {
    // Read shapefile using shapefile library
    const source = await shapefile.open(finalShpPath);
    
    let result;
    while ((result = await source.read()) && !result.done) {
      const feature = result.value;
      const properties = feature.properties;
      
      // Extract place information from properties
      // Common fields: NAME, NAMELSAD, PLACEFP, CLASSFP, etc.
      const name = properties.NAME || properties.NAMELSAD || properties.NAME20 || '';
      const nameLsad = properties.NAMELSAD || properties.NAME || '';
      const placeType = properties.CLASSFP || '';
      
      // Determine if it's incorporated (C) or CDP (S)
      const isCDP = placeType === 'S' || 
                   (nameLsad && (nameLsad.includes('CDP') || nameLsad.includes('Census Designated Place')));
      
      if (name && name.trim()) {
        // Clean the name
        let cleanName = name.trim();
        cleanName = cleanName.replace(/\s+CDP\s*$/i, '');
        cleanName = cleanName.replace(/\s+Census Designated Place\s*$/i, '');
        
        places.push({
          name: cleanName,
          stateCode: stateCode,
          type: isCDP ? 'CDP' : 'incorporated',
          originalName: name,
          nameLsad: nameLsad || name
        });
      }
    }
    
    await source.close();
  } catch (error) {
    console.log(`   ❌ Error reading shapefile: ${error.message}`);
  } finally {
    // Cleanup temp files
    try {
      await fs.unlink(finalShpPath).catch(() => {});
      await fs.unlink(finalDbfPath).catch(() => {});
      if (finalShxPath) {
        await fs.unlink(finalShxPath).catch(() => {});
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  return places;
}

/**
 * Main execution
 */
async function main() {
  console.log('🗺️  Processing TIGER/Line Place Shapefiles');
  console.log('='.repeat(70));
  
  // Find all state ZIP files
  const zipFiles = [];
  const files = await fs.readdir(DATA_DIR);
  
  for (const file of files) {
    if (file.match(/tl_2024_\d+_place\.zip$/)) {
      zipFiles.push(path.join(DATA_DIR, file));
    }
  }
  
  zipFiles.sort();
  
  console.log(`\n📊 Found ${zipFiles.length} state ZIP files`);
  console.log('📦 Extracting place data from shapefiles...\n');
  
  const allPlaces = [];
  
  for (let i = 0; i < zipFiles.length; i++) {
    const zipFile = zipFiles[i];
    const stateFips = path.basename(zipFile).match(/tl_2024_(\d+)_place/)?.[1];
    const stateCode = STATE_FIPS_TO_CODE[stateFips] || stateFips;
    
    process.stdout.write(`[${i + 1}/${zipFiles.length}] Processing ${stateCode || stateFips}... `);
    
    try {
      const places = await processStateZip(zipFile);
      allPlaces.push(...places);
      
      const incorporated = places.filter(p => p.type === 'incorporated').length;
      const cdps = places.filter(p => p.type === 'CDP').length;
      
      console.log(`✅ ${places.length} places (${incorporated} incorporated, ${cdps} CDPs)`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Total places extracted: ${allPlaces.length}`);
  console.log(`   Incorporated: ${allPlaces.filter(p => p.type === 'incorporated').length}`);
  console.log(`   CDPs: ${allPlaces.filter(p => p.type === 'CDP').length}`);
  
  // Save extracted places
  const outputPath = path.join(__dirname, '..', 'data', 'extracted-tiger-places.json');
  await fs.writeFile(outputPath, JSON.stringify(allPlaces, null, 2));
  console.log(`\n✅ Saved extracted places to: ${outputPath}`);
  console.log('\n💡 Next step: Process these places through geocoding...');
  console.log('   Run: node scripts/geocode-extracted-places.js');
}

if (require.main === module) {
  main().catch(console.error);
}
