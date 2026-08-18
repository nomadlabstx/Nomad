const fs = require('fs');
const path = require('path');

const EXITS_FILE = path.join(__dirname, '../data/texas-highway-exits-integrated.ts');

const content = fs.readFileSync(EXITS_FILE, 'utf8');

// Test the export regex
const exportRegex = /export const (\w+_EXITS):\s*Omit<ExplorerHighwayExit[^>]+>\[\]\s*=\s*\[([\s\S]*?)\];/g;
let match = exportRegex.exec(content);

if (match) {
  const highwayKey = match[1];
  const exitsArray = match[2];
  
  console.log('First highway:', highwayKey);
  console.log('Array length:', exitsArray.length);
  console.log('Array preview (first 300 chars):');
  console.log(exitsArray.substring(0, 300));
  console.log('\n---\n');
  
  // Test the exit regex - try multiple patterns
  const patterns = [
    /\{\s*exitNumber:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"],\s*coordinates:\s*\{\s*latitude:\s*([\d.]+),\s*longitude:\s*([\d.]+)\s*\},\s*milepointStart:\s*([\d.]+),\s*milepointEnd:\s*([\d.]+)\s*\}[\s,]*/g,
    /\{\s*exitNumber:\s*['"]([^'"]+)['"],[\s\S]*?description:\s*['"]([^'"]+)['"],[\s\S]*?latitude:\s*([\d.]+),[\s\S]*?longitude:\s*([\d.]+)[\s\S]*?milepointStart:\s*([\d.]+),[\s\S]*?milepointEnd:\s*([\d.]+)[\s\S]*?\}/g,
  ];
  
  for (let p = 0; p < patterns.length; p++) {
    const exitRegex = patterns[p];
    exitRegex.lastIndex = 0; // Reset
    let exitMatch;
    let count = 0;
    while ((exitMatch = exitRegex.exec(exitsArray)) !== null) {
      count++;
      if (count <= 2) {
        console.log(`Pattern ${p+1} - Exit ${count}:`, exitMatch[1], exitMatch[2]);
      }
    }
    console.log(`Pattern ${p+1} found: ${count} exits`);
  }
  
  // Try a simpler regex
  console.log('\n--- Trying simpler regex ---\n');
  const simpleRegex = /exitNumber:\s*['"]([^'"]+)['"]/g;
  let simpleMatch;
  let simpleCount = 0;
  while ((simpleMatch = simpleRegex.exec(exitsArray)) !== null) {
    simpleCount++;
  }
  console.log(`Simple regex found ${simpleCount} exit numbers`);
}

