import { useToast } from '@/components/toast';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaybeMapView, { Polyline as MaybePolyline } from '../../components/maybe-map';
import { Trip } from '../../types';
import { deleteTrip, getTrips } from '../../utils/storage';

const TripDetail = React.memo(() => {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();


  useEffect(() => {
    const loadTrip = async () => {
      try {
        setLoading(true);
        const trips = await getTrips();
        const foundTrip = trips.find((t) => t.id === id);
        setTrip(foundTrip || null);
      } catch (error) {
        console.warn('Failed to load trip:', error);
        setTrip(null);
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [id]);

  const toGPX = (t: Trip) => {
    if (!t.path || !Array.isArray(t.path) || t.path.length === 0) {
      throw new Error('Trip has no path data');
    }
    const header = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Nomad" xmlns="http://www.topografix.com/GPX/1/1">\n`;
    const footer = `\n</gpx>`;
    const trk = `  <trk>\n    <name>${t.name || `Trip ${t.id}`}</name>\n    <trkseg>\n${t.path
      .map((p) => {
        const time = p.timestamp ? new Date(p.timestamp).toISOString() : '';
        const ele = p.altitude != null ? `<ele>${p.altitude}</ele>` : '';
        return `      <trkpt lat="${p.latitude}" lon="${p.longitude}">` + ele + (time ? `<time>${time}</time>` : '') + `</trkpt>`;
      })
      .join('\n')}
    </trkseg>\n  </trk>`;
    return header + trk + footer;
  };

  const toKML = (t: Trip) => {
    if (!t.path || !Array.isArray(t.path) || t.path.length === 0) {
      throw new Error('Trip has no path data');
    }
    const header = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n`;
    const footer = `\n</Document>\n</kml>`;
    const coords = t.path.map((p) => `${p.longitude},${p.latitude},${p.altitude ?? 0}`).join(' ');
    const placemark = `<Placemark><name>${t.name || `Trip ${t.id}`}</name><LineString><coordinates>${coords}</coordinates></LineString></Placemark>`;
    return header + placemark + footer;
  };

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleDelete = useCallback(async () => {
    if (!trip) return;
    
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteTrip(trip.id);
            if (success) {
              toast.show('Trip deleted');
              router.back();
            } else {
              toast.show('Failed to delete trip');
            }
          },
        },
      ]
    );
  }, [trip, router, toast]);

  const handleExportGPX = useCallback(async () => {
    if (!trip) return;
    if (!trip.path || !Array.isArray(trip.path) || trip.path.length === 0) {
      toast.show('Trip has no path data to export');
      return;
    }
    try {
      let gpx = '';
      gpx = toGPX(trip);
      const fileName = `trip-${trip.id}.gpx`;
      const cacheDir = (FileSystem as any).cacheDirectory;
      
      if (cacheDir && typeof cacheDir === 'string') {
        const path = cacheDir + fileName;
        await FileSystem.writeAsStringAsync(path, gpx);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path);
          toast.show('GPX exported');
          return;
        }
      }
      
      await Clipboard.setStringAsync(gpx);
      toast.show('GPX copied to clipboard');
    } catch (error) {
      console.warn('GPX export failed:', error);
      try {
        const fallback = toGPX(trip);
        await Clipboard.setStringAsync(fallback);
        toast.show('GPX copied to clipboard (fallback)');
      } catch {
        toast.show('GPX export failed');
      }
    }
  }, [trip, toast]);

  const handleExportKML = useCallback(async () => {
    if (!trip) return;
    if (!trip.path || !Array.isArray(trip.path) || trip.path.length === 0) {
      toast.show('Trip has no path data to export');
      return;
    }
    try {
      let kml = '';
      kml = toKML(trip);
      const fileName = `trip-${trip.id}.kml`;
      const cacheDir = (FileSystem as any).cacheDirectory;
      
      if (cacheDir && typeof cacheDir === 'string') {
        const path = cacheDir + fileName;
        await FileSystem.writeAsStringAsync(path, kml);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path);
          toast.show('KML exported');
          return;
        }
      }
      
      await Clipboard.setStringAsync(kml);
      toast.show('KML copied to clipboard');
    } catch (error) {
      console.warn('KML export failed:', error);
      try {
        const fallback = toKML(trip);
        await Clipboard.setStringAsync(fallback);
        toast.show('KML copied to clipboard (fallback)');
      } catch {
        toast.show('KML export failed');
      }
    }
  }, [trip, toast]);

  /**
   * Generate trip summary text for sharing
   */
  const getTripSummary = useCallback((t: Trip): string => {
    const distanceKm = ((t.meters ?? 0) / 1000).toFixed(2);
    const distanceMiles = ((t.meters ?? 0) / 1609.34).toFixed(2);
    const startDate = t.startTs ? new Date(t.startTs).toLocaleDateString() : 'Unknown';
    const endDate = t.endTs ? new Date(t.endTs).toLocaleDateString() : 'Unknown';
    const duration = t.startTs && t.endTs 
      ? `${Math.round((t.endTs - t.startTs) / 1000 / 60)} minutes`
      : 'Unknown';
    
    return `${t.name || '🗺️ My Trip with Nomad'}

📏 Distance: ${distanceMiles} miles (${distanceKm} km)
📅 Date: ${startDate}${endDate !== startDate ? ` - ${endDate}` : ''}
⏱️ Duration: ${duration}
📍 Points recorded: ${t.path?.length || 0}

Tracked with Nomad - Your Travel Companion`;
  }, []);

  /**
   * Share trip summary as text
   */
  const handleShareSummary = useCallback(async () => {
    if (!trip) return;
    
    try {
      const summary = getTripSummary(trip);
      await Share.share({ message: summary });
      toast.show('Trip summary shared');
    } catch (error) {
      console.warn('Share summary failed:', error);
      const summary = getTripSummary(trip);
      await Clipboard.setStringAsync(summary);
      toast.show('Trip summary copied to clipboard');
    }
  }, [trip, getTripSummary, toast]);

  /**
   * Share trip to Twitter
   */
  const handleShareTwitter = useCallback(async () => {
    if (!trip) return;
    
    const summary = getTripSummary(trip);
    const tweetText = encodeURIComponent(summary);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    
    try {
      const canOpen = await Linking.canOpenURL(twitterUrl);
      if (canOpen) {
        await Linking.openURL(twitterUrl);
      } else {
        await Clipboard.setStringAsync(summary);
        toast.show('Twitter not available. Summary copied to clipboard');
      }
    } catch (error) {
      console.warn('Twitter share failed:', error);
      await Clipboard.setStringAsync(summary);
      toast.show('Summary copied to clipboard');
    }
  }, [trip, getTripSummary, toast]);

  /**
   * Share trip to Facebook
   */
  const handleShareFacebook = useCallback(async () => {
    if (!trip) return;
    
    const summary = getTripSummary(trip);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://nomad.app')}&quote=${encodeURIComponent(summary)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(facebookUrl);
      if (canOpen) {
        await Linking.openURL(facebookUrl);
      } else {
        await Clipboard.setStringAsync(summary);
        toast.show('Facebook not available. Summary copied to clipboard');
      }
    } catch (error) {
      console.warn('Facebook share failed:', error);
      await Clipboard.setStringAsync(summary);
      toast.show('Summary copied to clipboard');
    }
  }, [trip, getTripSummary, toast]);

  /**
   * Show share options menu
   */
  const handleShareTrip = useCallback(() => {
    if (!trip) return;
    
    Alert.alert(
      'Share Trip',
      'Choose how you want to share this trip',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share Summary', onPress: handleShareSummary },
        { text: 'Share as GPX File', onPress: handleExportGPX },
        { text: 'Share as KML File', onPress: handleExportKML },
        { text: 'Share to Twitter', onPress: handleShareTwitter },
        { text: 'Share to Facebook', onPress: handleShareFacebook },
      ],
      { cancelable: true }
    );
  }, [trip, handleShareSummary, handleExportGPX, handleExportKML, handleShareTwitter, handleShareFacebook]);

  if (loading) {
    return (
      <View style={styles.errorContainer}>
        <Text>Loading trip…</Text>
      </View>
    );
  }

  if (!trip) return (
    <View style={styles.errorContainer}>
      <Text>Trip not found.</Text>
      <TouchableOpacity style={styles.button} onPress={handleClose}>
        <Text style={styles.buttonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{trip.name || 'Trip Details'}</Text>
      <Text>Distance: {((trip.meters ?? 0) / 1000).toFixed(2)} km • {((trip.meters ?? 0) / 1609.34).toFixed(2)} miles</Text>
      <Text>Start: {trip.startTs ? new Date(trip.startTs).toLocaleString() : '—'}</Text>
      <Text>End: {trip.endTs ? new Date(trip.endTs).toLocaleDateString() : '—'}</Text>

          {trip.path && trip.path.length > 0 && (
        <View style={styles.mapContainer}>
          <MaybeMapView style={styles.map} initialRegion={{
            latitude: trip.path[0].latitude,
            longitude: trip.path[0].longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}>
            <MaybePolyline coordinates={trip.path.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude }))} strokeWidth={4} />
          </MaybeMapView>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#10b981' }]} onPress={handleShareTrip}>
          <Ionicons name="share-social" size={20} color="#fff" />
          <Text style={styles.buttonText}>Share Trip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleExportGPX}>
          <Ionicons name="download" size={18} color="#fff" />
          <Text style={styles.buttonText}>Export GPX</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleExportKML}>
          <Ionicons name="download" size={18} color="#fff" />
          <Text style={styles.buttonText}>Export KML</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtonContainer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash" size={18} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
});

TripDetail.displayName = 'TripDetail';

export default TripDetail;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapContainer: { height: 200, marginTop: 12 },
  map: { flex: 1 },
  buttonContainer: { marginTop: 12, flexDirection: 'row', gap: 8 },
  actionButtonContainer: { marginTop: 12, flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
