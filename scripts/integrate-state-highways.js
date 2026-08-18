#!/usr/bin/env node

/**
 * State Highway Integration Script
 * Integrates collected state highway data into the Explorer system
 * 
 * Usage: node scripts/integrate-state-highways.js [state-codes]
 * Example: node scripts/integrate-state-highways.js CA FL NY
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Load state highway data
 */
async function loadStateHighways(stateCode) {
  const filename = `${stateCode.toLowerCase()}-highways.ts`;
  const filepath = path.join(__dirname, '..', 'data', filename);
  
  try {
    const content = await fs.readFile(filepath, 'utf8');
    
    // Extract the ALL_STATE_HIGHWAYS array using regex
    const arrayMatch = content.match(/export const ALL_([A-Z]+)_HIGHWAYS: HighwayData\[\] = \[([\s\S]*?)\];/);
    
    if (!arrayMatch) {
      throw new Error('Could not find ALL_STATE_HIGHWAYS array');
    }
    
    const arrayContent = arrayMatch[2];
    
    // Parse individual highway objects
    const highways = [];
    const highwayMatches = arrayContent.match(/{\s*id:\s*'([^']+)',[\s\S]*?}/g);
    
    if (highwayMatches) {
      for (const match of highwayMatches) {
        const idMatch = match.match(/id:\s*'([^']+)'/);
        const nameMatch = match.match(/name:\s*'([^']+)'/);
        const typeMatch = match.match(/type:\s*'([^']+)'/);
        const highwayTypeMatch = match.match(/highwayType:\s*'([^']+)'/);
        const numberMatch = match.match(/number:\s*'([^']+)'/);
        const fullNameMatch = match.match(/fullName:\s*'([^']+)'/);
        const statesMatch = match.match(/states:\s*\[([^\]]+)\]/);
        const totalExitsMatch = match.match(/totalExits:\s*(\d+)/);
        
        if (idMatch && nameMatch && typeMatch && highwayTypeMatch && numberMatch && fullNameMatch && statesMatch) {
          highways.push({
            id: idMatch[1],
            name: nameMatch[1],
            type: typeMatch[1],
            highwayType: highwayTypeMatch[1],
            number: numberMatch[1],
            fullName: fullNameMatch[1],
            states: statesMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')),
            direction: null,
            parentHighwayId: null,
            totalExits: totalExitsMatch ? parseInt(totalExitsMatch[1]) : 0
          });
        }
      }
    }
    
    return highways;
  } catch (error) {
    console.error(`Error loading ${stateCode} highways:`, error.message);
    return [];
  }
}

/**
 * Update Explorer service to include new state highways
 */
async function updateExplorerService(newStates) {
  const explorerPath = path.join(__dirname, '..', 'services', 'explorer.ts');
  
  try {
    let content = await fs.readFile(explorerPath, 'utf8');
    
    // Find the initializeAllUSLocations method
    const methodStart = content.indexOf('private initializeAllUSLocations(): ExplorerCountry[] {');
    if (methodStart === -1) {
      throw new Error('Could not find initializeAllUSLocations method');
    }
    
    // Find the end of the method (look for the closing brace at the same indentation level)
    let braceCount = 0;
    let methodEnd = methodStart;
    let inMethod = false;
    
    for (let i = methodStart; i < content.length; i++) {
      const char = content[i];
      if (char === '{') {
        braceCount++;
        inMethod = true;
      } else if (char === '}') {
        braceCount--;
        if (inMethod && braceCount === 0) {
          methodEnd = i + 1;
          break;
        }
      }
    }
    
    // Extract the method content
    const methodContent = content.substring(methodStart, methodEnd);
    
    // Find where Texas highways are loaded
    const texasHighwayLine = methodContent.indexOf('highways: stateData.code === \'TX\' ? this.initializeAllTexasHighways() : []');
    
    if (texasHighwayLine === -1) {
      throw new Error('Could not find Texas highway loading line');
    }
    
    // Create new highway loading logic
    let newHighwayLogic = 'highways: stateData.code === \'TX\' ? this.initializeAllTexasHighways() : ';
    
    // Add conditions for each new state
    for (const stateCode of newStates) {
      newHighwayLogic += `stateData.code === '${stateCode}' ? this.initializeAll${stateCode}Highways() : `;
    }
    
    newHighwayLogic += '[]';
    
    // Replace the line
    const newMethodContent = methodContent.replace(
      /highways: stateData\.code === 'TX' \? this\.initializeAllTexasHighways\(\) : \[\]/,
      newHighwayLogic
    );
    
    // Replace the method in the full content
    const newContent = content.substring(0, methodStart) + newMethodContent + content.substring(methodEnd);
    
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
    
    await fs.writeFile(explorerPath, finalContentWithMethods, 'utf8');
    
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
  const statesToIntegrate = args.length > 0 ? args : ['CA', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI', 'NJ'];
  
  console.log('🔗 Starting highway data integration...');
  console.log(`📊 Integrating states: ${statesToIntegrate.join(', ')}`);
  
  // Load highway data for each state
  const allHighways = {};
  let totalHighways = 0;
  
  for (const stateCode of statesToIntegrate) {
    console.log(`\n📁 Loading ${stateCode} highways...`);
    
    const highways = await loadStateHighways(stateCode);
    allHighways[stateCode] = highways;
    totalHighways += highways.length;
    
    console.log(`   Found ${highways.length} highways`);
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
  
  for (const [stateCode, highways] of Object.entries(allHighways)) {
    const interstates = highways.filter(h => h.highwayType === 'interstate').length;
    const usHighways = highways.filter(h => h.highwayType === 'us').length;
    const stateHighways = highways.filter(h => h.highwayType === 'state').length;
    
    console.log(`${stateCode}: ${highways.length} total (${interstates} I, ${usHighways} US, ${stateHighways} State)`);
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
