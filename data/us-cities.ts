/**
 * US Cities Database
 * Initial dataset with major, medium, and sample small cities
 * Can be expanded with Census data
 */

import type { CityData } from '../types/location-database';

// Major US Cities (Population > 500K) - Top 50
export const MAJOR_CITIES: CityData[] = [
  // Top 20 by population
  { name: 'New York', state: 'New York', stateCode: 'NY', population: 8336817, coordinates: { latitude: 40.7128, longitude: -74.0060 }, size: 'major', confidence: 'high', knownFor: ['finance', 'culture', 'food'] },
  { name: 'Los Angeles', state: 'California', stateCode: 'CA', population: 3979576, coordinates: { latitude: 34.0522, longitude: -118.2437 }, size: 'major', confidence: 'high', knownFor: ['entertainment', 'beaches', 'tech'] },
  { name: 'Chicago', state: 'Illinois', stateCode: 'IL', population: 2693976, coordinates: { latitude: 41.8781, longitude: -87.6298 }, size: 'major', confidence: 'high', knownFor: ['architecture', 'food', 'culture'] },
  { name: 'Houston', state: 'Texas', stateCode: 'TX', population: 2320268, coordinates: { latitude: 29.7604, longitude: -95.3698 }, size: 'major', confidence: 'high', knownFor: ['space', 'energy', 'food'] },
  { name: 'Phoenix', state: 'Arizona', stateCode: 'AZ', population: 1680992, coordinates: { latitude: 33.4484, longitude: -112.0740 }, size: 'major', confidence: 'high', knownFor: ['desert', 'golf', 'resorts'] },
  { name: 'Philadelphia', state: 'Pennsylvania', stateCode: 'PA', population: 1584064, coordinates: { latitude: 39.9526, longitude: -75.1652 }, size: 'major', confidence: 'high', knownFor: ['history', 'food', 'culture'], isCapital: false },
  { name: 'San Antonio', state: 'Texas', stateCode: 'TX', population: 1547253, coordinates: { latitude: 29.4241, longitude: -98.4936 }, size: 'major', confidence: 'high', knownFor: ['history', 'river walk', 'tex-mex'] },
  { name: 'San Diego', state: 'California', stateCode: 'CA', population: 1423851, coordinates: { latitude: 32.7157, longitude: -117.1611 }, size: 'major', confidence: 'high', knownFor: ['beaches', 'zoo', 'craft beer'] },
  { name: 'Dallas', state: 'Texas', stateCode: 'TX', population: 1343573, coordinates: { latitude: 32.7767, longitude: -96.7970 }, size: 'major', confidence: 'high', knownFor: ['business', 'sports', 'food'] },
  { name: 'San Jose', state: 'California', stateCode: 'CA', population: 1021795, coordinates: { latitude: 37.3382, longitude: -121.8863 }, size: 'major', confidence: 'high', knownFor: ['tech', 'innovation', 'diversity'] },
  { name: 'Austin', state: 'Texas', stateCode: 'TX', population: 978908, coordinates: { latitude: 30.2672, longitude: -97.7431 }, size: 'major', confidence: 'high', knownFor: ['music', 'tech', 'food'], isCapital: true },
  { name: 'Jacksonville', state: 'Florida', stateCode: 'FL', population: 949611, coordinates: { latitude: 30.3322, longitude: -81.6557 }, size: 'major', confidence: 'high', knownFor: ['beaches', 'military', 'logistics'] },
  { name: 'Fort Worth', state: 'Texas', stateCode: 'TX', population: 918915, coordinates: { latitude: 32.7555, longitude: -97.3308 }, size: 'major', confidence: 'high', knownFor: ['western heritage', 'stockyards', 'museums'] },
  { name: 'Columbus', state: 'Ohio', stateCode: 'OH', population: 905748, coordinates: { latitude: 39.9612, longitude: -82.9988 }, size: 'major', confidence: 'high', knownFor: ['education', 'food scene', 'innovation'], isCapital: true },
  { name: 'Charlotte', state: 'North Carolina', stateCode: 'NC', population: 885708, coordinates: { latitude: 35.2271, longitude: -80.8431 }, size: 'major', confidence: 'high', knownFor: ['banking', 'nascar', 'business'] },
  { name: 'San Francisco', state: 'California', stateCode: 'CA', population: 873965, coordinates: { latitude: 37.7749, longitude: -122.4194 }, size: 'major', confidence: 'high', knownFor: ['tech', 'culture', 'landmarks'] },
  { name: 'Indianapolis', state: 'Indiana', stateCode: 'IN', population: 876384, coordinates: { latitude: 39.7684, longitude: -86.1581 }, size: 'major', confidence: 'high', knownFor: ['racing', 'sports', 'convention center'], isCapital: true },
  { name: 'Seattle', state: 'Washington', stateCode: 'WA', population: 753675, coordinates: { latitude: 47.6062, longitude: -122.3321 }, size: 'major', confidence: 'high', knownFor: ['tech', 'coffee', 'nature'] },
  { name: 'Denver', state: 'Colorado', stateCode: 'CO', population: 727211, coordinates: { latitude: 39.7392, longitude: -104.9903 }, size: 'major', confidence: 'high', knownFor: ['outdoors', 'craft beer', 'skiing'], isCapital: true },
  { name: 'Washington', state: 'District of Columbia', stateCode: 'DC', population: 689545, coordinates: { latitude: 38.9072, longitude: -77.0369 }, size: 'major', confidence: 'high', knownFor: ['government', 'monuments', 'museums'], isCapital: true },
  
  // More major cities (21-50)
  { name: 'Boston', state: 'Massachusetts', stateCode: 'MA', population: 692600, coordinates: { latitude: 42.3601, longitude: -71.0589 }, size: 'major', confidence: 'high', knownFor: ['history', 'education', 'seafood'], isCapital: true },
  { name: 'Nashville', state: 'Tennessee', stateCode: 'TN', population: 689447, coordinates: { latitude: 36.1627, longitude: -86.7816 }, size: 'major', confidence: 'high', knownFor: ['music', 'entertainment', 'food'], isCapital: true },
  { name: 'El Paso', state: 'Texas', stateCode: 'TX', population: 681728, coordinates: { latitude: 31.7619, longitude: -106.4850 }, size: 'major', confidence: 'high', knownFor: ['border culture', 'tex-mex', 'mountains'] },
  { name: 'Detroit', state: 'Michigan', stateCode: 'MI', population: 639111, coordinates: { latitude: 42.3314, longitude: -83.0458 }, size: 'major', confidence: 'high', knownFor: ['automotive', 'music', 'sports'] },
  { name: 'Portland', state: 'Oregon', stateCode: 'OR', population: 652503, coordinates: { latitude: 45.5152, longitude: -122.6784 }, size: 'major', confidence: 'high', knownFor: ['food', 'craft beer', 'outdoors'] },
  { name: 'Las Vegas', state: 'Nevada', stateCode: 'NV', population: 641903, coordinates: { latitude: 36.1699, longitude: -115.1398 }, size: 'major', confidence: 'high', knownFor: ['entertainment', 'casinos', 'shows'], isTouristDestination: true },
  { name: 'Memphis', state: 'Tennessee', stateCode: 'TN', population: 633104, coordinates: { latitude: 35.1495, longitude: -90.0490 }, size: 'major', confidence: 'high', knownFor: ['music', 'bbq', 'elvis'] },
  { name: 'Louisville', state: 'Kentucky', stateCode: 'KY', population: 617790, coordinates: { latitude: 38.2527, longitude: -85.7585 }, size: 'major', confidence: 'high', knownFor: ['bourbon', 'derby', 'horses'] },
  { name: 'Baltimore', state: 'Maryland', stateCode: 'MD', population: 585708, coordinates: { latitude: 39.2904, longitude: -76.6122 }, size: 'major', confidence: 'high', knownFor: ['harbor', 'seafood', 'history'] },
  { name: 'Milwaukee', state: 'Wisconsin', stateCode: 'WI', population: 577222, coordinates: { latitude: 43.0389, longitude: -87.9065 }, size: 'major', confidence: 'high', knownFor: ['beer', 'lakefront', 'festivals'] },
  
  // Additional major cities for comprehensive coverage
  { name: 'Atlanta', state: 'Georgia', stateCode: 'GA', population: 498715, coordinates: { latitude: 33.7490, longitude: -84.3880 }, size: 'major', confidence: 'high', knownFor: ['business', 'culture', 'food'], isCapital: true },
  { name: 'Miami', state: 'Florida', stateCode: 'FL', population: 467963, coordinates: { latitude: 25.7617, longitude: -80.1918 }, size: 'major', confidence: 'high', knownFor: ['beaches', 'nightlife', 'culture'], isTouristDestination: true },
  { name: 'Minneapolis', state: 'Minnesota', stateCode: 'MN', population: 429954, coordinates: { latitude: 44.9778, longitude: -93.2650 }, size: 'major', confidence: 'high', knownFor: ['lakes', 'arts', 'food'] },
  { name: 'Tampa', state: 'Florida', stateCode: 'FL', population: 399700, coordinates: { latitude: 27.9506, longitude: -82.4572 }, size: 'major', confidence: 'high', knownFor: ['beaches', 'sports', 'cigar history'] },
  { name: 'New Orleans', state: 'Louisiana', stateCode: 'LA', population: 390144, coordinates: { latitude: 29.9511, longitude: -90.0715 }, size: 'major', confidence: 'high', knownFor: ['music', 'food', 'culture'], isTouristDestination: true },
];

