/**
 * Compact speed-camera chip — nearest alert only.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CameraAlert } from '../services/speed-camera';

interface SpeedCameraAlertProps {
  alert: CameraAlert;
}

function cameraLabel(type: CameraAlert['camera']['type']): string {
  switch (type) {
    case 'red_light':
      return 'Red light';
    case 'mobile':
      return 'Speed trap';
    case 'average_speed':
      return 'Avg speed';
    default:
      return 'Camera ahead';
  }
}

function formatDistance(meters: number): string {
  if (meters > 800) {
    return `${(meters * 0.000621371).toFixed(1)} mi`;
  }
  return `${Math.round(meters * 3.28084)} ft`;
}

export const SpeedCameraAlert = React.memo<SpeedCameraAlertProps>(({ alert }) => {
  const urgent = alert.alertLevel === 'very_near' || alert.alertLevel === 'near';

  return (
    <View style={[styles.chip, urgent && styles.chipUrgent]}>
      <Text style={[styles.title, urgent && styles.titleUrgent]} numberOfLines={1}>
        {cameraLabel(alert.camera.type)}
      </Text>
      <Text style={styles.distance}>{formatDistance(alert.distanceToCamera)}</Text>
      {alert.camera.speedLimit > 0 ? (
        <Text style={styles.limit}>{alert.camera.speedLimit}</Text>
      ) : null}
    </View>
  );
});

SpeedCameraAlert.displayName = 'SpeedCameraAlert';

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  chipUrgent: {
    backgroundColor: 'rgba(255, 59, 48, 0.92)',
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  titleUrgent: {
    color: '#fff',
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.62)',
  },
  limit: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(0, 0, 0, 0.55)',
  },
});
