/**
 * Script to fill in missing locations using Google Places API auto-discovery
 * This will discover and add missing cities, towns, and villages to the database
 */

const { locationAutoDiscovery } = require('../services/location-auto-discovery');

async function fillMissingLocations() {
  console.log('🚀 Starting location auto-discovery to fill missing locations...\n');

  try {
    // 1. Discover locations around major US cities
    console.log('📍 Discovering locations around major US cities...');
    const usLocations = await locationAutoDiscovery.discoverLocationsForUS();
    console.log(`✅ Discovered ${usLocations.length} locations across the US\n`);

    // 2. Add discovered locations to database
    console.log('💾 Adding discovered locations to database...');
    const addedCount = await locationAutoDiscovery.addDiscoveredLocationsToDatabase(usLocations);
    console.log(`✅ Successfully added ${addedCount} new locations to database\n`);

    // 3. Discover locations for specific states that might be missing data
    const statesToEnhance = [
      { name: 'Wyoming', code: 'WY' },
      { name: 'Montana', code: 'MT' },
      { name: 'North Dakota', code: 'ND' },
      { name: 'South Dakota', code: 'SD' },
      { name: 'Alaska', code: 'AK' },
      { name: 'Hawaii', code: 'HI' }
    ];

    console.log('🗺️  Enhancing specific states with additional locations...');
    for (const state of statesToEnhance) {
      console.log(`📍 Discovering locations for ${state.name}...`);
      const stateLocations = await locationAutoDiscovery.discoverLocationsForState(state.name, state.code);
      console.log(`✅ Discovered ${stateLocations.length} locations for ${state.name}`);
      
      if (stateLocations.length > 0) {
        const stateAddedCount = await locationAutoDiscovery.addDiscoveredLocationsToDatabase(stateLocations);
        console.log(`✅ Added ${stateAddedCount} new locations for ${state.name}\n`);
      }
    }

    // 4. Discover locations for specific cities that might be missing
    const citiesToEnhance = [
      { name: 'Jackson', state: 'WY' },
      { name: 'Bozeman', state: 'MT' },
      { name: 'Bismarck', state: 'ND' },
      { name: 'Rapid City', state: 'SD' },
      { name: 'Anchorage', state: 'AK' },
      { name: 'Honolulu', state: 'HI' }
    ];

    console.log('🏙️  Enhancing specific cities with surrounding locations...');
    for (const city of citiesToEnhance) {
      console.log(`📍 Discovering locations around ${city.name}, ${city.state}...`);
      const cityLocations = await locationAutoDiscovery.discoverLocationsForCity(city.name, city.state);
      console.log(`✅ Discovered ${cityLocations.length} locations around ${city.name}`);
      
      if (cityLocations.length > 0) {
        const cityAddedCount = await locationAutoDiscovery.addDiscoveredLocationsToDatabase(cityLocations);
        console.log(`✅ Added ${cityAddedCount} new locations around ${city.name}\n`);
      }
    }

    console.log('🎉 Location auto-discovery completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Total US locations discovered: ${usLocations.length}`);
    console.log(`   - Total locations added to database: ${addedCount}`);
    console.log('   - Database now has more comprehensive location coverage');

  } catch (error) {
    console.error('❌ Error during location auto-discovery:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fillMissingLocations()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fillMissingLocations };
