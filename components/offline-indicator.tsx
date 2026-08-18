/**
 * Offline Indicator Component
 * Shows when the app is offline and using cached data
 */

import { memo, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { networkStatusService } from '../services/network-status';
import { useThemeColors } from '../hooks/use-theme-colors';

interface OfflineIndicatorProps {
  showWhenOnline?: boolean; // If true, shows indicator even when online (for testing)
}

export const OfflineIndicator = memo<OfflineIndicatorProps>(({ showWhenOnline = false }) => {
  const theme = useThemeColors();
  const [isOnline, setIsOnline] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Get initial status
    networkStatusService.getStatus().then(status => {
      setIsOnline(status.isConnected && (status.isInternetReachable ?? false));
    });

    // Subscribe to network changes
    const unsubscribe = networkStatusService.subscribe((status) => {
      const online = status.isConnected && (status.isInternetReachable ?? false);
      setIsOnline(online);

      // Animate in/out
      Animated.timing(fadeAnim, {
        toValue: (!online || showWhenOnline) ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, [fadeAnim, showWhenOnline]);

  // Don't show if online and not forced to show
  if (isOnline && !showWhenOnline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isOnline ? '#10b981' : '#ef4444',
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>
        {isOnline ? '🟢 Online' : '🔴 Offline - Using Cached Data'}
      </Text>
    </Animated.View>
  );
});

OfflineIndicator.displayName = 'OfflineIndicator';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

