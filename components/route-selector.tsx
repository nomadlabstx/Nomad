/**
 * Route Selector Component
 * Allows user to choose between multiple route options
 */

import * as Haptics from 'expo-haptics';
import { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { navigationService, Route } from '../services/navigation';
import { describeRouteChoices } from '../utils/route-choices';

const NAV_ACCENT = '#007AFF';

interface RouteSelectorProps {
  routes: Route[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onStartNavigation: () => void;
  unit?: 'miles' | 'km';
}

const RouteSelector = memo<RouteSelectorProps>(({
  routes,
  selectedRouteId,
  onSelectRoute,
  onStartNavigation,
  unit = 'miles',
}) => {
  const handleSelectRoute = useCallback((routeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectRoute(routeId);
  }, [onSelectRoute]);

  const handleStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStartNavigation();
  }, [onStartNavigation]);

  if (routes.length === 0) {
    return null;
  }

  const choices = describeRouteChoices(routes);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Route</Text>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          const distance = navigationService.formatDistance(route.totalDistance, unit);
          const effectiveDuration = route.totalDurationInTraffic || route.totalDuration;
          const duration = navigationService.formatDuration(effectiveDuration);
          const choice = choices.find((c) => c.id === route.id);

          return (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.routeCard,
                isSelected && { ...styles.routeCardSelected, borderColor: NAV_ACCENT }
              ]}
              onPress={() => handleSelectRoute(route.id)}
              activeOpacity={0.7}
            >
              <View style={styles.routeHeader}>
                <View style={styles.routeTitleBlock}>
                  <Text style={[styles.routeLabel, isSelected && styles.routeLabelSelected]}>
                    {choice?.title ?? 'Route'}
                  </Text>
                  {choice?.reason ? (
                    <Text style={styles.routeReason}>{choice.reason}</Text>
                  ) : null}
                </View>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </View>

              <View style={styles.routeInfo}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoValue}>{duration}</Text>
                  <Text style={styles.infoLabel}>Time</Text>
                  {route.hasTrafficDelays && route.trafficDelay ? (
                    <Text style={styles.trafficDelay}>
                      +{navigationService.formatDuration(route.trafficDelay)} traffic
                    </Text>
                  ) : null}
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoValue}>{distance}</Text>
                  <Text style={styles.infoLabel}>Distance</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.startButton}
        onPress={handleStart}
        disabled={!selectedRouteId}
      >
        <Text style={styles.startButtonText}>Start Navigation</Text>
      </TouchableOpacity>
    </View>
  );
});

RouteSelector.displayName = 'RouteSelector';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 40,
    maxHeight: '50%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  routeCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  routeCardSelected: {
    borderWidth: 3,
    backgroundColor: '#f8f8f8',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  routeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  routeLabelSelected: {
    fontWeight: 'bold',
    color: '#000',
  },
  routeReason: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NAV_ACCENT,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  trafficDelay: {
    fontSize: 11,
    color: '#ff9500',
    marginTop: 2,
    fontWeight: '600',
  },
  startButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: NAV_ACCENT,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RouteSelector;

