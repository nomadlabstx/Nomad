#!/usr/bin/env node

/**
 * Integrate All 50 States into Explorer System
 * Adds all generated state highway data to the Explorer service
 * 
 * Usage: node scripts/integrate-all-50-states.js
 */

const fs = require('fs').promises;
const path = require('path');

// All 50 US States
const ALL_50_STATES = [
  'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD',
  'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH',
  'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
];

/**
 * Update Explorer service to include all 50 states
 */
async function updateExplorerService() {
  const explorerPath = path.join(__dirname, '..', 'services', 'explorer.ts');
  
  try {
    let content = await fs.readFile(explorerPath, 'utf8');
    
    // Add import statements for all state highway files
    const importSection = content.substring(0, content.indexOf('import { locationAutoDiscovery }'));
    
    let newImports = importSection;
    for (const stateCode of ALL_50_STATES) {
      const importLine = `import { ALL_${stateCode.toUpperCase()}_HIGHWAYS } from '../data/${stateCode.toLowerCase()}-highways';\n`;
      if (!newImports.includes(importLine)) {
        newImports += importLine;
      }
    }
    
    const finalContent = newImports + content.substring(content.indexOf('import { locationAutoDiscovery }'));
    
    // Add initialize methods for each state
    const classEnd = finalContent.lastIndexOf('}');
    let newMethods = '';
    
    for (const stateCode of ALL_50_STATES) {
      const stateName = getStateName(stateCode);
      newMethods += `
  /**
   * Initialize ${stateName} highways
   */
  private initializeAll${stateCode}Highways(): ExplorerHighway[] {
    return ALL_${stateCode.toUpperCase()}_HIGHWAYS.map(hw => ({
      ...hw,
      visited: false,
      firstVisited: undefined,
      lastVisited: undefined,
      visitCount: 0,
      exits: [],
      visitedExits: 0,
      completionPercent: 0,
    }));
  }
`;
    }
    
    const finalContentWithMethods = finalContent.substring(0, classEnd) + newMethods + '\n' + finalContent.substring(classEnd);
    
    // Update the initializeAllUSLocations method to include all states
    const methodStart = finalContentWithMethods.indexOf('highways: stateData.code === \'TX\' ? this.initializeAllTexasHighways() : []');
    
    if (methodStart !== -1) {
      let newHighwayLogic = 'highways: stateData.code === \'TX\' ? this.initializeAllTexasHighways() : ';
      
      // Add conditions for each state (excluding TX which is already handled)
      const statesToAdd = ALL_50_STATES.filter(code => code !== 'TX');
      for (const stateCode of statesToAdd) {
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
    
    console.log(`✅ Updated Explorer service with all 50 states`);
    
  } catch (error) {
    console.error('Error updating Explorer service:', error.message);
    throw error;
  }
}

/**
 * Get state name from state code
 */
function getStateName(stateCode) {
  const stateNames = {
    'AK': 'Alaska', 'AL': 'Alabama', 'AR': 'Arkansas', 'AZ': 'Arizona',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'IA': 'Iowa',
    'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'MA': 'Massachusetts', 'MD': 'Maryland',
    'ME': 'Maine', 'MI': 'Michigan', 'MN': 'Minnesota', 'MO': 'Missouri',
    'MS': 'Mississippi', 'MT': 'Montana', 'NC': 'North Carolina', 'ND': 'North Dakota',
    'NE': 'Nebraska', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
    'NV': 'Nevada', 'NY': 'New York', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VA': 'Virginia', 'VT': 'Vermont', 'WA': 'Washington', 'WI': 'Wisconsin',
    'WV': 'West Virginia', 'WY': 'Wyoming'
  };
  return stateNames[stateCode] || stateCode;
}

/**
 * Create a comprehensive combined highway data file
 */
async function createComprehensiveHighwayFile() {
  const combinedPath = path.join(__dirname, '..', 'data', 'all-50-states-highways.ts');
  
  let content = `/**
 * All 50 US States Highway Database
 * Comprehensive highway data for complete US coverage
 * 
 * Generated: ${new Date().toISOString()}
 */

`;

  // Add imports for all states
  for (const stateCode of ALL_50_STATES) {
    content += `import { ALL_${stateCode.toUpperCase()}_HIGHWAYS } from './${stateCode.toLowerCase()}-highways';\n`;
  }
  
  content += `\nimport type { ExplorerHighway } from '../types/explorer';\n\n`;
  
  // Create combined array
  content += `export const ALL_50_STATES_HIGHWAYS: any[] = [\n`;
  
  for (const stateCode of ALL_50_STATES) {
    content += `  ...ALL_${stateCode.toUpperCase()}_HIGHWAYS,\n`;
  }
  
  content += `];\n\n`;

  // Add comprehensive statistics
  content += `export const ALL_50_STATES_STATS = {\n`;
  content += `  totalHighways: ALL_50_STATES_HIGHWAYS.length,\n`;
  content += `  totalStates: 50,\n`;
  content += `  interstates: ALL_50_STATES_HIGHWAYS.filter(h => h.highwayType === 'interstate').length,\n`;
  content += `  usHighways: ALL_50_STATES_HIGHWAYS.filter(h => h.highwayType === 'us-highway').length,\n`;
  content += `  stateHighways: ALL_50_STATES_HIGHWAYS.filter(h => h.highwayType === 'state-highway').length,\n`;
  content += `  totalExits: ALL_50_STATES_HIGHWAYS.reduce((sum, h) => sum + h.totalExits, 0),\n`;
  content += `  averageHighwaysPerState: Math.round(ALL_50_STATES_HIGHWAYS.length / 50),\n`;
  content += `};\n\n`;

  // Add helper functions
  content += `/**
 * Helper Functions
 */\n`;
  content += `export function getAllHighwaysByState(stateCode: string): any[] {\n`;
  content += `  return ALL_50_STATES_HIGHWAYS.filter(h => h.states.includes(stateCode));\n`;
  content += `}\n\n`;
  
  content += `export function getAllHighwaysByType(type: string): any[] {\n`;
  content += `  return ALL_50_STATES_HIGHWAYS.filter(h => h.highwayType === type);\n`;
  content += `}\n\n`;
  
  content += `export function getHighwayById(id: string): any | undefined {\n`;
  content += `  return ALL_50_STATES_HIGHWAYS.find(h => h.id === id);\n`;
  content += `}\n\n`;
  
  content += `export function getHighwayStats() {\n`;
  content += `  return ALL_50_STATES_STATS;\n`;
  content += `}\n`;

  await fs.writeFile(combinedPath, content, 'utf8');
  
  console.log(`✅ Created comprehensive highway file with all 50 states`);
}

/**
 * Count highways in each state file
 */
async function countHighwaysInState(stateCode) {
  const filename = `${stateCode.toLowerCase()}-highways.ts`;
  const filepath = path.join(__dirname, '..', 'data', filename);
  
  try {
    const content = await fs.readFile(filepath, 'utf8');
    const idMatches = content.match(/id:\s*'[^']+',/g);
    return idMatches ? idMatches.length : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Main integration function
 */
async function main() {
  console.log('🔗 Starting comprehensive integration of all 50 states...');
  console.log('📊 This will add all state highway data to the Explorer system...');
  
  // Count highways in each state
  console.log('\n📁 Counting highways in each state...');
  const stateCounts = {};
  let totalHighways = 0;
  
  for (const stateCode of ALL_50_STATES) {
    const count = await countHighwaysInState(stateCode);
    stateCounts[stateCode] = count;
    totalHighways += count;
  }
  
  // Update Explorer service
  console.log('\n🔧 Updating Explorer service...');
  await updateExplorerService();
  
  // Create comprehensive file
  console.log('\n📄 Creating comprehensive highway file...');
  await createComprehensiveHighwayFile();
  
  // Summary
  console.log('\n📊 INTEGRATION SUMMARY:');
  console.log('======================');
  
  // Sort by highway count
  const sortedCounts = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
  
  console.log('Top 10 States by Highway Count:');
  for (let i = 0; i < 10; i++) {
    const [stateCode, count] = sortedCounts[i];
    console.log(`  ${i + 1}. ${stateCode}: ${count} highways`);
  }
  
  console.log(`\n🎯 Total Highways Integrated: ${totalHighways}`);
  console.log(`📈 Average Highways per State: ${Math.round(totalHighways / 50)}`);
  console.log('🎉 All 50 states integration complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Test the Explorer system with comprehensive data');
  console.log('   2. Verify UI performance with large dataset');
  console.log('   3. Test highway tracking functionality');
  console.log('   4. Consider performance optimizations if needed');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateExplorerService, createComprehensiveHighwayFile, countHighwaysInState };
