/**
 * Speed Camera Alert Component
 * Displays warnings for upcoming speed cameras
 */

import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '../hooks/use-theme-color';
import type { CameraAlert } from '../services/speed-camera';

interface SpeedCameraAlertProps {
  alert: CameraAlert;
}

export const SpeedCameraAlert = React.memo<SpeedCameraAlertProps>(({ alert }) => {
  const tint = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const text = useThemeColor({ light: '#000000', dark: '#FFFFFF' }, 'text');
  
  // Animated warning pulse
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (alert.alertLevel !== 'very_near' && alert.alertLevel !== 'near') {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
      pulseAnim.setValue(1);
    };
  }, [alert.alertLevel, pulseAnim]);

  const getAlertColor = (): string => {
    switch (alert.alertLevel) {
      case 'very_near':
        return '#FF3B30'; // Red
      case 'near':
        return '#FF9500'; // Orange
      case 'medium':
        return '#FFCC00'; // Yellow
      case 'far':
        return tint;
      default:
        return tint;
    }
  };

  const getCameraIcon = (): string => {
    switch (alert.camera.type) {
      case 'speed':
        return '📷';
      case 'red_light':
        return '🚦';
      case 'mobile':
        return '👮';
      case 'average_speed':
        return '📊';
      default:
        return '📷';
    }
  };

  const distanceMiles = (alert.distanceToCamera * 0.000621371).toFixed(1);
  const distanceFeet = Math.round(alert.distanceToCamera * 3.28084);
  const distance = alert.distanceToCamera > 800 
    ? `${distanceMiles} mi` 
    : `${distanceFeet} ft`;

  const alertColor = getAlertColor();
  const isUrgent = alert.alertLevel === 'very_near' || alert.alertLevel === 'near';

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: `${alertColor}20`,
          borderColor: alertColor,
          transform: isUrgent ? [{ scale: pulseAnim }] : [],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getCameraIcon()}</Text>
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: alertColor }]}>
          {alert.camera.type === 'speed' && 'Speed Camera'}
          {alert.camera.type === 'red_light' && 'Red Light Camera'}
          {alert.camera.type === 'mobile' && 'Mobile Speed Trap'}
          {alert.camera.type === 'average_speed' && 'Average Speed Zone'}
        </Text>
        <Text style={[styles.distance, { color: text }]}>
          {isUrgent ? 'AHEAD: ' : ''}{distance}
        </Text>
        {alert.camera.road && (
          <Text style={[styles.road, { color: text }]} numberOfLines={1}>
            {alert.camera.road}
          </Text>
        )}
      </View>

      <View style={styles.speedContainer}>
        <Text style={[styles.speedLimit, { color: alertColor }]}>
          {alert.camera.speedLimit}
        </Text>
        <Text style={[styles.mph, { color: text }]}>mph</Text>
      </View>
    </Animated.View>
  );
});

SpeedCameraAlert.displayName = 'SpeedCameraAlert';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  distance: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  road: {
    fontSize: 12,
    opacity: 0.7,
  },
  speedContainer: {
    alignItems: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  speedLimit: {
    fontSize: 24,
    fontWeight: '800',
  },
  mph: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.7,
  },
});


