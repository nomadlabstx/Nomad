/**
 * Script to discover missing locations using Google Places API
 * This will find and add missing cities, towns, and villages to the database
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Google Places API configuration
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1';

if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API key not found. Please set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.');
  process.exit(1);
}

/**
 * Search for nearby places using Google Places API
 */
async function searchNearbyPlaces(location, radius = 10000) {
  try {
    const url = `${BASE_URL}/places:searchNearby`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types'
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: {
              latitude: location.latitude,
              longitude: location.longitude
            },
            radius: radius
          }
        },
        languageCode: 'en',
        maxResultCount: 20
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Google Places API error:', data.error);
      return [];
    }

    return data.places || [];
  } catch (error) {
    console.error('Error searching nearby places:', error);
    return [];
  }
}

/**
 * Search for places by text query
 */
async function searchPlacesByText(query) {
  try {
    const url = `${BASE_URL}/places:searchText`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types'
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
        maxResultCount: 10
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Google Places API error:', data.error);
      return [];
    }

    return data.places || [];
  } catch (error) {
    console.error('Error searching places by text:', error);
    return [];
  }
}

/**
 * Check if a place is a locality (city, town, village)
 */
function isLocality(place) {
  const localityTypes = [
    'locality',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5'
  ];

  // Check if it has locality type
  const hasLocalityType = place.types && place.types.some(type => localityTypes.includes(type));
  
  // Check if it's a political area but not a state or country
  const hasPoliticalType = place.types && place.types.some(type => type === 'political');
  const isStateOrCountry = place.types && (place.types.includes('administrative_area_level_1') || place.types.includes('country'));
  
  return hasLocalityType || (hasPoliticalType && !isStateOrCountry);
}

/**
 * Extract location information from a Google Place
 */
function extractLocationInfo(place, searchState = '') {
  const name = place.displayName?.text || place.name || 'Unknown';
  const coordinates = {
    latitude: place.location?.latitude || 0,
    longitude: place.location?.longitude || 0
  };
  
  // Use the search state as the state, or try to extract from formatted address
  let state = searchState;
  let county = searchState; // For now, use state as county
  
  // Try to extract state from formatted address if available
  if (place.formattedAddress) {
    const addressParts = place.formattedAddress.split(', ');
    for (let i = addressParts.length - 2; i >= 0; i--) {
      const part = addressParts[i];
      if (isStateName(part)) {
        state = part;
        county = part;
        break;
      }
    }
  }

  // Determine location type based on name and types
  let type = 'city';
  if (place.types?.includes('sublocality')) {
    type = 'neighborhood';
  } else if (name.toLowerCase().includes('village')) {
    type = 'village';
  } else if (name.toLowerCase().includes('town')) {
    type = 'town';
  }

  return {
    name,
    state,
    county,
    coordinates,
    type,
    confidence: place.rating && place.rating >= 4.0 ? 'high' : 'medium'
  };
}

/**
 * Check if a string looks like a state name
 */
function isStateName(str) {
  const stateNames = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
  ];
  
  return stateNames.includes(str);
}

/**
 * Main function to discover missing locations
 */
