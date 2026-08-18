import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type MapViewProps,
} from 'react-native-maps';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/**
 * GestureHandlerRootView intercepts pans/pinches unless the native map
 * is wrapped in a Native gesture that is allowed to win.
 */
const GestureMapView = forwardRef<MapView, MapViewProps>(function GestureMapView(
  { style, pointerEvents, ...props },
  ref
) {
  const nativeGesture = useMemo(
    () => Gesture.Native().disallowInterruption(true),
    []
  );

  return (
    <View style={[styles.fill, style]} collapsable={false} pointerEvents={pointerEvents}>
      <GestureDetector gesture={nativeGesture}>
        <MapView
          ref={ref}
          {...props}
          style={styles.fill}
          scrollEnabled={props.scrollEnabled !== false}
          zoomEnabled={props.zoomEnabled !== false}
          zoomTapEnabled={props.zoomTapEnabled !== false}
        />
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

export { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE };
export default GestureMapView;
