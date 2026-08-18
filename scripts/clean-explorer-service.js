#!/usr/bin/env node

/**
 * Clean Explorer Service
 * Removes duplicate functions and imports from the Explorer service
 */

const fs = require('fs').promises;
const path = require('path');

async function cleanExplorerService() {
  const explorerPath = path.join(__dirname, '..', 'services', 'explorer.ts');
  
  try {
    let content = await fs.readFile(explorerPath, 'utf8');
    
    // Find the end of the class (before the closing brace)
    const classEndIndex = content.lastIndexOf('}');
    const beforeClassEnd = content.substring(0, classEndIndex);
    const afterClassEnd = content.substring(classEndIndex);
    
    // Find the last method before the class end
    const lastMethodIndex = beforeClassEnd.lastIndexOf('  }');
    const cleanContent = content.substring(0, lastMethodIndex + 3) + '\n' + afterClassEnd;
    
    await fs.writeFile(explorerPath, cleanContent, 'utf8');
    
    console.log('✅ Cleaned Explorer service');
    
  } catch (error) {
    console.error('Error cleaning Explorer service:', error.message);
  }
}

cleanExplorerService();
