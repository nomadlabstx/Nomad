const fs = require('fs');
const content = fs.readFileSync('data/us-cities-with-counties.ts', 'utf8');
const lines = content.split('\n');

const allStates = [];
for (let i = 1; i < lines.length; i++) {
  const nameMatch = lines[i].match(/name:\s*'([^']+)'/);
  const codeMatch = lines[i + 1]?.match(/code:\s*'([A-Z]{2})'/);
  
  if (nameMatch && codeMatch && (lines[i - 1].trim() === '{' || lines[i - 1].includes('{'))) {
    const nextFewLines = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');
    if (nextFewLines.includes('counties: [')) {
      const hasStateProp = nextFewLines.includes("state: '");
      const countiesIndex = nextFewLines.indexOf('counties: [');
      const stateIndex = hasStateProp ? nextFewLines.indexOf("state: '") : -1;
      
      if (!hasStateProp || countiesIndex < stateIndex) {
        allStates.push({ name: nameMatch[1], code: codeMatch[1], line: i });
      }
    }
  }
}

console.log('Total states found:', allStates.length);
console.log('\nAll states:');
allStates.forEach((s, idx) => {
  console.log(`  ${idx + 1}. ${s.name} (${s.code}) at line ${s.line}`);
});

