#!/usr/bin/env node

/**
 * Manually fix Wall Lake, IN
 * Based on coordinates 41.7278677, -85.2023569, this is in Steuben County, IN
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'us-cities-with-counties.ts');

console.log('🔧 Manually fixing Wall Lake, IN');
console.log('='.repeat(70));

let content = fs.readFileSync(filePath, 'utf8');

// Find Wall Lake with Unknown County
const wallLakePattern = /({\s*name:\s*['"]Wall Lake['"]\s*,\s*state:\s*['"]IN['"]\s*,\s*stateCode:\s*['"]IN['"]\s*,\s*county:\s*['"])Unknown County(['"]\s*,\s*[^}]+})/;

const match = content.match(wallLakePattern);

if (match) {
  // Replace Unknown County with Steuben County
  content = content.replace(wallLakePattern, `$1Steuben County$2`);
  
  // Also need to move it from Unknown County section to Steuben County section
  // First, extract the city entry
  const cityEntry = match[0].replace(/county:\s*['"]Unknown County['"]/, "county: 'Steuben County'");
  
  // Remove from Unknown County section
  content = content.replace(wallLakePattern, '');
  
  // Find Indiana and Steuben County section
  const indianaPattern = /(code:\s*['"]IN['"][\s\S]*?counties:\s*\[[\s\S]*?)({\s*name:\s*['"]Steuben County['"]\s*,\s*cities:\s*\[)/;
  
  const indianaMatch = content.match(indianaPattern);
  
  if (indianaMatch) {
    // Steuben County exists, add Wall Lake to it
    content = content.replace(indianaPattern, `$1$2\n          ${cityEntry},`);
  } else {
    // Need to create Steuben County section
    // Find where to insert it in Indiana
    const insertPattern = /(code:\s*['"]IN['"][\s\S]*?counties:\s*\[)([\s\S]*?)(\]\s*})/;
    
    content = content.replace(insertPattern, `$1$2      {
        name: 'Steuben County',
        cities: [
          ${cityEntry},
        ]
      },
$3`);
  }
  
  // Clean up empty Unknown County sections
  content = content.replace(/{\s*name:\s*['"]Unknown County['"]\s*,\s*cities:\s*\[\s*\]\s*}/g, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully updated Wall Lake, IN to Steuben County');
} else {
  console.log('❌ Could not find Wall Lake with Unknown County');
  
  // Try to find it in the Unknown County section
  const unknownSectionPattern = /{\s*name:\s*['"]Unknown County['"]\s*,\s*cities:\s*\[([\s\S]*?)\]\s*}/;
  const unknownMatch = content.match(unknownSectionPattern);
  
  if (unknownMatch && unknownMatch[1].includes('Wall Lake')) {
    console.log('   Found Wall Lake in Unknown County section, attempting manual fix...');
    // Extract the full city entry
    const cityFullPattern = /{\s*name:\s*['"]Wall Lake['"][\s\S]*?stateCode:\s*['"]IN['"][\s\S]*?}/;
    const cityFullMatch = unknownMatch[1].match(cityFullPattern);
    
    if (cityFullMatch) {
      const cityEntry = cityFullMatch[0].replace(/county:\s*['"]Unknown County['"]/, "county: 'Steuben County'");
      
      // Remove from Unknown County
      content = content.replace(unknownSectionPattern, (match, cities) => {
        const updatedCities = cities.replace(cityFullPattern, '');
        return updatedCities.trim() ? `{ name: 'Unknown County', cities: [${updatedCities}] }` : '';
      });
      
      // Add to Steuben County
      const steubenPattern = /(code:\s*['"]IN['"][\s\S]*?{\s*name:\s*['"]Steuben County['"]\s*,\s*cities:\s*\[)/;
      if (steubenPattern.test(content)) {
        content = content.replace(steubenPattern, `$1\n          ${cityEntry},`);
      } else {
        // Create Steuben County
        const insertPattern = /(code:\s*['"]IN['"][\s\S]*?counties:\s*\[)([\s\S]*?)(\]\s*})/;
        content = content.replace(insertPattern, `$1$2      {
        name: 'Steuben County',
        cities: [
          ${cityEntry},
        ]
      },
$3`);
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('✅ Successfully moved Wall Lake to Steuben County');
    }
  }
}

console.log('✅ Done!');

