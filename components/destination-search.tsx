/**
 * Destination Search Component
 * Uses Places API (New) — required when legacy Geocoding/Places are disabled.
 */

import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Coordinates } from '../services/navigation';
import { favoriteLocationsService } from '../services/favorite-locations';
import type { FavoriteLocation } from '../types/favorite-locations';
import { getGoogleMapsKeyProblem } from '../utils/google-maps-key';
import {
    resolvePlaceCoordinates,
    searchDestinations,
    type DestinationSuggestion,
} from '../utils/places-search';
import { googlePlaces } from '../services/google-places';
import { useAppTint } from './color-context';

interface DestinationSearchProps {
  currentLocation: Coordinates | null;
  onSelectDestination: (coordinates: Coordinates, description: string) => void;
  onClose: () => void;
}

const DestinationSearch = memo<DestinationSearchProps>(({
  currentLocation,
  onSelectDestination,
  onClose,
}) => {
  const { tint } = useAppTint();
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<DestinationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const configError = getGoogleMapsKeyProblem();
  const searchGen = useRef(0);
  const localityCache = useRef<{ key: string; city: string | null } | null>(null);

  const resolveLocality = useCallback(async (origin: Coordinates): Promise<string | null> => {
    const key = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}`;
    if (localityCache.current?.key === key) {
      return localityCache.current.city;
    }
    try {
      const hits = await Location.reverseGeocodeAsync({
        latitude: origin.latitude,
        longitude: origin.longitude,
      });
      const city = hits[0]?.city || hits[0]?.subregion || hits[0]?.district || null;
      localityCache.current = { key, city };
      return city;
    } catch {
      localityCache.current = { key, city: null };
      return null;
    }
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPredictions([]);
      setSearchError(null);
      return;
    }

    if (configError) {
      setPredictions([]);
      setSearchError(configError);
      return;
    }

    const gen = ++searchGen.current;
    setIsLoading(true);
    setSearchError(null);

    let origin = currentLocation;
    if (!origin) {
      try {
        const pos = await Location.getCurrentPositionAsync({});
        origin = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      } catch {
        origin = null;
      }
    }

    try {
      const locality = origin ? await resolveLocality(origin) : null;
      const results = await searchDestinations(query, origin, locality);
      if (gen !== searchGen.current) {
        return;
      }
      setPredictions(results);
    } catch (error) {
      if (gen !== searchGen.current) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Search failed';
      console.warn('Destination search error:', message);
      setPredictions([]);
      setSearchError(message);
    } finally {
      if (gen === searchGen.current) {
        setIsLoading(false);
      }
    }
  }, [configError, currentLocation, resolveLocality]);

  const handleSelectPrediction = useCallback(async (prediction: DestinationSuggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    setSearchError(null);

    try {
      const coordinates = await resolvePlaceCoordinates(
        prediction.place_id,
        prediction.description,
        prediction.coordinates
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelectDestination(
        coordinates,
        prediction.structured_formatting.main_text || prediction.description
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not resolve that place.';
      setSearchError(message);
    } finally {
      setIsLoading(false);
    }
  }, [onSelectDestination]);

  useEffect(() => {
    const loadFavorites = async () => {
      await favoriteLocationsService.initialize();
      const favs = await favoriteLocationsService.getAllFavorites();
      setFavorites(favs);
    };
    loadFavorites();
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 350);
  }, [searchPlaces]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelectFavorite = useCallback((favorite: FavoriteLocation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    favoriteLocationsService.recordUsage(favorite.id);
    onSelectDestination(favorite.coordinates, favorite.name);
  }, [onSelectDestination]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Where to?</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {(configError || searchError) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{configError ?? searchError}</Text>
        </View>
      )}

      <View style={[styles.searchContainer, { borderColor: tint }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search address or place..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isLoading && <ActivityIndicator size="small" color={tint} />}
      </View>

      {!searchQuery && favorites.length > 0 && (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>⭐ Favorites</Text>
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.favoriteItem}
                onPress={() => handleSelectFavorite(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.favoriteIcon}>
                  {item.category === 'home' ? '🏠' : item.category === 'work' ? '💼' : '⭐'}
                </Text>
                <View style={styles.favoriteInfo}>
                  <Text style={styles.favoriteName}>{item.name}</Text>
                  {item.address && (
                    <Text style={styles.favoriteAddress} numberOfLines={1}>{item.address}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      <FlatList
        data={predictions}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.predictionItem}
            onPress={() => handleSelectPrediction(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.predictionIcon, { backgroundColor: tint }]}>
              <Text style={styles.predictionIconText}>📍</Text>
            </View>
            <View style={styles.predictionTextContainer}>
              <Text style={styles.predictionMain}>
                {item.structured_formatting.main_text}
              </Text>
              <Text style={styles.predictionSecondary} numberOfLines={1}>
                {item.distanceMeters != null
                  ? `${googlePlaces.formatDistance(item.distanceMeters)} • ${item.structured_formatting.secondary_text || item.description}`
                  : item.structured_formatting.secondary_text || item.description}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchQuery.trim() && !isLoading && !configError && !searchError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No results found</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
});

DestinationSearch.displayName = 'DestinationSearch';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#888',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  listContent: {
    paddingVertical: 8,
  },
  favoritesSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 8,
  },
  favoriteIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  favoriteAddress: {
    fontSize: 14,
    color: '#888',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  predictionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  predictionIconText: {
    fontSize: 20,
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionMain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  predictionSecondary: {
    fontSize: 14,
    color: '#888',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
});

export default DestinationSearch;
