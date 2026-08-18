/**
 * Analytics Dashboard Component
 * Displays detailed travel statistics and insights
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsService, type TravelStatistics } from '../services/analytics';
import { useThemeColors } from '../hooks/use-theme-colors';

interface AnalyticsDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export function AnalyticsDashboard({ visible, onClose }: AnalyticsDashboardProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<TravelStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<'miles' | 'km'>('miles');

  useEffect(() => {
    if (visible) {
      loadStatistics();
    }
  }, [visible]);

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const statistics = await analyticsService.calculateStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('[Analytics] Failed to calculate statistics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const formatDistance = useCallback((meters: number): string => {
    if (unit === 'miles') {
      return `${(meters / 1609.34).toFixed(1)} mi`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }, [unit]);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  const formatSpeed = useCallback((mps: number): string => {
    if (unit === 'miles') {
      const mph = mps * 2.23694;
      return `${mph.toFixed(1)} mph`;
    }
    const kmh = mps * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  }, [unit]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { 
        borderBottomColor: theme.border, 
        paddingTop: Math.max(insets.top + 8, 16), 
        paddingBottom: 12 
      }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>📊 Travel Analytics</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setUnit(unit === 'miles' ? 'km' : 'miles')}
            style={styles.unitButton}
          >
            <Text style={[styles.unitButtonText, { color: theme.tint }]}>{unit === 'miles' ? 'mi' : 'km'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Calculating statistics...
          </Text>
        </View>
      ) : stats ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Overall Stats */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📈 Overall Statistics</Text>
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{stats.totalTrips}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Total Trips</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{formatDistance(stats.totalDistance)}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Total Distance</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{formatDuration(stats.totalTime)}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Total Time</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{formatSpeed(stats.averageSpeed)}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Avg Speed</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{formatDistance(stats.averageTripDistance)}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Avg Trip Distance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{formatDuration(stats.averageTripDuration)}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Avg Trip Duration</Text>
              </View>
            </View>
          </View>

          {/* Explorer Stats */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🗺️ Locations Visited</Text>
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{stats.explorerStats.statesVisited}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>States</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{stats.explorerStats.countiesVisited}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Counties</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{stats.explorerStats.citiesVisited}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Cities</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.tint }]}>{stats.explorerStats.highwaysTraveled}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Highways</Text>
              </View>
            </View>
          </View>

          {/* Trip Patterns */}
          {stats.longestTrip && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Trip Records</Text>
              
              <View style={styles.recordItem}>
                <Text style={[styles.recordLabel, { color: theme.secondaryText }]}>Longest Trip:</Text>
                <Text style={[styles.recordValue, { color: theme.text }]}>
                  {formatDistance(stats.longestTrip.meters || 0)}
                </Text>
              </View>

              {stats.shortestTrip && (
                <View style={styles.recordItem}>
                  <Text style={[styles.recordLabel, { color: theme.secondaryText }]}>Shortest Trip:</Text>
                  <Text style={[styles.recordValue, { color: theme.text }]}>
                    {formatDistance(stats.shortestTrip.meters || 0)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Time Analysis */}
          {(stats.busiestDay || stats.busiestHour !== null || stats.busiestMonth) && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>⏰ Time Patterns</Text>
              
              {stats.busiestDay && (
                <View style={styles.recordItem}>
                  <Text style={[styles.recordLabel, { color: theme.secondaryText }]}>Busiest Day:</Text>
                  <Text style={[styles.recordValue, { color: theme.text }]}>{stats.busiestDay}</Text>
                </View>
              )}

              {stats.busiestHour !== null && (
                <View style={styles.recordItem}>
                  <Text style={[styles.recordLabel, { color: theme.secondaryText }]}>Busiest Hour:</Text>
                  <Text style={[styles.recordValue, { color: theme.text }]}>
                    {(() => {
                      const hour = stats.busiestHour!;
                      if (hour === 0) return '12:00 AM';
                      if (hour < 12) return `${hour}:00 AM`;
                      if (hour === 12) return '12:00 PM';
                      return `${hour - 12}:00 PM`;
                    })()}
                  </Text>
                </View>
              )}

              {stats.busiestMonth && (
                <View style={styles.recordItem}>
                  <Text style={[styles.recordLabel, { color: theme.secondaryText }]}>Busiest Month:</Text>
                  <Text style={[styles.recordValue, { color: theme.text }]}>{stats.busiestMonth}</Text>
                </View>
              )}
            </View>
          )}

          {/* Most Visited Locations */}
          {stats.mostVisitedStates.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>📍 Most Visited States</Text>
              {stats.mostVisitedStates.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.locationItem}>
                  <Text style={[styles.locationRank, { color: theme.tint }]}>#{index + 1}</Text>
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationName, { color: theme.text }]}>{item.state}</Text>
                    <Text style={[styles.locationDetails, { color: theme.secondaryText }]}>
                      {item.visitCount} trips • {formatDistance(item.distance)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Most Visited Cities */}
          {stats.mostVisitedCities.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🏙️ Most Visited Cities</Text>
              {stats.mostVisitedCities.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.locationItem}>
                  <Text style={[styles.locationRank, { color: theme.tint }]}>#{index + 1}</Text>
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationName, { color: theme.text }]}>
                      {item.city}, {item.state}
                    </Text>
                    <Text style={[styles.locationDetails, { color: theme.secondaryText }]}>
                      {item.visitCount} trips • {formatDistance(item.distance)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            No trip data available
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recordLabel: {
    fontSize: 14,
  },
  recordValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  locationRank: {
    fontSize: 16,
    fontWeight: '700',
    width: 30,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationDetails: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