async function discoverMissingLocations() {
  console.log('🚀 Starting location discovery using Google Places API...\n');

  try {
    const discoveredLocations = [];
    
    // Major US cities to use as discovery centers
    const majorUSCities = [
      { name: 'New York', state: 'NY', coords: { latitude: 40.7128, longitude: -74.0060 } },
      { name: 'Los Angeles', state: 'CA', coords: { latitude: 34.0522, longitude: -118.2437 } },
      { name: 'Chicago', state: 'IL', coords: { latitude: 41.8781, longitude: -87.6298 } },
      { name: 'Houston', state: 'TX', coords: { latitude: 29.7604, longitude: -95.3698 } },
      { name: 'Phoenix', state: 'AZ', coords: { latitude: 33.4484, longitude: -112.0740 } },
      { name: 'Philadelphia', state: 'PA', coords: { latitude: 39.9526, longitude: -75.1652 } },
      { name: 'San Antonio', state: 'TX', coords: { latitude: 29.4241, longitude: -98.4936 } },
      { name: 'San Diego', state: 'CA', coords: { latitude: 32.7157, longitude: -117.1611 } },
      { name: 'Dallas', state: 'TX', coords: { latitude: 32.7767, longitude: -96.7970 } },
      { name: 'San Jose', state: 'CA', coords: { latitude: 37.3382, longitude: -121.8863 } },
      { name: 'Austin', state: 'TX', coords: { latitude: 30.2672, longitude: -97.7431 } },
      { name: 'Jacksonville', state: 'FL', coords: { latitude: 30.3322, longitude: -81.6557 } },
      { name: 'Fort Worth', state: 'TX', coords: { latitude: 32.7555, longitude: -97.3308 } },
      { name: 'Columbus', state: 'OH', coords: { latitude: 39.9612, longitude: -82.9988 } },
      { name: 'Charlotte', state: 'NC', coords: { latitude: 35.2271, longitude: -80.8431 } },
      { name: 'San Francisco', state: 'CA', coords: { latitude: 37.7749, longitude: -122.4194 } },
      { name: 'Indianapolis', state: 'IN', coords: { latitude: 39.7684, longitude: -86.1581 } },
      { name: 'Seattle', state: 'WA', coords: { latitude: 47.6062, longitude: -122.3321 } },
      { name: 'Denver', state: 'CO', coords: { latitude: 39.7392, longitude: -104.9903 } },
      { name: 'Washington', state: 'DC', coords: { latitude: 38.9072, longitude: -77.0369 } }
    ];

    // Discover locations using text search for each state
    const statesToSearch = [
      'Wyoming', 'Montana', 'North Dakota', 'South Dakota', 'Alaska', 'Hawaii',
      'Vermont', 'New Hampshire', 'Maine', 'Rhode Island', 'Delaware', 'Connecticut'
    ];

    for (const state of statesToSearch) {
      console.log(`📍 Discovering cities and towns in ${state}...`);
      
      try {
        // Search for cities and towns in the state
        const citySearch = await searchPlacesByText(`cities and towns in ${state}`);
        const townSearch = await searchPlacesByText(`small towns in ${state}`);
        const villageSearch = await searchPlacesByText(`villages in ${state}`);
        
        const allPlaces = [...citySearch, ...townSearch, ...villageSearch];
        
        for (const place of allPlaces) {
          // Debug: show what types we're getting
          if (place.types && place.types.length > 0) {
            console.log(`   🔍 Place: ${place.displayName?.text || place.name} - Types: ${place.types.join(', ')}`);
          }
          
          if (isLocality(place)) {
            const locationInfo = extractLocationInfo(place, state);
            console.log(`   🔍 Extracted: ${locationInfo.name}, State: "${locationInfo.state}", County: "${locationInfo.county}"`);
            if (locationInfo.name && locationInfo.state) {
              discoveredLocations.push(locationInfo);
              console.log(`   📍 Found: ${locationInfo.name}, ${locationInfo.state}`);
            } else {
              console.log(`   ❌ Skipped: Missing state or name`);
            }
          }
        }
        
        console.log(`✅ Found ${allPlaces.length} places in ${state}`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Error discovering locations in ${state}:`, error);
      }
    }

    // Remove duplicates
    const uniqueLocations = [];
    const seen = new Set();
    
    for (const location of discoveredLocations) {
      const key = `${location.name},${location.state}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLocations.push(location);
      }
    }

    console.log(`\n🎉 Discovery completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total places found: ${discoveredLocations.length}`);
    console.log(`   - Unique locations: ${uniqueLocations.length}`);
    console.log(`   - Locations with high confidence: ${uniqueLocations.filter(l => l.confidence === 'high').length}`);
    
    // Display some examples
    console.log(`\n📋 Sample discovered locations:`);
    uniqueLocations.slice(0, 10).forEach((location, index) => {
      console.log(`   ${index + 1}. ${location.name}, ${location.state} (${location.confidence} confidence)`);
    });

    if (uniqueLocations.length > 10) {
      console.log(`   ... and ${uniqueLocations.length - 10} more locations`);
    }

    console.log(`\n💡 Next steps:`);
    console.log(`   - These locations can be added to the Explorer database`);
    console.log(`   - The auto-discovery system can be integrated into the app`);
    console.log(`   - Users can discover new locations as they travel`);

  } catch (error) {
    console.error('❌ Error during location discovery:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  discoverMissingLocations()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { discoverMissingLocations };
