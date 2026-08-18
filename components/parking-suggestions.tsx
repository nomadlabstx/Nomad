/**
 * Parking Suggestions Component
 * Shows nearby parking options when approaching destination
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { googlePlaces, type PlaceResult } from '../services/google-places';
import type { Coordinates } from '../services/navigation';

interface ParkingSuggestionsProps {
  visible: boolean;
  onClose: () => void;
  destination: Coordinates;
  destinationName?: string;
  onSelectParking: (parking: PlaceResult) => void;
  tintColor?: string;
}

type ParkingFilter = 'all' | 'garage' | 'lot' | 'street';

export function ParkingSuggestions({
  visible,
  onClose,
  destination,
  destinationName,
  onSelectParking,
  tintColor = '#007AFF',
}: ParkingSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [parkingOptions, setParkingOptions] = useState<PlaceResult[]>([]);
  const [filter, setFilter] = useState<ParkingFilter>('all');
  const [filteredParking, setFilteredParking] = useState<{
    garages: PlaceResult[];
    lots: PlaceResult[];
    street: PlaceResult[];
  }>({ garages: [], lots: [], street: [] });

  /**
   * Load parking from Google Places
   */
  const loadParking = useCallback(async () => {
    setLoading(true);
    try {
      // Get all parking within 500m
      const parking = await googlePlaces.findParkingNear(destination, 500);
      setParkingOptions(parking);

      // Get categorized parking
      const categorized = await googlePlaces.findParkingFiltered(destination, 500);
      setFilteredParking(categorized);
    } catch (error) {
      console.error('Error loading parking:', error);
    } finally {
      setLoading(false);
    }
  }, [destination]);

  /**
   * Load parking options when visible
   */
  useEffect(() => {
    if (visible) {
      loadParking();
    }
  }, [visible, loadParking]);

  /**
   * Get filtered parking list based on current filter
   */
  const getFilteredList = (): PlaceResult[] => {
    switch (filter) {
      case 'garage':
        return filteredParking.garages;
      case 'lot':
        return filteredParking.lots;
      case 'street':
        return filteredParking.street;
      default:
        return parkingOptions;
    }
  };

  /**
   * Handle parking selection
   */
  const handleSelect = useCallback((parking: PlaceResult) => {
    onSelectParking(parking);
    onClose();
  }, [onSelectParking, onClose]);

  /**
   * Render a single parking option
   */
  const renderParking = useCallback(({ item }: { item: PlaceResult }) => {
    const walkingTime = item.distance ? Math.ceil((item.distance / 80) * 60) : null; // ~80m/min walking speed

    // Determine parking type icon
    let typeIcon = 'car';
    let typeName = 'Parking';
    if (item.name.toLowerCase().includes('garage') || item.name.toLowerCase().includes('deck')) {
      typeIcon = 'business';
      typeName = 'Garage';
    } else if (item.name.toLowerCase().includes('lot')) {
      typeIcon = 'square';
      typeName = 'Lot';
    } else if (item.name.toLowerCase().includes('street') || item.name.toLowerCase().includes('meter')) {
      typeIcon = 'pricetag';
      typeName = 'Street';
    }

    return (
      <TouchableOpacity
        style={styles.parkingCard}
        onPress={() => handleSelect(item)}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${tintColor}20` }]}>
          <Ionicons name={typeIcon as any} size={24} color={tintColor} />
        </View>

        {/* Info */}
        <View style={styles.parkingInfo}>
          <Text style={styles.parkingName} numberOfLines={1}>
            {item.name}
          </Text>
          
          <View style={styles.parkingMeta}>
            {/* Type */}
            <View style={styles.metaItem}>
              <Ionicons name="information-circle-outline" size={14} color="#888" />
              <Text style={styles.metaText}>{typeName}</Text>
            </View>

            {/* Distance */}
            {item.distance && (
              <View style={styles.metaItem}>
                <Ionicons name="walk-outline" size={14} color="#888" />
                <Text style={styles.metaText}>
                  {googlePlaces.formatDistance(item.distance)} • {walkingTime} min
                </Text>
              </View>
            )}

            {/* Rating */}
            {item.rating && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}

            {/* Price */}
            {item.priceLevel !== undefined && (
              <View style={styles.metaItem}>
                <Text style={styles.priceText}>
                  {googlePlaces.formatPriceLevel(item.priceLevel)}
                </Text>
              </View>
            )}
          </View>

          {/* Address */}
          {item.formattedAddress && (
            <Text style={styles.address} numberOfLines={1}>
              {item.formattedAddress}
            </Text>
          )}
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  }, [tintColor, handleSelect]);

  const currentList = getFilteredList();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Parking Near</Text>
            {destinationName && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {destinationName}
              </Text>
            )}
          </View>
          <View style={styles.closeButton} />
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && { backgroundColor: tintColor }]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({parkingOptions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'garage' && { backgroundColor: tintColor }]}
            onPress={() => setFilter('garage')}
          >
            <Text style={[styles.filterText, filter === 'garage' && styles.filterTextActive]}>
              Garages ({filteredParking.garages.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'lot' && { backgroundColor: tintColor }]}
            onPress={() => setFilter('lot')}
          >
            <Text style={[styles.filterText, filter === 'lot' && styles.filterTextActive]}>
              Lots ({filteredParking.lots.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'street' && { backgroundColor: tintColor }]}
            onPress={() => setFilter('street')}
          >
            <Text style={[styles.filterText, filter === 'street' && styles.filterTextActive]}>
              Street ({filteredParking.street.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
            <Text style={styles.loadingText}>Finding parking...</Text>
          </View>
        ) : currentList.length > 0 ? (
          <FlatList
            data={currentList}
            renderItem={renderParking}
            keyExtractor={item => item.placeId}
            contentContainerStyle={styles.list}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Parking Found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or search in a different area
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  list: {
    padding: 16,
  },
  parkingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  parkingInfo: {
    flex: 1,
  },
  parkingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  parkingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#888',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  address: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

