/**
 * AI Trip Planner with GPS Integration
 * Allows users to describe a trip to the AI, which then automatically
 * plugs waypoints and destinations into the GPS navigation system
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { geminiService } from '../services/gemini-ai';
import { navigationService } from '../services/navigation';
import type { Coordinates, RouteOptions } from '../services/navigation';
import { plannedTripsService } from '../services/planned-trips';
import { reverseGeocodingService } from '../services/reverse-geocoding';
import type { PlannedTrip } from '../types/planned-trips';
import { getTrips } from '../utils/storage';
import { parsePlanTextToStops } from '../utils/parse-trip-plan';

export interface TripPlanStop {
  name: string;
  location: Coordinates;
  duration?: string; // e.g., "30 minutes", "2 hours"
  notes?: string; // What to do there
}

export interface ParsedTripPlan {
  stops: TripPlanStop[];
  finalDestination: TripPlanStop;
  routeOptions: RouteOptions;
  summary: string;
}

interface AITripPlannerProps {
  visible: boolean;
  onClose: () => void;
  currentLocation: Coordinates | null;
  currentCity?: string;
  currentState?: string;
  onPlanGenerated: (plan: ParsedTripPlan) => void;
  onTripSaved?: (trip: PlannedTrip) => void;
  tintColor?: string;
}

export function AITripPlanner({
  visible,
  onClose,
  currentLocation,
  currentCity,
  currentState,
  onPlanGenerated,
  onTripSaved,
  tintColor = '#007AFF',
}: AITripPlannerProps) {
  const [tripRequest, setTripRequest] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string>('');
  const [parsedPlan, setParsedPlan] = useState<ParsedTripPlan | null>(null);
  const [isParsingLocations, setIsParsingLocations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedTitle, setSuggestedTitle] = useState<string>('');

  /**
   * Reset state when modal closes
   */
  useEffect(() => {
    if (!visible) {
      setTripRequest('');
      setGeneratedPlan('');
      setParsedPlan(null);
      setError(null);
      setSuggestedTitle('');
    }
  }, [visible]);

  /**
   * Parse AI response to extract locations and create GPS waypoints
   */
  const parseLocationsFromPlan = useCallback(async (planText: string): Promise<ParsedTripPlan | null> => {
    try {
      setIsParsingLocations(true);
      const plan = await parsePlanTextToStops(planText, currentCity, currentState);
      setParsedPlan(plan);
      const destinationName = plan.finalDestination.name || 'Trip';
      const now = new Date();
      const formatted = `${now.getMonth() + 1}/${now.getDate()}`;
      const defaultTitle = `${/weekend/i.test(planText) ? 'Weekend Trip to' : 'Trip to'} ${destinationName}, ${formatted}`;
      setSuggestedTitle(defaultTitle);
      return plan;
    } catch (err) {
      console.error('[AITripPlanner] Error parsing locations:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse locations from plan');
      return null;
    } finally {
      setIsParsingLocations(false);
    }
  }, [currentCity, currentState]);

  /**
   * Generate trip plan with AI
   */
  const handleGeneratePlan = useCallback(async () => {
    if (!tripRequest.trim()) {
      setError('Please describe your trip');
      return;
    }

    if (!currentLocation) {
      setError('Current location not available');
      return;
    }

    // If city/state are unknown, use reverse geocoding to get them
    let city = currentCity;
    let state = currentState;
    if ((!city || city === 'Unknown') && currentLocation) {
      try {
        const locationInfo = await reverseGeocodingService.getLocationInfo(currentLocation);
        city = locationInfo.city || 'Unknown';
        state = locationInfo.stateCode || 'Unknown';
      } catch (error) {
        console.warn('[AITripPlanner] Failed to reverse geocode location:', error);
      }
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPlan('');

    try {
      // Get user preferences for AI personalization
      const { userPreferencesService } = await import('../services/user-preferences');
      const userPrefs = await userPreferencesService.getPreferences();
      
      // Extract interests and preferences for AI
      const interests = [
        ...userPrefs.activities.interests,
        ...userPrefs.food.cuisines,
        ...userPrefs.travel.preferredStops,
      ].filter(Boolean);

      // Get past destinations from trip history
      let pastDestinations: string[] = [];
      try {
        const trips = await getTrips();
        // Get unique destinations from trip endpoints (last point in path)
        const destinationSet = new Set<string>();
        for (const trip of trips) {
          if (trip.path && trip.path.length > 0) {
            const lastPoint = trip.path[trip.path.length - 1];
            try {
              const locationInfo = await reverseGeocodingService.getLocationInfo({
                latitude: lastPoint.latitude,
                longitude: lastPoint.longitude,
              });
              const destination = `${locationInfo.city}, ${locationInfo.stateCode}`;
              if (destination !== 'Unknown, ' && !destinationSet.has(destination)) {
                destinationSet.add(destination);
                pastDestinations.push(destination);
              }
            } catch (err) {
              // Skip if geocoding fails for this trip
              console.warn('[AITripPlanner] Failed to geocode trip destination:', err);
            }
          }
        }
        // Limit to most recent 10 destinations to avoid overwhelming the AI
        if (pastDestinations.length > 10) {
          pastDestinations = pastDestinations.slice(-10);
        }
      } catch (err) {
        console.warn('[AITripPlanner] Failed to load past destinations:', err);
      }

      // Check if user provided a specific destination or wants AI to suggest
      const hasSpecificDestination = tripRequest.toLowerCase().includes(' to ') || 
                                   tripRequest.toLowerCase().includes(' in ') ||
                                   tripRequest.toLowerCase().includes(' near ') ||
                                   /(austin|houston|dallas|san antonio|fort worth|el paso|arlington|corpus christi|plano|lubbock)/i.test(tripRequest);

      const plan = await geminiService.generateTripPlan({
        currentLocation: {
          city: city || 'Unknown',
          state: state || 'Unknown',
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        destination: {
          city: hasSpecificDestination ? tripRequest : 'Unknown', // Let AI suggest if no specific destination
        },
        constraints: {
          interests: interests,
          budget: userPrefs.food.priceRange === 'budget' ? 'low' : 
                  userPrefs.food.priceRange === 'moderate' ? 'medium' : 
                  userPrefs.food.priceRange === 'upscale' ? 'high' : 'medium',
          travelStyle: userPrefs.activities.adventureLevel === 'relaxed' ? 'scenic' :
                      userPrefs.activities.adventureLevel === 'adventurous' ? 'fast' : 'scenic',
        },
        tripHistory: {
          favoriteTypes: userPrefs.activities.interests,
          pastDestinations: pastDestinations,
        },
      });

      setGeneratedPlan(plan);
      
      // Automatically parse locations from the plan
      await parseLocationsFromPlan(plan);

    } catch (err) {
      console.error('[AITripPlanner] Error generating plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate trip plan');
    } finally {
      setIsGenerating(false);
    }
  }, [tripRequest, currentLocation, currentCity, currentState, parseLocationsFromPlan]);

  /**
   * Send plan to GPS navigation
   */
  const handleSendToGPS = useCallback(() => {
    if (!parsedPlan || !currentLocation) return;

    onPlanGenerated(parsedPlan);
    onClose();
  }, [parsedPlan, currentLocation, onPlanGenerated, onClose]);

  /**
   * Save trip for later
   */
  const handleSaveTrip = useCallback(async () => {
    if (!parsedPlan || !currentLocation) return;

    try {
      // Use suggested/customized title, fall back to request snippet
      const fallback = tripRequest.length > 50 ? tripRequest.substring(0, 47) + '...' : (tripRequest || 'My Trip Plan');
      const title = suggestedTitle?.trim() || fallback;

      // Calculate route to get actual distance and duration
      let estimatedDistance = 0;
      let estimatedDuration = 'TBD';
      
      try {
        const waypoints = parsedPlan.stops.map(stop => stop.location);
        const routes = await navigationService.calculateRoute(
          currentLocation,
          parsedPlan.finalDestination.location,
          {
            ...parsedPlan.routeOptions,
            waypoints: waypoints.length > 0 ? waypoints : undefined,
          }
        );
        
        if (routes && routes.length > 0) {
          const route = routes[0]; // Use first route
          estimatedDistance = route.totalDistance || 0; // in meters
          
          // Convert duration to human-readable format
          const totalSeconds = route.totalDuration || 0;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          
          if (hours > 0) {
            estimatedDuration = `${hours}h ${minutes}m`;
          } else {
            estimatedDuration = `${minutes}m`;
          }
        }
      } catch (routeError) {
        console.warn('[AITripPlanner] Failed to calculate route for saved trip:', routeError);
        // Continue with default values if route calculation fails
      }

      const savedTrip = await plannedTripsService.addTrip({
        title,
        origin: {
          name: currentCity ? `${currentCity}, ${currentState}` : 'Current Location',
          location: currentLocation,
        },
        destination: {
          name: parsedPlan.finalDestination.name,
          location: parsedPlan.finalDestination.location,
        },
        stops: parsedPlan.stops,
        aiSummary: generatedPlan,
        estimatedDuration,
        estimatedDistance,
        routeOptions: parsedPlan.routeOptions,
      });

      // Notify parent if callback provided (optional)
      onTripSaved?.(savedTrip);

      Alert.alert(
        '✅ Trip Saved!',
        'Your trip plan has been saved to Planned Trips.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('[AITripPlanner] Error saving trip:', error);
      Alert.alert('Error', 'Failed to save trip. Please try again.');
    }
  }, [parsedPlan, currentLocation, tripRequest, currentCity, currentState, generatedPlan, suggestedTitle, onTripSaved, onClose]);

  /**
   * Save and immediately navigate
   */
  const handleSaveAndNavigate = useCallback(async () => {
    await handleSaveTrip();
    handleSendToGPS();
  }, [handleSaveTrip, handleSendToGPS]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>🧠 Plan Trip with AI</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Describe Your Trip</Text>
              <Text style={styles.instructions}>
                Ask for ideas or give a specific destination. Pathfinder can suggest places based on your location and preferences, then map a route.
              </Text>
              <Text style={styles.examples}>
                Examples:{'\n'}
                • &quot;Day trip to Austin, stop at Franklin BBQ and Zilker Park&quot;{'\n'}
                • &quot;Road trip to Dallas, visit AT&T Stadium and Six Flags&quot;{'\n'}
                • &quot;Weekend in Houston, explore NASA and visit the Museum District&quot;{'\n'}
                • &quot;Give me 3 scenic weekend ideas within 4 hours of my current location&quot;
              </Text>
            </View>

            {/* Trip Request Input */}
            <View style={styles.section}>
              <TextInput
                style={styles.input}
                placeholder="Describe your trip... (e.g., 'Plan a weekend trip to Austin' or just 'Plan a weekend trip' and I'll suggest destinations based on your preferences)"
                placeholderTextColor="#999"
                value={tripRequest}
                onChangeText={setTripRequest}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: tintColor }]}
                onPress={handleGeneratePlan}
                disabled={isGenerating || !tripRequest.trim()}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                    <Text style={styles.generateButtonText}>Generate Trip Plan</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Suggested Title */}
            {parsedPlan && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🧾 Trip Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Weekend Trip to Austin, 10/26"
                  placeholderTextColor="#999"
                  value={suggestedTitle}
                  onChangeText={setSuggestedTitle}
                />
              </View>
            )}

            {/* Generated Plan */}
            {generatedPlan && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🗺️ Trip Plan</Text>
                <View style={styles.planContainer}>
                  <Text style={styles.planText}>{generatedPlan}</Text>
                </View>
              </View>
            )}

            {/* Parsing Status */}
            {isParsingLocations && (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color={tintColor} />
                <Text style={styles.statusText}>Finding locations on map...</Text>
              </View>
            )}

            {/* Parsed Stops */}
            {parsedPlan && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📍 Detected Stops ({parsedPlan.stops.length + 1})</Text>
                
                {parsedPlan.stops.map((stop, index) => (
                  <View key={index} style={styles.stopItem}>
                    <View style={[styles.stopNumber, { backgroundColor: tintColor }]}>
                      <Text style={styles.stopNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stopDetails}>
                      <Text style={styles.stopName}>{stop.name}</Text>
                      {stop.notes && <Text style={styles.stopNotes}>{stop.notes}</Text>}
                    </View>
                    <Ionicons name="location" size={20} color={tintColor} />
                  </View>
                ))}

                <View style={styles.stopItem}>
                  <View style={[styles.stopNumber, styles.finalStop, { backgroundColor: '#10b981' }]}>
                    <Ionicons name="flag" size={16} color="#fff" />
                  </View>
                  <View style={styles.stopDetails}>
                    <Text style={[styles.stopName, { color: '#10b981' }]}>{parsedPlan.finalDestination.name}</Text>
                    {parsedPlan.finalDestination.notes && (
                      <Text style={styles.stopNotes}>{parsedPlan.finalDestination.notes}</Text>
                    )}
                  </View>
                  <Ionicons name="flag" size={20} color="#10b981" />
                </View>

                {/* Route Options */}
                {(parsedPlan.routeOptions.avoidTolls || 
                  parsedPlan.routeOptions.avoidHighways || 
                  parsedPlan.routeOptions.optimizeWaypoints) && (
                  <View style={styles.optionsContainer}>
                    <Text style={styles.optionsTitle}>Route Options:</Text>
                    {parsedPlan.routeOptions.avoidTolls && (
                      <Text style={styles.optionText}>• Avoid tolls</Text>
                    )}
                    {parsedPlan.routeOptions.avoidHighways && (
                      <Text style={styles.optionText}>• Avoid highways</Text>
                    )}
                    {parsedPlan.routeOptions.optimizeWaypoints && (
                      <Text style={styles.optionText}>• Optimize route</Text>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.saveButton, { borderColor: tintColor }]}
                    onPress={handleSaveTrip}
                  >
                    <Ionicons name="bookmark-outline" size={22} color={tintColor} />
                    <Text style={[styles.saveButtonText, { color: tintColor }]}>Save for Later</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.gpsButton, { backgroundColor: '#10b981' }]}
                    onPress={handleSendToGPS}
                  >
                    <Ionicons name="navigate" size={24} color="#fff" />
                    <Text style={styles.gpsButtonText}>Navigate Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.gpsButton, { backgroundColor: tintColor }]}
                    onPress={handleSaveAndNavigate}
                  >
                    <Ionicons name="save" size={22} color="#fff" />
                    <Text style={styles.gpsButtonText}>Save & Navigate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111',
  },
  instructions: {
    fontSize: 15,
    color: '#888',
    lineHeight: 22,
    marginBottom: 12,
  },
  examples: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  planContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  planText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  statusText: {
    fontSize: 15,
    color: '#888',
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalStop: {
    width: 32,
    height: 32,
  },
  stopNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  stopNotes: {
    fontSize: 13,
    color: '#888',
  },
  optionsContainer: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 6,
  },
  optionText: {
    fontSize: 14,
    color: '#0369a1',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    backgroundColor: '#fff',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  gpsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

