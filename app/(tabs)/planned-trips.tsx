/**
 * Planned Trips Tab
 * Shows saved AI trip plans in itinerary format
 */

import { useAppTint } from '@/components/color-context';
import { plannedTripsService } from '@/services/planned-trips';
import type { PlannedTrip } from '@/types/planned-trips';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MultiStopPlanner } from '../../components/multi-stop-planner';
import { useNavigation } from '../../hooks/use-navigation';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useRouter } from 'expo-router';

export default function PlannedTripsTab() {
  const [trips, setTrips] = useState<PlannedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showManualPlanner, setShowManualPlanner] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<PlannedTrip | null>(null);
  const [tripTitle, setTripTitle] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const { tint } = useAppTint();
  const theme = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();

  /**
   * Load trips from storage
   */
  const loadTrips = useCallback(async () => {
    try {
      const allTrips = await plannedTripsService.getAllTrips();
      setTrips(allTrips);
    } catch (error) {
      console.error('[PlannedTrips] Error loading trips:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrips();
  }, [loadTrips]);

  /**
   * Delete a trip
   */
  const handleDeleteTrip = useCallback((tripId: string) => {
    Alert.alert(
      'Delete Trip?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await plannedTripsService.deleteTrip(tripId);
            loadTrips();
          },
        },
      ]
    );
  }, [loadTrips]);

  /**
   * Handle manual trip planning
   */
  const handleManualTripPlan = useCallback(async (waypoints: any[], options: any) => {
    if (!tripTitle.trim()) {
      Alert.alert('Trip Title Required', 'Please enter a title for your trip.');
      return;
    }

    try {
      const newTrip: PlannedTrip = {
        id: `manual-${Date.now()}`,
        title: tripTitle.trim(),
        origin: waypoints[0] || { name: 'Starting Point', location: { latitude: 0, longitude: 0 } },
        destination: waypoints[waypoints.length - 1] || { name: 'Destination', location: { latitude: 0, longitude: 0 } },
        stops: waypoints.slice(1, -1).map((stop, index) => ({
          name: stop.name || `Stop ${index + 1}`,
          location: stop.location,
          notes: '',
        })),
        aiSummary: tripNotes.trim() || 'Manual trip plan created by user.',
        createdAt: Date.now(),
        status: 'planned',
        estimatedDuration: 'TBD',
        estimatedDistance: 0,
        routeOptions: options,
      };

      await plannedTripsService.addTrip(newTrip);
      setShowManualPlanner(false);
      setTripTitle('');
      setTripNotes('');
      loadTrips();
      Alert.alert('✅ Trip Saved!', 'Your manual trip has been saved to Planned Trips.');
    } catch (error) {
      console.error('[PlannedTrips] Error saving manual trip:', error);
      Alert.alert('Error', 'Failed to save trip. Please try again.');
    }
  }, [tripTitle, tripNotes, loadTrips]);

  /**
   * Format date
   */
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (status: PlannedTrip['status']) => {
    switch (status) {
      case 'planned':
        return { text: 'Planned', color: '#0ea5e9', icon: 'calendar-outline' };
      case 'in-progress':
        return { text: 'In Progress', color: '#f59e0b', icon: 'navigate' };
      case 'completed':
        return { text: 'Completed', color: '#10b981', icon: 'checkmark-circle' };
    }
  };

  /**
   * Render a trip card
   */
  const renderTripCard = (trip: PlannedTrip) => {
    const statusBadge = getStatusBadge(trip.status);
    const stopCount = trip.stops.length;

    return (
      <View key={trip.id} style={[styles.tripCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        {/* Header */}
        <View style={styles.tripHeader}>
          <View style={styles.tripTitleContainer}>
            <Text style={[styles.tripTitle, { color: theme.text }]} numberOfLines={2}>
              {trip.title}
            </Text>
            <Text style={[styles.tripDate, { color: theme.secondaryText }]}>{formatDate(trip.createdAt)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteTrip(trip.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
          <Ionicons name={statusBadge.icon as any} size={16} color={statusBadge.color} />
          <Text style={[styles.statusText, { color: statusBadge.color }]}>
            {statusBadge.text}
          </Text>
        </View>

        {/* Route Summary */}
        <View style={styles.routeSummary}>
          <View style={styles.routePoint}>
            <Ionicons name="location" size={18} color={tint || '#007AFF'} />
            <Text style={[styles.routeText, { color: theme.text }]} numberOfLines={1}>{trip.origin.name}</Text>
          </View>
          
          {stopCount > 0 && (
            <View style={styles.stopsIndicator}>
              <Text style={[styles.stopsText, { color: theme.secondaryText }]}>{stopCount} stop{stopCount > 1 ? 's' : ''}</Text>
            </View>
          )}
          
          <View style={styles.routePoint}>
            <Ionicons name="flag" size={18} color="#10b981" />
            <Text style={styles.routeText} numberOfLines={1}>{trip.destination.name}</Text>
          </View>
        </View>

        {/* Stops Preview */}
        {trip.stops.length > 0 && (
          <View style={styles.stopsPreview}>
            <Text style={styles.stopsPreviewTitle}>Stops:</Text>
            {trip.stops.slice(0, 3).map((stop, index) => (
              <Text key={index} style={styles.stopPreviewText} numberOfLines={1}>
                {index + 1}. {stop.name}
              </Text>
            ))}
            {trip.stops.length > 3 && (
              <Text style={styles.moreStops}>+{trip.stops.length - 3} more...</Text>
            )}
          </View>
        )}

        {/* AI Summary Preview */}
        <Text style={styles.aiSummary} numberOfLines={3}>
          {trip.aiSummary}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.navigateButton, { backgroundColor: tint || '#007AFF' }]}
            onPress={async () => {
              try {
                // Calculate route with waypoints, using trip origin as starting point
                const waypoints = trip.stops.map(stop => stop.location);
                await navigation.calculateRoute(
                  trip.destination.location,
                  {
                    waypoints: waypoints.length > 0 ? waypoints : undefined,
                    ...trip.routeOptions,
                  },
                  trip.origin.location
                );
                
                // Navigate to recorder tab with destination info as params
                router.push({
                  pathname: '/(tabs)/recorder',
                  params: {
                    fromPlannedTrip: 'true',
                    destinationLat: trip.destination.location.latitude.toString(),
                    destinationLng: trip.destination.location.longitude.toString(),
                    destinationName: trip.destination.name,
                  },
                });
              } catch (error) {
                console.error('[PlannedTrips] Error starting navigation:', error);
                Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
              }
            }}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => {
              setSelectedTrip(trip);
              setShowTripDetails(true);
            }}
          >
            <Ionicons name="information-circle-outline" size={20} color={tint || '#007AFF'} />
            <Text style={[styles.detailsButtonText, { color: tint || '#007AFF' }]}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint || '#007AFF'} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading planned trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
               <View style={styles.header}>
                 <Text style={[styles.headerTitle, { color: theme.text }]}>📅 Planned Trips</Text>
                 <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
                   {trips.length} trip{trips.length !== 1 ? 's' : ''} saved
                 </Text>
                 
                 <TouchableOpacity
                   style={[styles.planNewButton, { backgroundColor: tint || '#007AFF' }]}
                   onPress={() => setShowManualPlanner(true)}
                 >
                   <Ionicons name="add" size={20} color="#fff" />
                   <Text style={styles.planNewButtonText}>Plan New Trip</Text>
                 </TouchableOpacity>
               </View>

        {/* Empty State */}
        {trips.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Planned Trips Yet</Text>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              Use the AI Trip Planner in the GPS tab to create and save trip plans!
            </Text>
          </View>
        )}

        {/* Trip Cards */}
               {trips.map(renderTripCard)}
             </ScrollView>

             {/* Manual Trip Planner Modal */}
             <Modal
               visible={showManualPlanner}
               animationType="slide"
               onRequestClose={() => setShowManualPlanner(false)}
             >
               <SafeAreaView style={styles.modalContainer}>
                 <View style={styles.modalHeader}>
                   <TouchableOpacity
                     onPress={() => setShowManualPlanner(false)}
                     style={styles.modalCloseButton}
                   >
                     <Ionicons name="close" size={24} color="#888" />
                   </TouchableOpacity>
                   <Text style={styles.modalTitle}>Plan New Trip</Text>
                   <View style={{ width: 24 }} />
                 </View>

                 <ScrollView style={styles.modalContent}>
                   <View style={styles.inputSection}>
                     <Text style={styles.inputLabel}>Trip Title</Text>
                     <TextInput
                       style={styles.textInput}
                       value={tripTitle}
                       onChangeText={setTripTitle}
                       placeholder="e.g., Weekend in Austin"
                       placeholderTextColor="#999"
                     />
                   </View>

                   <View style={styles.inputSection}>
                     <Text style={styles.inputLabel}>Notes (Optional)</Text>
                     <Text style={styles.inputDescription}>
                       Add any notes about your trip. Pathfinder can use these to help plan better routes and suggestions.
                     </Text>
                     <TextInput
                       style={[styles.textInput, styles.notesInput]}
                       value={tripNotes}
                       onChangeText={setTripNotes}
                       placeholder="e.g., Visiting family, need pet-friendly hotels, prefer scenic routes..."
                       placeholderTextColor="#999"
                       multiline
                       numberOfLines={3}
                     />
                   </View>

                   <MultiStopPlanner
                      visible={true}
                      onClose={() => setShowManualPlanner(false)}
                      currentLocation={null}
                      onPlanRoute={async (destination, options) => {
                        // Convert single destination to waypoints array for multi-stop planner
                        const waypoints = [destination];
                        await handleManualTripPlan(waypoints, options);
                      }}
                      tintColor={tint}
                   />
                 </ScrollView>
               </SafeAreaView>
             </Modal>

             {/* Trip Details Modal */}
             <Modal
               visible={showTripDetails}
               animationType="slide"
               onRequestClose={() => setShowTripDetails(false)}
             >
               <SafeAreaView style={styles.modalContainer}>
                 <View style={styles.modalHeader}>
                   <TouchableOpacity
                     onPress={() => setShowTripDetails(false)}
                     style={styles.modalCloseButton}
                   >
                     <Ionicons name="close" size={24} color="#888" />
                   </TouchableOpacity>
                   <Text style={styles.modalTitle}>
                     {selectedTrip?.title || 'Trip Details'}
                   </Text>
                   <View style={{ width: 24 }} />
                 </View>

                 <ScrollView style={styles.modalContent}>
                   {selectedTrip && (
                     <>
                       <View style={styles.detailSection}>
                         <Text style={styles.detailLabel}>Origin</Text>
                         <Text style={styles.detailValue}>{selectedTrip.origin.name}</Text>
                       </View>

                       {selectedTrip.stops.length > 0 && (
                         <View style={styles.detailSection}>
                           <Text style={styles.detailLabel}>Stops ({selectedTrip.stops.length})</Text>
                           {selectedTrip.stops.map((stop, index) => (
                             <View key={index} style={styles.stopItem}>
                               <Text style={styles.stopNumber}>{index + 1}.</Text>
                               <View style={styles.stopInfo}>
                                 <Text style={styles.stopName}>{stop.name}</Text>
                                 {stop.notes && (
                                   <Text style={styles.stopNotes}>{stop.notes}</Text>
                                 )}
                               </View>
                             </View>
                           ))}
                         </View>
                       )}

                       <View style={styles.detailSection}>
                         <Text style={styles.detailLabel}>Destination</Text>
                         <Text style={styles.detailValue}>{selectedTrip.destination.name}</Text>
                       </View>

                       <View style={styles.detailSection}>
                         <Text style={styles.detailLabel}>Summary</Text>
                         <Text style={styles.detailText}>{selectedTrip.aiSummary}</Text>
                       </View>

                       <View style={styles.detailSection}>
                         <Text style={styles.detailLabel}>Created</Text>
                         <Text style={styles.detailValue}>{formatDate(selectedTrip.createdAt)}</Text>
                       </View>

                       <View style={styles.detailSection}>
                         <Text style={styles.detailLabel}>Status</Text>
                         <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(selectedTrip.status).color + '20' }]}>
                           <Ionicons name={getStatusBadge(selectedTrip.status).icon as any} size={16} color={getStatusBadge(selectedTrip.status).color} />
                           <Text style={[styles.statusText, { color: getStatusBadge(selectedTrip.status).color }]}>
                             {getStatusBadge(selectedTrip.status).text}
                           </Text>
                         </View>
                       </View>
                     </>
                   )}
                 </ScrollView>
               </SafeAreaView>
             </Modal>
           </SafeAreaView>
         );
       }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#888',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  tripCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 13,
    color: '#888',
  },
  deleteButton: {
    padding: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  routeSummary: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  routeText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  stopsIndicator: {
    paddingLeft: 26,
    marginVertical: 4,
  },
  stopsText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  stopsPreview: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  stopsPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  stopPreviewText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  moreStops: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  aiSummary: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navigateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 6,
    backgroundColor: '#f0f0f0',
  },
  detailsButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  planNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  planNewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  detailText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  stopNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginRight: 12,
    minWidth: 24,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 2,
  },
  stopNotes: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
});

