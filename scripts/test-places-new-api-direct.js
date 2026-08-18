/**
 * Test Google Places API (New) - Direct Test
 * This tests the NEW Places API to verify it's enabled in your Google Cloud Console
 */

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_SERVER_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error('Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_SERVER_KEY before running this script.');
}

async function testPlacesNewAPI() {
  console.log('\n🧪 Testing Google Places API (New)...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Nearby Search (New API)
  console.log('Test 1: Nearby Search (New API)');
  console.log('Endpoint: https://places.googleapis.com/v1/places:searchNearby\n');

  try {
    const nearbyUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    const nearbyBody = {
      locationRestriction: {
        circle: {
          center: {
            latitude: 30.2672,
            longitude: -97.7431,
          },
          radius: 500,
        },
      },
      includedTypes: ['restaurant'],
      maxResultCount: 5,
      languageCode: 'en',
    };

    console.log('Request Body:', JSON.stringify(nearbyBody, null, 2));
    console.log('\nSending request...\n');

    const nearbyResponse = await fetch(nearbyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify(nearbyBody),
    });

    const nearbyData = await nearbyResponse.json();

    if (nearbyData.error) {
      console.log('❌ ERROR:', nearbyData.error.status);
      console.log('   Message:', nearbyData.error.message);
      console.log('\n📋 SOLUTION:');
      console.log('   1. Go to: https://console.cloud.google.com/apis/library');
      console.log('   2. Search for "Places API (New)"');
      console.log('   3. Click "Enable"');
      console.log('   4. Wait 1-2 minutes for changes to propagate\n');
    } else if (nearbyData.places) {
      console.log('✅ SUCCESS! Found', nearbyData.places.length, 'places');
      nearbyData.places.forEach((place, i) => {
        console.log(`   ${i + 1}. ${place.displayName?.text || 'Unknown'}`);
      });
      console.log('\n');
    } else {
      console.log('⚠️  No places found (this is OK, API is working)\n');
    }
  } catch (error) {
    console.log('❌ REQUEST FAILED:', error.message, '\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 2: Text Search (New API)
  console.log('Test 2: Text Search (New API)');
  console.log('Endpoint: https://places.googleapis.com/v1/places:searchText\n');

  try {
    const textUrl = 'https://places.googleapis.com/v1/places:searchText';
    const textBody = {
      textQuery: 'restaurants in Austin, TX',
      maxResultCount: 3,
      languageCode: 'en',
    };

    console.log('Request Body:', JSON.stringify(textBody, null, 2));
    console.log('\nSending request...\n');

    const textResponse = await fetch(textUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify(textBody),
    });

    const textData = await textResponse.json();

    if (textData.error) {
      console.log('❌ ERROR:', textData.error.status);
      console.log('   Message:', textData.error.message);
      console.log('\n📋 SOLUTION:');
      console.log('   The API is not enabled. See solution above.\n');
    } else if (textData.places) {
      console.log('✅ SUCCESS! Found', textData.places.length, 'places');
      textData.places.forEach((place, i) => {
        console.log(`   ${i + 1}. ${place.displayName?.text || 'Unknown'}`);
      });
      console.log('\n');
    } else {
      console.log('⚠️  No places found (this is OK, API is working)\n');
    }
  } catch (error) {
    console.log('❌ REQUEST FAILED:', error.message, '\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 3: Place Details (New API)
  console.log('Test 3: Place Details (New API)');
  console.log('Endpoint: https://places.googleapis.com/v1/places/{placeId}\n');

  try {
    // Using a known place ID (Google headquarters)
    const placeId = 'ChIJj61dQgK6j4AR4GeTYWZsKWw';
    const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;

    console.log('Place ID:', placeId);
    console.log('\nSending request...\n');

    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress',
      },
    });

    const detailsData = await detailsResponse.json();

    if (detailsData.error) {
      console.log('❌ ERROR:', detailsData.error.status);
      console.log('   Message:', detailsData.error.message, '\n');
    } else if (detailsData.displayName) {
      console.log('✅ SUCCESS!');
      console.log('   Name:', detailsData.displayName.text);
      console.log('   Address:', detailsData.formattedAddress, '\n');
    } else {
      console.log('⚠️  Unexpected response format\n');
    }
  } catch (error) {
    console.log('❌ REQUEST FAILED:', error.message, '\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🏁 TEST COMPLETE\n');
}

// Run the test
testPlacesNewAPI().catch(console.error);

