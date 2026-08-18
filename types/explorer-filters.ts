/**
 * Explorer Filter Types
 * Controls what gets shown in the Travel Log
 */

export interface ExplorerFilters {
  // Street Discovery
  streets: {
    enabled: boolean;
    minSignificance: 'all' | 'major' | 'significant-only'; // All streets, major roads only, or manually marked
  };
  
  // Landmark Discovery
  landmarks: {
    enabled: boolean;
    categories: {
      naturalFeatures: boolean;      // Parks, lakes, mountains, etc.
      historicSites: boolean;         // Museums, monuments, historic buildings
      governmentBuildings: boolean;   // Courthouses, city halls, capitols
      universities: boolean;          // Colleges, universities
      hospitals: boolean;             // Major medical centers
      stadiums: boolean;              // Sports venues, arenas
      airports: boolean;              // Airports
      attractions: boolean;           // Tourist attractions, zoos, theme parks
    };
    excludeChains: boolean;           // Filter out McDonald's, Starbucks, etc.
    minRating: number;                // Only show highly-rated places (0 = all)
  };
  
  // Display Options
  display: {
    showUnvisited: boolean;           // Show items you haven't visited yet
    showVisitCounts: boolean;         // Display "Visited 5 times"
    groupByCategory: boolean;         // Group landmarks by type
    sortBy: 'name' | 'recent' | 'distance'; // How to order items
  };
}

export const DEFAULT_EXPLORER_FILTERS: ExplorerFilters = {
  streets: {
    enabled: true,
    minSignificance: 'major', // Only major roads by default
  },
  landmarks: {
    enabled: true,
    categories: {
      naturalFeatures: true,
      historicSites: true,
      governmentBuildings: true,
      universities: true,
      hospitals: true,
      stadiums: true,
      airports: true,
      attractions: true,
    },
    excludeChains: true, // Don't clutter with every McDonald's
    minRating: 4.0, // Only show well-rated places
  },
  display: {
    showUnvisited: true,
    showVisitCounts: true,
    groupByCategory: true,
    sortBy: 'name',
  },
};

/**
 * Landmark categories from Google Places
 */
export const LANDMARK_CATEGORIES = {
  // High-value landmarks (always show)
  significant: [
    'tourist_attraction',
    'museum',
    'park',
    'stadium',
    'university',
    'airport',
    'city_hall',
    'courthouse',
    'library',
    'church',
    'synagogue',
    'mosque',
    'hindu_temple',
  ],
  
  // Chain businesses (filter by default)
  chains: [
    'restaurant',
    'cafe',
    'gas_station',
    'convenience_store',
    'supermarket',
    'pharmacy',
    'bank',
    'atm',
  ],
  
  // Natural features (show)
  natural: [
    'park',
    'campground',
    'natural_feature',
    'beach',
    'lake',
    'river',
  ],
};

/**
 * Known chain names to filter out
 */
export const CHAIN_PATTERNS = [
  'McDonald\'s',
  'Starbucks',
  'Subway',
  'Walmart',
  'Target',
  'CVS',
  'Walgreens',
  '7-Eleven',
  'Shell',
  'Chevron',
  'ExxonMobil',
  'BP',
  'Whataburger',
  'Chick-fil-A',
  'Taco Bell',
  'Burger King',
  'Wendy\'s',
  'KFC',
  'Pizza Hut',
  'Domino\'s',
  'Papa John\'s',
];

/**
 * Street significance levels
 */
export interface StreetSignificance {
  level: 'major' | 'significant' | 'minor';
  reason?: string;
}

/**
 * Determine if a street is significant
 */
export function determineStreetSignificance(streetName: string): StreetSignificance {
  const lower = streetName.toLowerCase();
  
  // Major roads/highways
  if (
    lower.includes('highway') ||
    lower.includes('interstate') ||
    lower.includes('freeway') ||
    lower.includes('expressway') ||
    lower.includes('parkway') ||
    lower.includes('boulevard') ||
    lower.match(/\b(us|state|fm|ranch)\s*\d+/)
  ) {
    return { level: 'major', reason: 'Highway or major arterial' };
  }
  
  // Significant streets (main drags)
  if (
    lower.includes('main') ||
    lower.includes('downtown') ||
    lower.includes('congress') ||
    lower.includes('capitol')
  ) {
    return { level: 'significant', reason: 'Major city street' };
  }
  
  // Everything else is minor
  return { level: 'minor' };
}

/**
 * Check if a place is a chain
 */
export function isChain(placeName: string): boolean {
  return CHAIN_PATTERNS.some(chain => 
    placeName.toLowerCase().includes(chain.toLowerCase())
  );
}

/**
 * Check if a landmark should be shown based on filters
 */
export function shouldShowLandmark(
  landmark: { name: string; category?: string; rating?: number },
  filters: ExplorerFilters['landmarks']
): boolean {
  if (!filters.enabled) return false;
  
  // Filter out chains if enabled
  if (filters.excludeChains && isChain(landmark.name)) {
    return false;
  }
  
  // Filter by rating
  if (landmark.rating && landmark.rating < filters.minRating) {
    return false;
  }
  
  // Check category filters
  // (Would need to map Google Places types to our categories)
  
  return true;
}

