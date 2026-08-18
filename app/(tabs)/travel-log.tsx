/**
 * Travel Log Tab - Trip History
 * View all recorded trips with search, filter, and export capabilities
 */

import { useAppTint } from '@/components/color-context';
import { useSelectedBackgroundColor } from '../../utils/theme-helpers';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { routeHistoryService } from '../../services/route-history';
import { Trip } from '../../types';
import type { SavedRoute } from '../../types/route-history';
import { clearAllTrips, deleteTrip, getTrips, saveTrips } from '../../utils/storage';
import { recordedTripTitle, resolveRecordedTripTitle, isFriendlyTripTitle, tripReplayTarget } from '../../utils/recorded-trip-title';

const TravelLog = React.memo(() => {
  const { tint } = useAppTint();
  const theme = useThemeColors();
  const selectedBgColor = useSelectedBackgroundColor(tint);
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'distance'>('date');

  /**
   * Load trips from storage
   */
  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const storedTrips = await getTrips();
      const routes = await routeHistoryService.getAllRoutes();
      const resolved = storedTrips.map((trip) => {
        const match = resolveRecordedTripTitle(trip, routes);
        if (!trip.name && isFriendlyTripTitle(match.title)) {
          return { ...trip, name: match.title };
        }
        return trip;
      });
      const namedCount = resolved.filter((trip) => Boolean(trip.name)).length;
      if (namedCount > storedTrips.filter((trip) => Boolean(trip.name)).length) {
        await saveTrips(resolved);
      }
      setSavedRoutes(routes);
      const sorted = resolved.sort((a, b) => (b.startTs || 0) - (a.startTs || 0));
      setTrips(sorted);
    } catch (error) {
      console.error('[TravelLog] Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh trips
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  }, [loadTrips]);

  useFocusEffect(
    useCallback(() => {
      void loadTrips();
    }, [loadTrips])
  );

  /**
   * Filter and sort trips
   */
  const filteredTrips = React.useMemo(() => {
    let filtered = trips;

    // Filter by search query (future: search by location, date, etc.)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trip => {
        const title = recordedTripTitle(trip, savedRoutes).toLowerCase();
        const date = trip.startTs ? new Date(trip.startTs).toLocaleDateString() : '';
        const distance = ((trip.meters || 0) / 1609.34).toFixed(1);
        return title.includes(query) || date.includes(query) || distance.includes(query);
      });
    }

    // Sort
    if (sortBy === 'date') {
      filtered = [...filtered].sort((a, b) => (b.startTs || 0) - (a.startTs || 0));
    } else if (sortBy === 'distance') {
      filtered = [...filtered].sort((a, b) => (b.meters || 0) - (a.meters || 0));
    }

    return filtered;
  }, [trips, savedRoutes, searchQuery, sortBy]);

  /**
   * Handle trip tap - navigate to detail
   */
  const handleTripPress = useCallback((tripId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trip/${tripId}`);
  }, [router]);

  const handleGoAgain = useCallback((trip: Trip) => {
    const target = tripReplayTarget(trip, savedRoutes);
    if (!target) {
      Alert.alert('Go again', 'This trip has no destination to navigate back to.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(tabs)/recorder',
      params: {
        fromPlannedTrip: 'true',
        replay: `${trip.id}-${Date.now()}`,
        destinationLat: String(target.latitude),
        destinationLng: String(target.longitude),
        destinationName: target.name,
      },
    });
  }, [router, savedRoutes]);

  /**
   * Handle delete single trip
   */
  const handleDeleteTrip = useCallback((tripId: string, tripLabel: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      'Delete Trip',
      `Delete "${tripLabel}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteTrip(tripId);
            if (success) {
              await loadTrips();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }, [loadTrips]);

  /**
   * Handle clear all trips
   */
  const handleClearAll = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      'Delete All Trips',
      'Delete all recorded trips? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllTrips();
            await loadTrips();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [loadTrips]);

  /**
   * Format trip duration
   */
  const formatDuration = useCallback((startTs: number | null, endTs: number | null, pausedAccum?: number) => {
    if (!startTs || !endTs) return '—';
    const totalMs = endTs - startTs - (pausedAccum || 0);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  /**
   * Render empty state
   */
  if (!loading && trips.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Travel Log</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Trips Yet</Text>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            Start navigating in the GPS tab to record trips here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Travel Log</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Travel Log</Text>
        <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
          <Text style={[styles.clearButtonText, { color: tint }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.secondaryBackground, borderBottomColor: theme.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{trips.length}</Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Trips</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {(trips.reduce((sum, t) => sum + (t.meters || 0), 0) / 1609.34).toFixed(0)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Total Miles</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {trips.filter(t => t.startTs && t.startTs > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.secondaryText }]}>This Week</Text>
        </View>
      </View>

      {/* Search and Sort */}
      <View style={styles.controlsContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.secondaryBackground, color: theme.text }]}
          placeholder="Search trips..."
          placeholderTextColor={theme.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              { backgroundColor: theme.inactive },
              sortBy === 'date' && { backgroundColor: selectedBgColor }
            ]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[
              styles.sortButtonText,
              { color: theme.secondaryText },
              sortBy === 'date' && { color: '#fff', fontWeight: '700' }
            ]}>
              Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              { backgroundColor: theme.inactive },
              sortBy === 'distance' && { backgroundColor: selectedBgColor }
            ]}
            onPress={() => setSortBy('distance')}
          >
            <Text style={[
              styles.sortButtonText,
              { color: theme.secondaryText },
              sortBy === 'distance' && { color: '#fff', fontWeight: '700' }
            ]}>
              Distance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trip List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tint} />
        }
      >
        {filteredTrips.length === 0 && searchQuery ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Results</Text>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No trips match your search</Text>
          </View>
        ) : (
          filteredTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={[styles.tripCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => handleTripPress(trip.id)}
              activeOpacity={0.7}
            >
              <View style={styles.tripHeader}>
                <Text style={[styles.tripDate, { color: theme.text }]} numberOfLines={1}>
                  {recordedTripTitle(trip, savedRoutes)}
                </Text>
                <Text style={[styles.tripTime, { color: theme.secondaryText }]}>
                  {trip.startTs ? new Date(trip.startTs).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }) : '—'}
                </Text>
              </View>

              <View style={[styles.tripStats, { borderTopColor: theme.divider, borderBottomColor: theme.divider }]}>
                <View style={styles.tripStat}>
                  <Text style={styles.tripStatIcon}>📏</Text>
                  <View>
                    <Text style={[styles.tripStatValue, { color: theme.text }]}>
                      {((trip.meters || 0) / 1609.34).toFixed(1)} mi
                    </Text>
                    <Text style={[styles.tripStatLabel, { color: theme.secondaryText }]}>Distance</Text>
                  </View>
                </View>

                <View style={styles.tripStat}>
                  <Text style={styles.tripStatIcon}>⏱️</Text>
                  <View>
                    <Text style={[styles.tripStatValue, { color: theme.text }]}>
                      {formatDuration(trip.startTs, trip.endTs, trip.pausedAccum)}
                    </Text>
                    <Text style={[styles.tripStatLabel, { color: theme.secondaryText }]}>Duration</Text>
                  </View>
                </View>

                <View style={styles.tripStat}>
                  <Text style={styles.tripStatIcon}>📍</Text>
                  <View>
                    <Text style={[styles.tripStatValue, { color: theme.text }]}>{trip.path?.length || 0}</Text>
                    <Text style={[styles.tripStatLabel, { color: theme.secondaryText }]}>Points</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tripFooter}>
                <TouchableOpacity
                  onPress={() => handleDeleteTrip(trip.id, recordedTripTitle(trip, savedRoutes))}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
                <View style={styles.tripFooterActions}>
                  <TouchableOpacity
                    onPress={() => handleGoAgain(trip)}
                    style={styles.goAgainButton}
                  >
                    <Text style={[styles.goAgainText, { color: tint }]}>Go again</Text>
                  </TouchableOpacity>
                  <Text style={[styles.viewDetailsText, { color: tint }]}>
                    Details →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
});

TravelLog.displayName = 'TravelLog';

export default TravelLog;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  controlsContainer: {
    padding: 16,
    gap: 12,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  tripTime: {
    fontSize: 14,
    color: '#888',
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 12,
  },
  tripStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripStatIcon: {
    fontSize: 20,
  },
  tripStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  tripStatLabel: {
    fontSize: 11,
    color: '#888',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  goAgainButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  goAgainText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
});

