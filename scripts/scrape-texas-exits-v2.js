/**
 * Texas Highway Exit Scraper V2
 * Tries The Texas Highway Man website (texashighwayman.com)
 * Falls back to manual data entry from known sources
 * 
 * Usage: node scripts/scrape-texas-exits-v2.js
 */

/* eslint-env node */
/* global __dirname */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * Fetch HTML with browser-like headers
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };
    
    protocol.get(options, (res) => {
      let data = '';
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

/**
 * Try scraping The Texas Highway Man website
 */
async function scrapeTexasHighwayMan() {
  const highways = [
    { number: '410', url: 'http://www.texashighwayman.com/i410_ex.shtml' },
    { number: '610', url: 'http://www.texashighwayman.com/i610_ex.shtml' },
  ];
  
  const results = [];
  
  for (const highway of highways) {
    console.log(`\nAttempting: I-${highway.number} from Texas Highway Man`);
    
    try {
      const html = await fetchHTML(highway.url);
      console.log(`  ✅ Successfully fetched ${html.length} bytes`);
      
      // Save HTML for manual inspection
      const htmlPath = path.join(__dirname, `../data/highway-${highway.number}.html`);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`  💾 Saved HTML to: ${htmlPath}`);
      
      results.push({ highway: highway.number, html });
      
      // Be polite
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Generate a manual data template
 */
function generateManualTemplate() {
  console.log('\n📝 Since automated scraping is blocked, here\'s what we can do:\n');
  console.log('OPTION 1: Manual Data Entry Template');
  console.log('======================================\n');
  console.log('I can create a template file where you can paste exit data.');
  console.log('Format: One exit per line, like:\n');
  console.log('330B,Meridian; Marlin');
  console.log('331,TX-6; Waco');
  console.log('335A,Loop 340; Downtown\n');
  console.log('OPTION 2: Focus on Major Highways');
  console.log('===================================\n');
  console.log('Manually add exits for the top 5 most-used highways:');
  console.log('- I-35 (most important)');
  console.log('- I-10');
  console.log('- I-45');
  console.log('- I-20');
  console.log('- I-30\n');
  console.log('OPTION 3: Stick with Auto-Discovery');
  console.log('====================================\n');
  console.log('Keep the current system - exits populate as users drive.');
  console.log('This is actually the most realistic data!\n');
  
  // Create a template file
  const templatePath = path.join(__dirname, '../data/exits-template.txt');
  const template = `# Texas Interstate Exits - Manual Data Entry Template
# Format: highway,exitNumber,description
# Example: I-35,330B,Meridian; Marlin

# Interstate 35 (paste exits below)


# Interstate 10 (paste exits below)


# Interstate 45 (paste exits below)


# Add more highways as needed...
`;
  
  fs.writeFileSync(templatePath, template, 'utf8');
  console.log(`📄 Created template file: ${templatePath}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Texas Highway Exit Scraper V2\n');
  
  try {
    // Try scraping a few pages
    const results = await scrapeTexasHighwayMan();
    
    if (results.length > 0) {
      console.log(`\n✅ Successfully fetched ${results.length} highways`);
      console.log('Check the saved HTML files to see the data structure');
    }
    
    // Generate manual template regardless
    generateManualTemplate();
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  }
  
  console.log('\n💡 RECOMMENDATION:');
  console.log('===================================');
  console.log('Given that scraping is difficult, I suggest:');
  console.log('1. Keep the auto-discovery system (it works!)');
  console.log('2. Optionally manually add exits for I-35 only (most used)');
  console.log('3. Let the database grow organically with real usage\n');
  console.log('Your current system is actually better than static data');
  console.log('because it captures REAL exit usage patterns!\n');
}

if (require.main === module) {
  main();
}



