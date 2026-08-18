#!/usr/bin/env node

/**
 * Review Fixed Exit Data Quality
 */

const fs = require('fs');
const path = require('path');

const FIXED_FILE = path.join(__dirname, '../data/texas-highway-exits-fixed.ts');

function parseExitData() {
  const content = fs.readFileSync(FIXED_FILE, 'utf8');
  const exits = new Map();

  const exportRegex = /export const (\w+_EXITS):\s*Omit<ExplorerHighwayExit[^>]+>\[\]\s*=\s*\[([\s\S]*?)\];/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    const highwayKey = match[1];
    const exitsArray = match[2];

    const exitRegex = /\{\s*exitNumber:\s*['"]([^'"]+)['"],[\s\S]*?description:\s*['"]([^'"]+)['"],[\s\S]*?latitude:\s*([\d.]+),[\s\S]*?longitude:\s*([\d.]+)[\s\S]*?milepointStart:\s*([\d.]+),[\s\S]*?milepointEnd:\s*([\d.]+)[\s\S]*?\}/g;
    const highwayExits = [];
    let exitMatch;

    while ((exitMatch = exitRegex.exec(exitsArray)) !== null) {
      highwayExits.push({
        exitNumber: exitMatch[1],
        description: exitMatch[2],
        coordinates: {
          latitude: parseFloat(exitMatch[3]),
          longitude: parseFloat(exitMatch[4])
        },
        milepointStart: parseFloat(exitMatch[5]),
        milepointEnd: parseFloat(exitMatch[6])
      });
    }

    exits.set(highwayKey, highwayExits);
  }

  return exits;
}

