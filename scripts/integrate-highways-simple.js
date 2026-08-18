#!/usr/bin/env node

/**
 * Simple Highway Integration Script
 * Integrates collected state highway data into the Explorer system
 * 
 * Usage: node scripts/integrate-highways-simple.js [state-codes]
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Load state highway data by importing the generated files
 */
async function loadStateHighways(stateCode) {
  const filename = `${stateCode.toLowerCase()}-highways.ts`;
  const filepath = path.join(__dirname, '..', 'data', filename);
  
  try {
    const content = await fs.readFile(filepath, 'utf8');
    
    // Count highways by looking for the pattern "id: 'highway-id',"
    const idMatches = content.match(/id:\s*'[^']+',/g);
    const highwayCount = idMatches ? idMatches.length : 0;
    
    console.log(`   Found ${highwayCount} highways in ${filename}`);
    
    // For now, return a simple count - we'll integrate the actual data later
    return {
      stateCode,
      count: highwayCount,
      filepath
    };
    
  } catch (error) {
    console.error(`Error loading ${stateCode} highways:`, error.message);
    return { stateCode, count: 0, filepath: null };
  }
}

/**
 * Update Explorer service to include new state highways
 */
async function updateExplorerService(newStates) {
  const explorerPath = path.join(__dirname, '..', 'services', 'explorer.ts');
  
  try {
    let content = await fs.readFile(explorerPath, 'utf8');
    
    // Add import statements for new state highway files
    const importSection = content.substring(0, content.indexOf('import { locationAutoDiscovery }'));
    
    let newImports = importSection;
    for (const stateCode of newStates) {
      const importLine = `import { ALL_${stateCode.toUpperCase()}_HIGHWAYS } from '../data/${stateCode.toLowerCase()}-highways';\n`;
      if (!newImports.includes(importLine)) {
        newImports += importLine;
      }
    }
    
    const finalContent = newImports + content.substring(content.indexOf('import { locationAutoDiscovery }'));
    
    // Add initialize methods for each state
    const classEnd = finalContent.lastIndexOf('}');
    let newMethods = '';
    
    for (const stateCode of newStates) {
      newMethods += `
  /**
   * Initialize ${stateCode} highways
   */
  private initializeAll${stateCode}Highways(): ExplorerHighway[] {
    return ALL_${stateCode.toUpperCase()}_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: null,
      lastVisited: null,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }
`;
    }
    
    const finalContentWithMethods = finalContent.substring(0, classEnd) + newMethods + '\n' + finalContent.substring(classEnd);
    
    // Update the initializeAllUSLocations method to include new states
    const methodStart = finalContentWithMethods.indexOf('highways: stateData.code === \'TX\' ? this.initializeAllTexasHighways() : []');
    
    if (methodStart !== -1) {
      let newHighwayLogic = 'highways: stateData.code === \'TX\' ? this.initializeAllTexasHighways() : ';
      
      // Add conditions for each new state
      for (const stateCode of newStates) {
        newHighwayLogic += `stateData.code === '${stateCode}' ? this.initializeAll${stateCode}Highways() : `;
      }
      
      newHighwayLogic += '[]';
      
      const updatedContent = finalContentWithMethods.replace(
        /highways: stateData\.code === 'TX' \? this\.initializeAllTexasHighways\(\) : \[\]/,
        newHighwayLogic
      );
      
      await fs.writeFile(explorerPath, updatedContent, 'utf8');
    } else {
      await fs.writeFile(explorerPath, finalContentWithMethods, 'utf8');
    }
    
    console.log(`✅ Updated Explorer service with ${newStates.length} new states`);
    
  } catch (error) {
    console.error('Error updating Explorer service:', error.message);
    throw error;
  }
}

/**
 * Create a combined highway data file for easy access
 */
async function createCombinedHighwayFile(states) {
  const combinedPath = path.join(__dirname, '..', 'data', 'all-state-highways.ts');
  
  let content = `/**
 * Combined State Highway Database
 * All highways from multiple states
 * 
 * Generated: ${new Date().toISOString()}
 */

`;

  // Add imports
  for (const stateCode of states) {
    content += `import { ALL_${stateCode.toUpperCase()}_HIGHWAYS } from './${stateCode.toLowerCase()}-highways';\n`;
  }
  
  content += `\nimport type { ExplorerHighway } from '../types/explorer';\n\n`;
  
  // Create combined array
  content += `export const ALL_STATE_HIGHWAYS: ExplorerHighway[] = [\n`;
  
  for (const stateCode of states) {
    content += `  ...ALL_${stateCode.toUpperCase()}_HIGHWAYS,\n`;
  }
  
  content += `];\n\n`;
  
  // Add statistics
  content += `export const COMBINED_HIGHWAY_STATS = {\n`;
  content += `  totalHighways: ALL_STATE_HIGHWAYS.length,\n`;
  content += `  states: ${states.length},\n`;
  content += `  interstates: ALL_STATE_HIGHWAYS.filter(h => h.highwayType === 'interstate').length,\n`;
  content += `  usHighways: ALL_STATE_HIGHWAYS.filter(h => h.highwayType === 'us').length,\n`;
  content += `  stateHighways: ALL_STATE_HIGHWAYS.filter(h => h.highwayType === 'state').length,\n`;
  content += `  totalExits: ALL_STATE_HIGHWAYS.reduce((sum, h) => sum + h.totalExits, 0),\n`;
  content += `};\n`;
  
  await fs.writeFile(combinedPath, content, 'utf8');
  
  console.log(`✅ Created combined highway file with ${states.length} states`);
}

/**
 * Main integration function
 */
async function main() {
  const args = process.argv.slice(2);
  const statesToIntegrate = args.length > 0 ? args : ['CA', 'FL', 'NY'];
  
  console.log('🔗 Starting highway data integration...');
  console.log(`📊 Integrating states: ${statesToIntegrate.join(', ')}`);
  
  // Load highway data for each state
  const allHighways = {};
  let totalHighways = 0;
  
  for (const stateCode of statesToIntegrate) {
    console.log(`\n📁 Loading ${stateCode} highways...`);
    
    const result = await loadStateHighways(stateCode);
    allHighways[stateCode] = result;
    totalHighways += result.count;
  }
  
  // Update Explorer service
  console.log('\n🔧 Updating Explorer service...');
  await updateExplorerService(statesToIntegrate);
  
  // Create combined file
  console.log('\n📄 Creating combined highway file...');
  await createCombinedHighwayFile(statesToIntegrate);
  
  // Summary
  console.log('\n📊 INTEGRATION SUMMARY:');
  console.log('======================');
  
  for (const [stateCode, result] of Object.entries(allHighways)) {
    console.log(`${stateCode}: ${result.count} highways`);
  }
  
  console.log(`\n🎯 Total Highways Integrated: ${totalHighways}`);
  console.log('🎉 Highway integration complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Test the Explorer system with new data');
  console.log('   2. Verify UI displays new highways correctly');
  console.log('   3. Test highway tracking functionality');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { loadStateHighways, updateExplorerService, createCombinedHighwayFile };
