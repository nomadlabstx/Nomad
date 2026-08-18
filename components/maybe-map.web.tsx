import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Google Maps integration for web
let googleMapsLoaded = false;
let googleMapsPromise: Promise<any> | null = null;

const loadGoogleMaps = (): Promise<any> => {
  if (googleMapsLoaded) {
    return Promise.resolve((window as any).google);
  }
  
  if (googleMapsPromise) {
    return googleMapsPromise;
  }
  
  googleMapsPromise = new Promise((resolve, reject) => {
    if ((window as any).google) {
      googleMapsLoaded = true;
      resolve((window as any).google);
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded = true;
      resolve((window as any).google);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  
  return googleMapsPromise;
};

export function Marker({ coordinate, title }: { coordinate: { latitude: number; longitude: number }; title?: string }) {
  return (
    <View style={styles.marker}>
      <Text style={styles.markerText}>📍</Text>
      {title && <Text style={styles.markerTitle}>{title}</Text>}
    </View>
  );
}

export function Polyline({ coordinates, strokeWidth = 2 }: { coordinates: { latitude: number; longitude: number }[]; strokeWidth?: number }) {
  return (
    <View style={styles.polyline}>
      <Text style={styles.polylineText}>
        Route with {coordinates.length} points
      </Text>
    </View>
  );
}

export const PROVIDER_GOOGLE: null = null;

// Forward refs so code that does `ref={mapRef}` works the same on web and native.
const WebMapView = React.forwardRef<any, any>((props, ref) => {
  const style = Array.isArray(props.style) ? Object.assign({}, ...props.style) : props.style;
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const googleMapRef = React.useRef<any>(null);
  
  // Extract trip information from props
  const initialRegion = props.initialRegion;
  const children = props.children;
  
  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region: { latitude: number; longitude: number }) => {
      if (!googleMapRef.current || !region) return;
      googleMapRef.current.panTo({ lat: region.latitude, lng: region.longitude });
    },
  }));

  React.useEffect(() => {
    if (!initialRegion || googleMapRef.current) return;

    let cancelled = false;

    const initializeMap = async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || googleMapRef.current) return;

        // Wait until the map container is actually in the DOM.
        const waitForContainer = () =>
          new Promise<HTMLDivElement>((resolve, reject) => {
            const started = Date.now();
            const poll = () => {
              if (mapRef.current) {
                resolve(mapRef.current);
                return;
              }
              if (Date.now() - started > 4000) {
                reject(new Error('Map container was not mounted'));
                return;
              }
              requestAnimationFrame(poll);
            };
            poll();
          });

        const container = await waitForContainer();
        if (cancelled || googleMapRef.current) return;

        const map = new google.maps.Map(container, {
          center: { lat: initialRegion.latitude, lng: initialRegion.longitude },
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          gestureHandling: 'greedy',
          disableDefaultUI: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        googleMapRef.current = map;
        setMapLoaded(true);
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
        setMapError('Failed to load map');
      }
    };

    initializeMap();
    return () => {
      cancelled = true;
    };
  }, [initialRegion]);

  const googleMapsUrl = initialRegion
    ? `https://www.google.com/maps?q=${initialRegion.latitude},${initialRegion.longitude}`
    : null;

  const handleOpenInMaps = () => {
    if (googleMapsUrl) {
      window.open(googleMapsUrl, '_blank');
    }
  };

  if (mapError) {
    return (
      <View style={[{ backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, padding: 16 }, style]}>
        <Text style={{ color: '#dc2626', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Map Error</Text>
        <Text style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{mapError}</Text>
        {googleMapsUrl ? (
          <TouchableOpacity style={styles.mapButton} onPress={handleOpenInMaps}>
            <Text style={styles.mapButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', minHeight: 200, touchAction: 'none' }}
      />
      {!mapLoaded && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
          <Text style={{ color: '#2563eb', fontSize: 16, fontWeight: '600' }}>Loading map…</Text>
        </View>
      )}
      {children}
    </View>
  );
});

// Give the component a display name for clearer DevTools and to satisfy lint rules.
WebMapView.displayName = 'WebMapView';

const styles = StyleSheet.create({
  marker: {
    alignItems: 'center',
    marginBottom: 8,
  },
  markerText: {
    fontSize: 20,
  },
  markerTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  polyline: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 4,
  },
  polylineText: {
    fontSize: 12,
    color: '#2563eb',
    textAlign: 'center',
  },
  mapButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginVertical: 8,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WebMapView;
