#!/usr/bin/env node

/**
 * Validate Texas Highway Exit Data
 * 
 * Checks for common issues:
 * - Duplicate exit numbers on same highway
 * - Exits with same number but different mileposts
 * - Missing or generic descriptions
 * - Coordinate issues
 */

const fs = require('fs');
const path = require('path');

// Check if fixed file exists, otherwise use integrated
const FIXED_FILE = path.join(__dirname, '../data/texas-highway-exits-fixed.ts');
const INTEGRATED_FILE = path.join(__dirname, '../data/texas-highway-exits-integrated.ts');
const EXITS_FILE = fs.existsSync(FIXED_FILE) ? FIXED_FILE : INTEGRATED_FILE;

function parseExitData() {
  const content = fs.readFileSync(EXITS_FILE, 'utf8');
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

function validateExits() {
  console.log('🔍 Validating Texas Highway Exit Data');
  console.log('='.repeat(70));
  
  const isFixedFile = EXITS_FILE === FIXED_FILE;
  if (isFixedFile) {
    console.log('📁 Validating FIXED file (texas-highway-exits-fixed.ts)');
  } else {
    console.log('📁 Validating INTEGRATED file (texas-highway-exits-integrated.ts)');
  }
  console.log('');

  const exitData = parseExitData();
  console.log(`\n📊 Found ${exitData.size} highways with exit data\n`);

  let totalIssues = 0;
  const issues = {
    duplicates: [],
    genericDescriptions: [],
    zeroCoordinates: [],
    outOfOrder: [],
    suspiciousMileposts: []
  };

  for (const [highwayKey, exits] of exitData.entries()) {
    // Check for duplicate exit numbers
    const exitNumbers = new Map();
    exits.forEach((exit, index) => {
      const key = exit.exitNumber;
      if (!exitNumbers.has(key)) {
        exitNumbers.set(key, []);
      }
      exitNumbers.get(key).push({ exit, index });
    });

    // Find duplicates
    exitNumbers.forEach((occurrences, exitNumber) => {
      if (occurrences.length > 1) {
        const mileposts = occurrences.map(o => o.exit.milepointStart).sort((a, b) => a - b);
        const milepostDiff = mileposts[mileposts.length - 1] - mileposts[0];
        
        issues.duplicates.push({
          highway: highwayKey,
          exitNumber: exitNumber,
          count: occurrences.length,
          mileposts: mileposts,
          milepostRange: milepostDiff,
          likelyIssue: milepostDiff < 1 ? 'Very close mileposts - might be same exit' : 
                       milepostDiff > 5 ? 'Wide milepost range - might be different exits' : 
                       'Multiple occurrences'
        });
      }
    });

    // Check for generic descriptions
    exits.forEach((exit, index) => {
      if (exit.description === `Exit ${exit.exitNumber}` || exit.description.trim() === '') {
        issues.genericDescriptions.push({
          highway: highwayKey,
          exitNumber: exit.exitNumber,
          milepost: exit.milepointStart,
          description: exit.description
        });
      }
    });

    // Check for zero coordinates
    exits.forEach((exit) => {
      if (exit.coordinates.latitude === 0 && exit.coordinates.longitude === 0) {
        issues.zeroCoordinates.push({
          highway: highwayKey,
          exitNumber: exit.exitNumber,
          milepost: exit.milepointStart
        });
      }
    });

    // Check for out-of-order exits
    const sortedByMilepost = [...exits].sort((a, b) => a.milepointStart - b.milepointStart);
    for (let i = 1; i < sortedByMilepost.length; i++) {
      const prev = sortedByMilepost[i - 1];
      const curr = sortedByMilepost[i];
      
      // Check if exit numbers are out of order relative to mileposts
      const prevNum = parseFloat(prev.exitNumber);
      const currNum = parseFloat(curr.exitNumber);
      
      if (!isNaN(prevNum) && !isNaN(currNum)) {
        if (prevNum > currNum && prev.milepointStart < curr.milepointStart) {
          issues.outOfOrder.push({
            highway: highwayKey,
            exit1: { number: prev.exitNumber, milepost: prev.milepointStart },
            exit2: { number: curr.exitNumber, milepost: curr.milepointStart }
          });
        }
      }
    }

    // Check for suspicious milepost gaps or patterns
    for (let i = 1; i < sortedByMilepost.length; i++) {
      const prev = sortedByMilepost[i - 1];
      const curr = sortedByMilepost[i];
      const gap = curr.milepointStart - prev.milepointEnd;
      
      if (gap < 0) {
        issues.suspiciousMileposts.push({
          highway: highwayKey,
          issue: 'Overlapping mileposts',
          exit1: { number: prev.exitNumber, range: `${prev.milepointStart}-${prev.milepointEnd}` },
          exit2: { number: curr.exitNumber, range: `${curr.milepointStart}-${curr.milepointEnd}` }
        });
      } else if (gap > 10) {
        issues.suspiciousMileposts.push({
          highway: highwayKey,
          issue: 'Large gap between exits',
          gap: gap.toFixed(1),
          exit1: { number: prev.exitNumber, milepost: prev.milepointEnd },
          exit2: { number: curr.exitNumber, milepost: curr.milepointStart }
        });
      }
    }
  }

  // Report findings
  console.log('📋 Validation Results:\n');

  if (issues.duplicates.length > 0) {
    console.log(`⚠️  DUPLICATE EXIT NUMBERS: ${issues.duplicates.length} cases`);
    console.log('   (Same exit number appears multiple times on same highway)\n');
    
    // Show top 10 most problematic
    const topDuplicates = issues.duplicates
      .sort((a, b) => b.count - a.count || b.milepostRange - a.milepostRange)
      .slice(0, 10);
    
    topDuplicates.forEach(dup => {
      console.log(`   • ${dup.highway} - Exit ${dup.exitNumber}: ${dup.count}x occurrences`);
      console.log(`     Mileposts: ${dup.mileposts.join(', ')} (range: ${dup.milepostRange.toFixed(1)} miles)`);
      console.log(`     Issue: ${dup.likelyIssue}`);
    });
    console.log('');
    totalIssues += issues.duplicates.length;
  }

  if (issues.genericDescriptions.length > 0) {
    console.log(`⚠️  GENERIC DESCRIPTIONS: ${issues.genericDescriptions.length} exits`);
    console.log('   (Just "Exit X" without road names or landmarks)\n');
    
    const byHighway = new Map();
    issues.genericDescriptions.forEach(issue => {
      if (!byHighway.has(issue.highway)) {
        byHighway.set(issue.highway, 0);
      }
      byHighway.set(issue.highway, byHighway.get(issue.highway) + 1);
    });
    
    const topHighways = Array.from(byHighway.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    topHighways.forEach(([highway, count]) => {
      console.log(`   • ${highway}: ${count} exits with generic descriptions`);
    });
    console.log('');
    totalIssues += issues.genericDescriptions.length;
  }

  if (issues.zeroCoordinates.length > 0) {
    console.log(`⚠️  ZERO COORDINATES: ${issues.zeroCoordinates.length} exits`);
    console.log('   (Coordinates are 0,0 - need to be populated)\n');
    totalIssues += issues.zeroCoordinates.length;
  }

  if (issues.outOfOrder.length > 0) {
    console.log(`⚠️  OUT OF ORDER: ${issues.outOfOrder.length} cases`);
    console.log('   (Exit numbers decrease while mileposts increase)\n');
    
    issues.outOfOrder.slice(0, 5).forEach(issue => {
      console.log(`   • ${issue.highway}: Exit ${issue.exit1.number} (MP ${issue.exit1.milepost}) → Exit ${issue.exit2.number} (MP ${issue.exit2.milepost})`);
    });
    console.log('');
    totalIssues += issues.outOfOrder.length;
  }

  if (issues.suspiciousMileposts.length > 0) {
    console.log(`⚠️  SUSPICIOUS MILEPOSTS: ${issues.suspiciousMileposts.length} cases`);
    console.log('   (Overlapping ranges or very large gaps)\n');
    
    issues.suspiciousMileposts.slice(0, 5).forEach(issue => {
      console.log(`   • ${issue.highway}: ${issue.issue}`);
      if (issue.gap) {
        console.log(`     Gap: ${issue.gap} miles between Exit ${issue.exit1.number} and Exit ${issue.exit2.number}`);
      } else {
        console.log(`     Exit ${issue.exit1.number} (${issue.exit1.range}) overlaps with Exit ${issue.exit2.number} (${issue.exit2.range})`);
      }
    });
    console.log('');
    totalIssues += issues.suspiciousMileposts.length;
  }

  // Summary
  console.log('='.repeat(70));
  console.log(`\n📊 Summary:`);
  console.log(`   • Total highways: ${exitData.size}`);
  console.log(`   • Total exits: ${Array.from(exitData.values()).reduce((sum, exits) => sum + exits.length, 0)}`);
  
  // Separate actual issues from expected missing data
  const actualIssues = issues.duplicates.length + issues.outOfOrder.length + issues.suspiciousMileposts.length;
  const missingData = issues.genericDescriptions.length + issues.zeroCoordinates.length;
  
  console.log(`\n🔴 Actual Quality Issues: ${actualIssues}`);
  console.log(`🟡 Expected Missing Data: ${missingData} (needs population)`);
  console.log(`   • Generic descriptions: ${issues.genericDescriptions.length} (will be fixed by scraping)`);
  console.log(`   • Zero coordinates: ${issues.zeroCoordinates.length} (will be fixed by populate script)`);
  
  if (actualIssues === 0) {
    console.log('\n✅ EXCELLENT: All quality issues fixed!');
    console.log('   • No duplicate exit numbers');
    console.log('   • No overlapping mileposts');
    console.log('   • No out-of-order exits');
    console.log('\n💡 Next Steps:');
    if (issues.genericDescriptions.length > 0) {
      console.log('   • Run scrape-texas-exit-signs.js to populate road names');
    }
    if (issues.zeroCoordinates.length > 0) {
      console.log('   • Run populate-texas-exits-fast.js to calculate coordinates');
    }
  } else {
    console.log('\n⚠️  Quality issues detected. Review the details above.');
    console.log('\n💡 Recommendations:');
    if (issues.duplicates.length > 0) {
      console.log('   • Duplicate exits may need directional suffixes (e.g., "5A", "5B")');
      console.log('   • Or may need to be merged if they represent the same exit');
    }
    if (issues.genericDescriptions.length > 0) {
      console.log('   • Run scrape-texas-exit-signs.js to populate road names');
    }
    if (issues.zeroCoordinates.length > 0) {
      console.log('   • Run populate-texas-exits-fast.js to calculate coordinates');
    }
  }
}

// Run validation
validateExits();

