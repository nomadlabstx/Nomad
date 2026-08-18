/**

 * Destination Parking Preview

 * Shows parking availability before starting navigation

 * Smart detection: Shows for venues/stadiums/downtown, hides for stores with lots

 */



import { Ionicons } from '@expo/vector-icons';

import { useCallback, useEffect, useState } from 'react';

import {

    ActivityIndicator,

    Platform,

    StyleSheet,

    Text,

    TouchableOpacity,

    View,

} from 'react-native';

import { googlePlaces, type PlaceResult } from '../services/google-places';

import type { Coordinates } from '../services/navigation';



interface DestinationParkingPreviewProps {

  destination: Coordinates;

  destinationName: string;

  onViewParking: () => void;

  tintColor?: string;

}



const HAS_OWN_PARKING = [

  'walmart', 'target', 'costco', 'sam\'s club', 'home depot', 'lowe\'s',

  'kroger', 'safeway', 'whole foods', 'trader joe\'s', 'aldi',

  'best buy', 'dick\'s sporting goods', 'petsmart', 'petco',

  'mall', 'shopping center', 'plaza', 'outlet',

  'heb', 'publix', 'wegmans', 'meijer',

  'mcdonald', 'burger king', 'wendy', 'taco bell', 'chick-fil',

  'subway', 'starbucks', 'dunkin', 'chipotle', 'panera',

  'pizza hut', 'domino', 'kfc', 'popeyes', 'arbys', 'sonic',

  'gas station', 'convenience store', 'cvs', 'walgreens',

];



const NEEDS_PARKING_HELP = [

  'stadium', 'arena', 'amphitheater', 'theater', 'cinema',

  'downtown', 'city center', 'historic district',

  'museum', 'gallery', 'concert hall', 'convention center',

  'bar', 'club', 'lounge',

  'office building', 'courthouse', 'city hall',

  'hospital', 'medical center',

];



function hasOwnParking(name: string): boolean {

  const lower = name.toLowerCase();

  return HAS_OWN_PARKING.some((place) => lower.includes(place));

}



function needsParkingHelp(name: string): boolean {

  const lower = name.toLowerCase();

  return NEEDS_PARKING_HELP.some((place) => lower.includes(place));

}



export function DestinationParkingPreview({

  destination,

  destinationName,

  onViewParking,

  tintColor = '#007AFF',

}: DestinationParkingPreviewProps) {

  const [loading, setLoading] = useState(false);

  const [parkingCount, setParkingCount] = useState(0);

  const [shouldShow, setShouldShow] = useState(false);

  const [closestParking, setClosestParking] = useState<PlaceResult | null>(null);



  const loadParkingPreview = useCallback(async (venueNeedsHelp: boolean) => {

    setLoading(true);

    try {

      const parking = await googlePlaces.findParkingNear(destination, 500);

      setParkingCount(parking.length);



      if (parking.length > 0) {

        setClosestParking(parking[0]);

      } else {

        setClosestParking(null);

      }



      setShouldShow(venueNeedsHelp || (parking.length > 0 && parking.length < 10));

    } catch (error) {

      console.error('Error loading parking preview:', error);

      setShouldShow(false);

    } finally {

      setLoading(false);

    }

  }, [destination]);



  const checkParkingSituation = useCallback(async () => {

    if (hasOwnParking(destinationName)) {

      setShouldShow(false);

      return;

    }



    await loadParkingPreview(needsParkingHelp(destinationName));

  }, [destinationName, loadParkingPreview]);



  useEffect(() => {

    checkParkingSituation();

  }, [checkParkingSituation]);



  if (!shouldShow && !loading) {

    return null;

  }



  if (loading) {

    return (

      <View style={styles.loadingContainer}>

        <ActivityIndicator size="small" color={tintColor} />

        <Text style={styles.loadingText}>Checking parking...</Text>

      </View>

    );

  }



  const getParkingStatus = () => {

    if (parkingCount === 0) {

      return {

        icon: 'alert-circle' as const,

        color: '#FF3B30',

        title: 'Limited Parking',

        subtitle: 'No parking found nearby',

      };

    }

    if (parkingCount < 5) {

      return {

        icon: 'warning' as const,

        color: '#FF9500',

        title: 'Limited Parking',

        subtitle: `Only ${parkingCount} option${parkingCount !== 1 ? 's' : ''} nearby`,

      };

    }

    return {

      icon: 'checkmark-circle' as const,

      color: '#34C759',

      title: 'Parking Available',

      subtitle: `${parkingCount} option${parkingCount !== 1 ? 's' : ''} nearby`,

    };

  };



  const status = getParkingStatus();



  return (

    <TouchableOpacity

      style={styles.container}

      onPress={onViewParking}

      activeOpacity={0.7}

    >

      <View style={[styles.iconContainer, { backgroundColor: `${status.color}20` }]}>

        <Ionicons name={status.icon} size={24} color={status.color} />

      </View>



      <View style={styles.info}>

        <Text style={styles.title}>{status.title}</Text>

        <Text style={styles.subtitle}>{status.subtitle}</Text>



        {closestParking && (

          <Text style={styles.closest} numberOfLines={1}>

            Nearest: {closestParking.name} • {

              closestParking.distance

                ? googlePlaces.formatDistance(closestParking.distance)

                : 'nearby'

            }

          </Text>

        )}

      </View>



      <View style={styles.arrowContainer}>

        <Text style={[styles.viewText, { color: tintColor }]}>View All</Text>

        <Ionicons name="chevron-forward" size={20} color={tintColor} />

      </View>

    </TouchableOpacity>

  );

}



const styles = StyleSheet.create({

  container: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#fff',

    borderRadius: 12,

    padding: 16,

    marginHorizontal: 16,

    marginTop: 12,

    ...Platform.select({

      ios: {

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.1,

        shadowRadius: 4,

      },

      android: {

        elevation: 3,

      },

    }),

  },

  loadingContainer: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#fff',

    borderRadius: 12,

    padding: 16,

    marginHorizontal: 16,

    marginTop: 12,

    ...Platform.select({

      ios: {

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.05,

        shadowRadius: 2,

      },

      android: {

        elevation: 1,

      },

    }),

  },

  loadingText: {

    marginLeft: 12,

    fontSize: 14,

    color: '#888',

  },

  iconContainer: {

    width: 48,

    height: 48,

    borderRadius: 24,

    justifyContent: 'center',

    alignItems: 'center',

    marginRight: 12,

  },

  info: {

    flex: 1,

  },

  title: {

    fontSize: 16,

    fontWeight: '600',

    color: '#000',

    marginBottom: 4,

  },

  subtitle: {

    fontSize: 14,

    color: '#888',

    marginBottom: 4,

  },

  closest: {

    fontSize: 12,

    color: '#999',

  },

  arrowContainer: {

    flexDirection: 'row',

    alignItems: 'center',

    marginLeft: 8,

  },

  viewText: {

    fontSize: 14,

    fontWeight: '600',

    marginRight: 4,

  },

});