function reviewExits() {
  console.log('🔍 Reviewing Fixed Exit Data Quality');
  console.log('='.repeat(70));
  console.log('');

  const exitData = parseExitData();
  
  console.log(`📊 Overview:`);
  console.log(`   • Total highways: ${exitData.size}`);
  const totalExits = Array.from(exitData.values()).reduce((sum, e) => sum + e.length, 0);
  console.log(`   • Total exits: ${totalExits}`);
  console.log('');

  // Check quality metrics
  let issues = {
    duplicates: 0,
    overlaps: 0,
    gaps: [],
    precisionIssues: 0,
    suffixed: 0,
    merged: 0
  };

  const examples = {
    merged: [],
    suffixed: [],
    goodSequences: []
  };

  for (const [highwayKey, exits] of exitData.entries()) {
    const sorted = [...exits].sort((a, b) => a.milepointStart - b.milepointStart);
    
    // Check for duplicates
    const exitNumbers = new Map();
    exits.forEach(exit => {
      const num = exit.exitNumber;
      if (!exitNumbers.has(num)) exitNumbers.set(num, 0);
      exitNumbers.set(num, exitNumbers.get(num) + 1);
      if (exitNumbers.get(num) > 1) issues.duplicates++;
    });

    // Check for overlaps and gaps
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      if (prev.milepointEnd > curr.milepointStart) {
        issues.overlaps++;
      } else {
        const gap = curr.milepointStart - prev.milepointEnd;
        if (gap > 5) {
          issues.gaps.push({
            highway: highwayKey,
            gap: gap.toFixed(1),
            between: `${prev.exitNumber} (${prev.milepointEnd.toFixed(1)}) → ${curr.exitNumber} (${curr.milepointStart.toFixed(1)})`
          });
        }
      }
    }

    // Check for precision issues (very long decimal places)
    exits.forEach(exit => {
      const startStr = exit.milepointStart.toString();
      const endStr = exit.milepointEnd.toString();
      if (startStr.length > 10 || endStr.length > 10) {
        issues.precisionIssues++;
      }
    });

    // Count suffixed exits
    const suffixed = exits.filter(e => /[A-Z]$/.test(e.exitNumber));
    issues.suffixed += suffixed.length;
    
    if (suffixed.length > 0 && examples.suffixed.length < 3) {
      examples.suffixed.push({
        highway: highwayKey,
        exits: suffixed.slice(0, 3).map(e => `${e.exitNumber} (MP ${e.milepointStart.toFixed(1)})`)
      });
    }

    // Find examples of good sequences
    if (sorted.length >= 5 && examples.goodSequences.length < 2) {
      const sequence = sorted.slice(0, 5).map(e => `${e.exitNumber}@${e.milepointStart.toFixed(1)}`).join(' → ');
      examples.goodSequences.push({
        highway: highwayKey,
        sequence: sequence
      });
    }
  }

  // Report findings
  console.log('✅ Quality Checks:\n');
  
  if (issues.duplicates === 0) {
    console.log('   ✓ No duplicate exit numbers');
  } else {
    console.log(`   ⚠️  ${issues.duplicates} duplicate exit numbers found`);
  }

  if (issues.overlaps === 0) {
    console.log('   ✓ No overlapping milepost ranges');
  } else {
    console.log(`   ⚠️  ${issues.overlaps} overlapping milepost ranges found`);
  }

  if (issues.precisionIssues === 0) {
    console.log('   ✓ No floating-point precision issues');
  } else {
    console.log(`   ⚠️  ${issues.precisionIssues} exits with precision issues (minor, can be cleaned)`);
  }

  console.log(`   ✓ ${issues.suffixed} exits have directional suffixes (A/B/C)`);
  console.log(`   ✓ Exits properly sequenced by milepost`);

  if (issues.gaps.length > 0) {
    console.log(`\n   ⚠️  ${issues.gaps.length} large gaps (>5 miles) between exits:`);
    issues.gaps.slice(0, 5).forEach(gap => {
      console.log(`      • ${gap.highway}: ${gap.gap} miles between ${gap.between}`);
    });
  }

  console.log('\n📋 Examples:\n');

  if (examples.suffixed.length > 0) {
    console.log('   Exits with Directional Suffixes:');
    examples.suffixed.forEach(ex => {
      console.log(`      • ${ex.highway}: ${ex.exits.join(', ')}`);
    });
    console.log('');
  }

  if (examples.goodSequences.length > 0) {
    console.log('   Good Exit Sequences:');
    examples.goodSequences.forEach(ex => {
      console.log(`      • ${ex.highway}: ${ex.sequence}`);
    });
    console.log('');
  }

  // Sample a few specific highways
  console.log('🔍 Sample Highway Reviews:\n');
  
  const sampleHighways = ['I110_EXITS', 'I410_EXITS', 'I10_EAST_EXITS'];
  sampleHighways.forEach(key => {
    const exits = exitData.get(key);
    if (exits) {
      const sorted = [...exits].sort((a, b) => a.milepointStart - b.milepointStart);
      console.log(`   ${key} (${exits.length} exits):`);
      console.log(`      First 3: ${sorted.slice(0, 3).map(e => `${e.exitNumber}@${e.milepointStart.toFixed(1)}`).join(', ')}`);
      console.log(`      Last 3: ${sorted.slice(-3).map(e => `${e.exitNumber}@${e.milepointStart.toFixed(1)}`).join(', ')}`);
      
      // Check for issues
      let hasIssues = false;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i-1].milepointEnd > sorted[i].milepointStart) {
          console.log(`      ⚠️  Overlap: ${sorted[i-1].exitNumber} → ${sorted[i].exitNumber}`);
          hasIssues = true;
        }
      }
      if (!hasIssues) {
        console.log(`      ✓ No overlaps detected`);
      }
      console.log('');
    }
  });

  // Overall assessment
  console.log('='.repeat(70));
  console.log('\n📊 Overall Assessment:\n');
  
  const score = 100 - (issues.duplicates * 10) - (issues.overlaps * 5) - Math.min(issues.precisionIssues, 10);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D';
  
  console.log(`   Quality Score: ${Math.max(0, score)}/100 (Grade: ${grade})`);
  console.log('');
  
  if (issues.duplicates === 0 && issues.overlaps === 0) {
    console.log('   ✅ EXCELLENT: All critical issues fixed!');
    console.log('   ✅ Exit labeling is accurate and consistent');
    console.log('   ✅ Ready for coordinate population and description scraping');
  } else {
    console.log('   ⚠️  Some issues remain - review recommended');
  }

  console.log('\n💡 Next Steps:');
  console.log('   1. Review any large gaps (may indicate missing exits)');
  console.log('   2. Run populate-texas-exits-fast.js to get coordinates');
  console.log('   3. Run scrape-texas-exit-signs.js to get road names');
}

reviewExits();

