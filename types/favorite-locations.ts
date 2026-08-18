/**
 * Favorite Locations Types
 */

import type { Coordinates } from './navigation';

export interface FavoriteLocation {
  id: string;
  name: string;
  coordinates: Coordinates;
  address?: string;
  category?: 'home' | 'work' | 'favorite' | 'custom';
  createdAt: number;
  lastUsed?: number;
  useCount: number;
}

