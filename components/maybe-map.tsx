import * as React from 'react';
import { memo } from 'react';
import { Platform, Text, View } from 'react-native';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  // Use static import for native; bundlers will ignore it on web builds.
  // We still guard with Platform.OS so native-only code is not executed on web.
  // require at runtime on native only so Metro/Web bundler doesn't try to load native internals
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default || RNMaps;
  Marker = RNMaps.Marker;
  Polyline = RNMaps.Polyline;
  PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
  // PROVIDER_DEFAULT uses Apple Maps on iOS, Google Maps on Android
  PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;
} else {
  // lightweight web fallback - create elements without JSX so TS doesn't need JSX flag
  MapView = memo(function WebMapView(props: any) {
    const style = Array.isArray(props.style) ? Object.assign({}, ...props.style) : props.style;
    return React.createElement(
      View,
      { style: [{ backgroundColor: '#efefef', alignItems: 'center', justifyContent: 'center' }, style] },
      React.createElement(Text, { style: { color: '#6b7280' } }, 'Map not available on web'),
      props.children
    );
  });
  Marker = memo(function WebMarker() { return null; });
  Polyline = memo(function WebPolyline() { return null; });
  PROVIDER_GOOGLE = null;
}

export { MapView, Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT };

export default MapView;
