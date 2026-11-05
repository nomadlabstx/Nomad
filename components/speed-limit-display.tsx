/**
 * MUTCD posted SPEED LIMIT plaque. Posted limit only — no live speed vs limit.
 */

import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { speedLimitService, type SpeedLimitData } from '../services/speed-limit';

interface SpeedLimitDisplayProps {
  currentSpeed: number;
  latitude: number;
  longitude: number;
  unit?: 'mph' | 'km/h';
  showCurrentSpeed?: boolean;
}

const SpeedLimitDisplay = memo<SpeedLimitDisplayProps>(({
  currentSpeed,
  latitude,
  longitude,
  unit = 'mph',
  showCurrentSpeed = false,
}) => {
  const [speedLimitData, setSpeedLimitData] = useState<SpeedLimitData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSpeedLimit = async () => {
      const data = await speedLimitService.getSpeedLimit({ latitude, longitude });
      if (!cancelled) {
        setSpeedLimitData(data);
      }
    };
    void fetchSpeedLimit();
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  const speedStatus = useMemo(() => {
    if (!speedLimitData) return 'unknown';
    return speedLimitService.getSpeedStatus(
      currentSpeed,
      speedLimitData.speedLimit,
      speedLimitData.units
    );
  }, [currentSpeed, speedLimitData]);

  const formattedCurrentSpeed = useMemo(() => {
    return speedLimitService.formatSpeed(currentSpeed, unit);
  }, [currentSpeed, unit]);

  const postedLimit = useMemo(() => {
    if (!speedLimitData) return null;
    let limit = speedLimitData.speedLimit;
    if (speedLimitData.units === 'km/h' && unit === 'mph') {
      limit = limit / 1.60934;
    } else if (speedLimitData.units === 'mph' && unit === 'km/h') {
      limit = limit * 1.60934;
    }
    return Math.round(limit);
  }, [speedLimitData, unit]);

  const getStatusColor = () => {
    switch (speedStatus) {
      case 'under':
        return '#00b300';
      case 'at':
        return '#ffa500';
      case 'over':
        return '#ff3b30';
      default:
        return '#888';
    }
  };

  if (!speedLimitData || postedLimit == null) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.sign}>
        <Text style={styles.signLabel}>SPEED</Text>
        <Text style={styles.signLabel}>LIMIT</Text>
        <Text style={styles.signValue}>{postedLimit}</Text>
      </View>

      {showCurrentSpeed && (
        <View style={[styles.currentSpeedContainer, { borderColor: getStatusColor() }]}>
          <Text style={[styles.currentSpeedValue, { color: getStatusColor() }]}>
            {formattedCurrentSpeed}
          </Text>
        </View>
      )}
    </View>
  );
});

SpeedLimitDisplay.displayName = 'SpeedLimitDisplay';

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  sign: {
    width: 56,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#111',
    borderRadius: 2,
    alignItems: 'center',
  },
  signLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#111',
    letterSpacing: 0.8,
    lineHeight: 10,
  },
  signValue: {
    marginTop: 2,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '800',
    color: '#111',
  },
  currentSpeedContainer: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
  },
  currentSpeedValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SpeedLimitDisplay;