// Medium Cities (Population 100K-500K) - Sample
export const MEDIUM_CITIES: CityData[] = [
  // Connecticut cities (user's region)
  { name: 'Hartford', state: 'Connecticut', stateCode: 'CT', population: 121054, coordinates: { latitude: 41.7658, longitude: -72.6734 }, size: 'medium', confidence: 'medium', knownFor: ['insurance', 'history'], isCapital: true },
  { name: 'Bridgeport', state: 'Connecticut', stateCode: 'CT', population: 148654, coordinates: { latitude: 41.1865, longitude: -73.1952 }, size: 'medium', confidence: 'medium', knownFor: ['coastal', 'industry'] },
  { name: 'New Haven', state: 'Connecticut', stateCode: 'CT', population: 134023, coordinates: { latitude: 41.3083, longitude: -72.9279 }, size: 'medium', confidence: 'medium', knownFor: ['yale', 'pizza', 'culture'] },
  { name: 'Stamford', state: 'Connecticut', stateCode: 'CT', population: 135470, coordinates: { latitude: 41.0534, longitude: -73.5387 }, size: 'medium', confidence: 'medium', knownFor: ['business', 'coastal'] },
  
  // Texas medium cities
  { name: 'Waco', state: 'Texas', stateCode: 'TX', population: 139236, coordinates: { latitude: 31.5493, longitude: -97.1467 }, size: 'medium', confidence: 'medium', knownFor: ['magnolia', 'baylor', 'dr pepper'] },
  
  // Other notable medium cities
  { name: 'Orlando', state: 'Florida', stateCode: 'FL', population: 307573, coordinates: { latitude: 28.5383, longitude: -81.3792 }, size: 'medium', confidence: 'high', knownFor: ['theme parks', 'tourism'], isTouristDestination: true },
  { name: 'Reno', state: 'Nevada', stateCode: 'NV', population: 264165, coordinates: { latitude: 39.5296, longitude: -119.8138 }, size: 'medium', confidence: 'medium', knownFor: ['casinos', 'outdoors'] },
];

