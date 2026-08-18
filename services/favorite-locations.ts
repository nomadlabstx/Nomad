/**
 * Favorite Locations Service
 * Manages saved favorite locations for quick access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Coordinates } from '../types/navigation';
import type { FavoriteLocation } from '../types/favorite-locations';

const FAVORITES_KEY = '@nomad_favorite_locations';

class FavoriteLocationsService {
  private favorites: FavoriteLocation[] = [];
  private initialized = false;

  /**
   * Initialize favorites from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        this.favorites = JSON.parse(stored);
      }
      this.initialized = true;
    } catch (error) {
      console.error('[FavoriteLocations] Failed to initialize:', error);
      this.favorites = [];
      this.initialized = true;
    }
  }

  /**
   * Save favorites to storage
   */
  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(this.favorites));
    } catch (error) {
      console.error('[FavoriteLocations] Failed to save:', error);
    }
  }

  /**
   * Get all favorite locations
   */
  async getAllFavorites(): Promise<FavoriteLocation[]> {
    await this.initialize();
    return [...this.favorites];
  }

  /**
   * Add a favorite location
   */
  async addFavorite(
    name: string,
    coordinates: Coordinates,
    address?: string,
    category: FavoriteLocation['category'] = 'favorite'
  ): Promise<FavoriteLocation> {
    await this.initialize();

    const favorite: FavoriteLocation = {
      id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      coordinates,
      address,
      category,
      createdAt: Date.now(),
      useCount: 0,
    };

    this.favorites.push(favorite);
    await this.save();

    return favorite;
  }

  /**
   * Remove a favorite location
   */
  async removeFavorite(id: string): Promise<boolean> {
    await this.initialize();

    const index = this.favorites.findIndex(f => f.id === id);
    if (index === -1) return false;

    this.favorites.splice(index, 1);
    await this.save();

    return true;
  }

  /**
   * Update favorite location
   */
  async updateFavorite(id: string, updates: Partial<FavoriteLocation>): Promise<boolean> {
    await this.initialize();

    const index = this.favorites.findIndex(f => f.id === id);
    if (index === -1) return false;

    this.favorites[index] = { ...this.favorites[index], ...updates };
    await this.save();

    return true;
  }

  /**
   * Record usage of a favorite (for sorting by most used)
   */
  async recordUsage(id: string): Promise<void> {
    await this.initialize();

    const favorite = this.favorites.find(f => f.id === id);
    if (favorite) {
      favorite.lastUsed = Date.now();
      favorite.useCount = (favorite.useCount || 0) + 1;
      await this.save();
    }
  }

  /**
   * Get favorites by category
   */
  async getFavoritesByCategory(category: FavoriteLocation['category']): Promise<FavoriteLocation[]> {
    await this.initialize();
    return this.favorites.filter(f => f.category === category);
  }

  /**
   * Get most used favorites
   */
  async getMostUsedFavorites(limit: number = 5): Promise<FavoriteLocation[]> {
    await this.initialize();
    return [...this.favorites]
      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
      .slice(0, limit);
  }
}

export const favoriteLocationsService = new FavoriteLocationsService();

