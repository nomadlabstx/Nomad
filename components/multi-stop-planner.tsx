/**
 * Multi-Stop Route Planner
 * Full-screen UI for planning routes with multiple waypoints
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Coordinates, RouteOptions } from '../services/navigation';
import DestinationSearch from './destination-search';
import { WaypointManager, type WaypointData } from './waypoint-manager';

interface MultiStopPlannerProps {
  visible: boolean;
  onClose: () => void;
  currentLocation: Coordinates | null;
  onPlanRoute: (
    destination: Coordinates,
    options: RouteOptions,
    destinationName?: string
  ) => Promise<void>;
  tintColor?: string;
}

export function MultiStopPlanner({
  visible,
  onClose,
  currentLocation,
  onPlanRoute,
  tintColor = '#007AFF',
}: MultiStopPlannerProps) {
  const [waypoints, setWaypoints] = useState<WaypointData[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [optimizeRoute, setOptimizeRoute] = useState(false);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  /**
   * Reset state when modal closes
   */
  useEffect(() => {
    if (!visible) {
      setWaypoints([]);
      setOptimizeRoute(false);
      setAvoidTolls(false);
      setAvoidHighways(false);
    }
  }, [visible]);

  const handleAddWaypoint = useCallback(() => {
    setShowSearch(true);
  }, []);

  /** Every pick is a stop. The last stop in the list is the route end. */
  const handleDestinationSelect = useCallback((coordinates: Coordinates, description: string) => {
    const newWaypoint: WaypointData = {
      id: Date.now().toString(),
      name: description,
      location: coordinates,
    };
    setWaypoints((prev) => [...prev, newWaypoint]);
    setShowSearch(false);
  }, []);

  const handlePlanRoute = useCallback(async () => {
    if (waypoints.length === 0 || !currentLocation) {
      return;
    }

    setIsCalculating(true);

    try {
      const destination = waypoints[waypoints.length - 1];
      const via = waypoints.slice(0, -1).map((wp) => wp.location);
      const options: RouteOptions = {
        waypoints: via,
        optimizeWaypoints: optimizeRoute,
        avoidTolls,
        avoidHighways,
      };

      await onPlanRoute(destination.location, options, destination.name);
      onClose();
    } catch (error) {
      console.error('Error planning route:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [
    waypoints,
    currentLocation,
    optimizeRoute,
    avoidTolls,
    avoidHighways,
    onPlanRoute,
    onClose,
  ]);

  const canPlanRoute = Boolean(currentLocation) && waypoints.length > 0;

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
          <Text style={styles.headerTitle}>Plan Multi-Stop Route</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Starting Point */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={tintColor} />
              <Text style={styles.sectionTitle}>Starting Point</Text>
            </View>
            <View style={styles.locationCard}>
              <Text style={styles.locationText}>
                {currentLocation ? 'Current Location' : 'Location unavailable'}
              </Text>
            </View>
          </View>

          {/* Stops — last added is the route end */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={20} color={tintColor} />
              <Text style={styles.sectionTitle}>Stops</Text>
            </View>
            <Text style={styles.sectionHint}>
              Add stops in the order you want them. The last one is where the route ends.
            </Text>
            {waypoints.length > 0 ? (
              <View style={styles.waypointsContainer}>
                <WaypointManager
                  waypoints={waypoints}
                  onWaypointsChange={setWaypoints}
                  onAddWaypoint={handleAddWaypoint}
                  tintColor={tintColor}
                />
              </View>
            ) : (
              <View style={styles.emptyWaypoints}>
                <Text style={styles.emptyText}>No stops yet</Text>
                <TouchableOpacity
                  style={[styles.addFirstButton, { borderColor: tintColor }]}
                  onPress={handleAddWaypoint}
                >
                  <Ionicons name="add-circle-outline" size={24} color={tintColor} />
                  <Text style={[styles.addFirstText, { color: tintColor }]}>
                    Add a Stop
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Route Options */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={20} color={tintColor} />
              <Text style={styles.sectionTitle}>Route Options</Text>
            </View>

            {/* Optimize Route */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => setOptimizeRoute(!optimizeRoute)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="analytics-outline"
                  size={20}
                  color={optimizeRoute ? tintColor : '#888'}
                />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Optimize Stop Order</Text>
                  <Text style={styles.optionDescription}>
                    Reorder stops for fastest route
                  </Text>
                </View>
              </View>
              <View style={[styles.toggle, optimizeRoute && { backgroundColor: tintColor }]}>
                {optimizeRoute && <View style={styles.toggleDot} />}
              </View>
            </TouchableOpacity>

            {/* Avoid Tolls */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => setAvoidTolls(!avoidTolls)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={avoidTolls ? tintColor : '#888'}
                />
                <Text style={styles.optionTitle}>Avoid Tolls</Text>
              </View>
              <View style={[styles.toggle, avoidTolls && { backgroundColor: tintColor }]}>
                {avoidTolls && <View style={styles.toggleDot} />}
              </View>
            </TouchableOpacity>

            {/* Avoid Highways */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => setAvoidHighways(!avoidHighways)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="car-outline"
                  size={20}
                  color={avoidHighways ? tintColor : '#888'}
                />
                <Text style={styles.optionTitle}>Avoid Highways</Text>
              </View>
              <View style={[styles.toggle, avoidHighways && { backgroundColor: tintColor }]}>
                {avoidHighways && <View style={styles.toggleDot} />}
              </View>
            </TouchableOpacity>
          </View>

          {canPlanRoute && (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {waypoints.length === 1
                  ? 'Direct route to your stop'
                  : `Route with ${waypoints.length - 1} stop${waypoints.length === 2 ? '' : 's'} along the way`}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Plan Route Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.planButton,
              { backgroundColor: canPlanRoute ? tintColor : '#ccc' },
            ]}
            onPress={handlePlanRoute}
            disabled={!canPlanRoute || isCalculating}
          >
            {isCalculating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={24} color="#fff" />
                <Text style={styles.planButtonText}>Plan Route</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Destination Search Modal */}
        {showSearch && (
          <Modal
            visible={showSearch}
            animationType="slide"
            onRequestClose={() => setShowSearch(false)}
          >
            <DestinationSearch
              onSelectDestination={handleDestinationSelect}
              onClose={() => setShowSearch(false)}
              currentLocation={currentLocation}
            />
          </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
    lineHeight: 18,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  locationText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  waypointsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyWaypoints: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
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
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 24,
  },
  addFirstText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  optionDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  summary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
  summaryText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
  },
  planButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

