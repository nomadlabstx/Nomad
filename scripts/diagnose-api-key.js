/**
 * Diagnose API Key Configuration
 * Checks if API key restrictions might be blocking the new Places API
 */

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_SERVER_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error('Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_SERVER_KEY before running this script.');
}

async function diagnoseAPIKey() {
  console.log('\n🔍 DIAGNOSING API KEY CONFIGURATION...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Geocoding API (should work - we know this works)
  console.log('Test 1: Geocoding API (Known to work)');
  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Austin,TX&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ WORKS - Geocoding API is accessible\n');
    } else {
      console.log(`❌ FAILED - ${data.status}: ${data.error_message || 'Unknown error'}\n`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`);
  }

  // Test 2: Directions API (should work - we know this works)
  console.log('Test 2: Directions API (Known to work)');
  try {
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=Austin,TX&destination=Houston,TX&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(directionsUrl);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ WORKS - Directions API is accessible\n');
    } else {
      console.log(`❌ FAILED - ${data.status}: ${data.error_message || 'Unknown error'}\n`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`);
  }

  // Test 3: Places API (New) - the one we're having trouble with
  console.log('Test 3: Places API (New) - Using X-Goog-Api-Key header');
  try {
    const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
    const response = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName',
      },
      body: JSON.stringify({
        textQuery: 'restaurants in Austin',
        maxResultCount: 1,
      }),
    });
    
    const data = await response.json();
    
    if (data.places) {
      console.log('✅ WORKS - Places API (New) is accessible!\n');
      console.log('🎉 If this works but the app still fails, it\'s a CACHE issue.\n');
    } else if (data.error) {
      console.log(`❌ FAILED - ${data.error.status}`);
      console.log(`   Message: ${data.error.message}\n`);
      
      if (data.error.status === 'PERMISSION_DENIED' || data.error.message.includes('API key not valid')) {
        console.log('📋 LIKELY CAUSES:\n');
        console.log('1. API Key Restrictions (HTTP referrers/IP addresses)');
        console.log('   → Go to: https://console.cloud.google.com/apis/credentials');
        console.log('   → Click your API key');
        console.log('   → Under "API restrictions", make sure "Places API (New)" is NOT restricted\n');
        console.log('2. API Not Fully Enabled Yet');
        console.log('   → Sometimes takes 5-10 minutes to propagate');
        console.log('   → Try again in a few minutes\n');
        console.log('3. Wrong Project');
        console.log('   → Make sure Places API (New) is enabled in the SAME project');
        console.log('   → Where your API key was created\n');
      }
    } else {
      console.log('⚠️  UNEXPECTED RESPONSE:', JSON.stringify(data, null, 2), '\n');
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 4: Check if it's an API restriction issue
  console.log('Test 4: Places API (New) - Minimal request');
  try {
    const placesUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    const response = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: 30.2672, longitude: -97.7431 },
            radius: 100,
          },
        },
        maxResultCount: 1,
      }),
    });
    
    const data = await response.json();
    const statusCode = response.status;
    
    console.log(`   HTTP Status: ${statusCode}`);
    
    if (data.places) {
      console.log('✅ WORKS - Nearby search is accessible!\n');
    } else if (data.error) {
      console.log(`❌ FAILED - ${data.error.status}`);
      console.log(`   Message: ${data.error.message}\n`);
      
      if (data.error.status === 'INVALID_ARGUMENT' && data.error.message.includes('API key not valid')) {
        console.log('🔐 API KEY RESTRICTION DETECTED!\n');
        console.log('Your API key has restrictions that are blocking Places API (New).\n');
        console.log('SOLUTION:');
        console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
        console.log('2. Click on your API key');
        console.log('3. Scroll to "API restrictions"');
        console.log('4. Either:');
        console.log('   a) Select "Don\'t restrict key" (easiest for development)');
        console.log('   b) Or add "Places API (New)" to the list of allowed APIs');
        console.log('5. Click SAVE');
        console.log('6. Wait 2-3 minutes for changes to apply\n');
      }
    } else {
      console.log('⚠️  No places found or unexpected response\n');
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🏁 DIAGNOSIS COMPLETE\n');
  console.log('Next steps based on results above ↑\n');
}

diagnoseAPIKey().catch(console.error);

