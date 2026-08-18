/**
 * Speed Limit Display Component
 * Shows current speed limit and user's speed with visual warning
 */

import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { speedLimitService, type SpeedLimitData } from '../services/speed-limit';

interface SpeedLimitDisplayProps {
  currentSpeed: number; // m/s from GPS
  latitude: number;
  longitude: number;
  unit?: 'mph' | 'km/h';
  showCurrentSpeed?: boolean; // Toggle between Waze-style (show speed) and Apple Maps-style (limit only)
}

const SpeedLimitDisplay = memo<SpeedLimitDisplayProps>(({
  currentSpeed,
  latitude,
  longitude,
  unit = 'mph',
  showCurrentSpeed = false, // Default to Apple Maps style (limit only)
}) => {
  const [speedLimitData, setSpeedLimitData] = useState<SpeedLimitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch speed limit when location changes
  useEffect(() => {
    const fetchSpeedLimit = async () => {
      setIsLoading(true);
      const data = await speedLimitService.getSpeedLimit({ latitude, longitude });
      setSpeedLimitData(data);
      setIsLoading(false);
    };

    fetchSpeedLimit();
  }, [latitude, longitude]);

  // Calculate speed status
  const speedStatus = useMemo(() => {
    if (!speedLimitData) return 'unknown';
    return speedLimitService.getSpeedStatus(
      currentSpeed,
      speedLimitData.speedLimit,
      speedLimitData.units
    );
  }, [currentSpeed, speedLimitData]);

  // Format current speed for display
  const formattedCurrentSpeed = useMemo(() => {
    return speedLimitService.formatSpeed(currentSpeed, unit);
  }, [currentSpeed, unit]);

  // Convert speed limit to display unit
  const formattedSpeedLimit = useMemo(() => {
    if (!speedLimitData) return null;
    
    let limit = speedLimitData.speedLimit;
    
    // Convert if needed
    if (speedLimitData.units === 'km/h' && unit === 'mph') {
      limit = limit / 1.60934;
    } else if (speedLimitData.units === 'mph' && unit === 'km/h') {
      limit = limit * 1.60934;
    }

    return `${Math.round(limit)} ${unit}`;
  }, [speedLimitData, unit]);

  // Get color based on speed status
  const getStatusColor = () => {
    switch (speedStatus) {
      case 'under':
        return '#00b300'; // Green
      case 'at':
        return '#ffa500'; // Orange
      case 'over':
        return '#ff3b30'; // Red
      default:
        return '#888'; // Gray
    }
  };

  if (isLoading && !speedLimitData) {
    return null; // Don't show while loading
  }

  if (!speedLimitData) {
    return null; // No speed limit available
  }

  return (
    <View style={styles.container}>
      {/* Speed Limit Sign */}
      <View style={styles.speedLimitSign}>
        <Text style={styles.speedLimitLabel}>LIMIT</Text>
        <Text style={styles.speedLimitValue}>{formattedSpeedLimit}</Text>
      </View>

      {/* Current Speed (Waze-style - only show if enabled) */}
      {showCurrentSpeed && (
        <View style={[styles.currentSpeedContainer, { borderColor: getStatusColor() }]}>
          <Text style={[styles.currentSpeedValue, { color: getStatusColor() }]}>
            {formattedCurrentSpeed}
          </Text>
          {speedStatus === 'over' && (
            <Text style={styles.warningText}>SLOW DOWN</Text>
          )}
        </View>
      )}
    </View>
  );
});

SpeedLimitDisplay.displayName = 'SpeedLimitDisplay';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speedLimitSign: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedLimitLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.5,
  },
  speedLimitValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  currentSpeedContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
  },
  currentSpeedValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ff3b30',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default SpeedLimitDisplay;

