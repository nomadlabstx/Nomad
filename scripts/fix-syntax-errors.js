const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/us-cities-with-counties.ts');

console.log('Reading file...');
let content = fs.readFileSync(inputFile, 'utf8');

console.log('Fixing syntax errors...');

// Fix 1: counties: USCounty[ should be counties: USCounty[];
content = content.replace(/counties:\s*USCounty\[\s*\{/g, 'counties: USCounty[];\n}\n\nexport const US_STATES_WITH_COUNTIES: USState[] = [\n  {');

// Fix 2: Remove double commas },,
content = content.replace(/,\s*,\s*/g, ',\n');

// Fix 3: Fix unclosed quotes - 'Jackson' Gap' -> 'Jackson\'s Gap'
// Pattern: name: 'Text' Text' -> name: 'Text\'s Text'
content = content.replace(/name:\s*'([^']*)'\s+([^']*)'/g, (match, p1, p2) => {
  // Check if this looks like an unclosed quote
  if (p2 && !p2.includes("'") && p2.trim().length > 0) {
    // Likely a possessive like "Jackson' Gap" or "Fountain N' Lakes"
    if (p2.startsWith('Gap') || p2.startsWith('Lakes') || p2.startsWith('s')) {
      return `name: '${p1}'s ${p2.replace(/^s\s+/, '')}'`;
    }
    return `name: '${p1} ${p2}'`;
  }
  return match;
});

// More specific fixes
content = content.replace(/name: 'Jackson' Gap'/g, "name: 'Jackson's Gap'");
content = content.replace(/name: 'Fountain N' Lakes'/g, "name: 'Fountain N' Lakes'");
content = content.replace(/name: 'Chain O' Lakes'/g, "name: 'Chain O' Lakes'");
content = content.replace(/name: 'Land O' Lakes'/g, "name: 'Land O' Lakes'");
content = content.replace(/name: 'La Crosse' Lakes'/g, "name: 'La Crosse' Lakes'");

// Fix 4: Remove trailing commas before closing brackets/braces
content = content.replace(/,\s*([}\]])/g, '$1');

// Fix 5: Ensure proper closing of the array
if (!content.trim().endsWith('];')) {
  // Find the last ] and add ];
  const lastBracket = content.lastIndexOf(']');
  if (lastBracket !== -1) {
    content = content.substring(0, lastBracket + 1) + ';\n';
  }
}

console.log('Writing fixed file...');
fs.writeFileSync(inputFile, content, 'utf8');

console.log('✓ Fixed syntax errors');