// Small Cities and Towns (Population < 100K) - Sample for Connecticut and Texas
export const SMALL_CITIES: CityData[] = [
  // Connecticut small towns
  { name: 'Waterbury', state: 'Connecticut', stateCode: 'CT', population: 108802, coordinates: { latitude: 41.5582, longitude: -73.0515 }, size: 'small', confidence: 'low', knownFor: ['brass city', 'historic'] },
  { name: 'Norwalk', state: 'Connecticut', stateCode: 'CT', population: 91184, coordinates: { latitude: 41.1177, longitude: -73.4079 }, size: 'small', confidence: 'low', knownFor: ['coastal', 'commuter town'] },
  { name: 'Danbury', state: 'Connecticut', stateCode: 'CT', population: 86518, coordinates: { latitude: 41.3948, longitude: -73.4540 }, size: 'small', confidence: 'low', knownFor: ['hat city', 'historic'] },
  { name: 'New Britain', state: 'Connecticut', stateCode: 'CT', population: 72939, coordinates: { latitude: 41.6612, longitude: -72.7795 }, size: 'small', confidence: 'low', knownFor: ['hardware city', 'polish heritage'] },
  { name: 'West Hartford', state: 'Connecticut', stateCode: 'CT', population: 63023, coordinates: { latitude: 41.7620, longitude: -72.7420 }, size: 'small', confidence: 'low', knownFor: ['suburban', 'shopping'] },
  { name: 'Greenwich', state: 'Connecticut', stateCode: 'CT', population: 63518, coordinates: { latitude: 41.0262, longitude: -73.6282 }, size: 'small', confidence: 'low', knownFor: ['wealth', 'coastal', 'commuter town'] },
  { name: 'Hamden', state: 'Connecticut', stateCode: 'CT', population: 61169, coordinates: { latitude: 41.3960, longitude: -72.8968 }, size: 'small', confidence: 'low', knownFor: ['suburban', 'quinnipiac'] },
  { name: 'Meriden', state: 'Connecticut', stateCode: 'CT', population: 59512, coordinates: { latitude: 41.5382, longitude: -72.8070 }, size: 'small', confidence: 'low', knownFor: ['central location', 'historic'] },
];

// Very Small Towns (Villages) - Sample for Connecticut
export const VILLAGES: CityData[] = [
  { name: 'Litchfield', state: 'Connecticut', stateCode: 'CT', population: 8466, coordinates: { latitude: 41.7473, longitude: -73.1887 }, size: 'village', confidence: 'low', knownFor: ['historic', 'rural', 'colonial'] },
  { name: 'Essex', state: 'Connecticut', stateCode: 'CT', population: 6733, coordinates: { latitude: 41.3539, longitude: -72.3923 }, size: 'village', confidence: 'low', knownFor: ['riverfront', 'historic', 'charming'] },
  { name: 'Chester', state: 'Connecticut', stateCode: 'CT', population: 3861, coordinates: { latitude: 41.4037, longitude: -72.4620 }, size: 'village', confidence: 'low', knownFor: ['riverfront', 'arts', 'rural'] },
  { name: 'Old Saybrook', state: 'Connecticut', stateCode: 'CT', population: 10481, coordinates: { latitude: 41.2918, longitude: -72.3762 }, size: 'village', confidence: 'low', knownFor: ['coastal', 'historic', 'beaches'] },
];

// Tourist Destinations (May not be large cities but well-known)
export const TOURIST_DESTINATIONS: CityData[] = [
  { name: 'Key West', state: 'Florida', stateCode: 'FL', population: 24649, coordinates: { latitude: 24.5551, longitude: -81.7800 }, size: 'small', confidence: 'high', knownFor: ['beaches', 'sunsets', 'hemingway'], isTouristDestination: true },
  { name: 'Aspen', state: 'Colorado', stateCode: 'CO', population: 7004, coordinates: { latitude: 39.1911, longitude: -106.8175 }, size: 'village', confidence: 'high', knownFor: ['skiing', 'luxury', 'mountains'], isTouristDestination: true },
  { name: 'Napa', state: 'California', stateCode: 'CA', population: 79722, coordinates: { latitude: 38.2975, longitude: -122.2869 }, size: 'small', confidence: 'high', knownFor: ['wine', 'food', 'vineyards'], isTouristDestination: true },
  { name: 'Gatlinburg', state: 'Tennessee', stateCode: 'TN', population: 4144, coordinates: { latitude: 35.7143, longitude: -83.5102 }, size: 'village', confidence: 'high', knownFor: ['smoky mountains', 'tourism'], isTouristDestination: true },
];


