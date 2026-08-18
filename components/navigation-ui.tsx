/**
 * Navigation UI Component
 * Displays turn-by-turn navigation interface with map, instructions, and ETA
 */

import * as Haptics from 'expo-haptics';
import { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LaneInfo, Route } from '../services/navigation';
import { navigationService } from '../services/navigation';
import type { CameraAlert } from '../services/speed-camera';
import { useAppTint } from './color-context';
import InstructionText from './instruction-text';
import LaneGuidance from './lane-guidance';
import RouteOverview from './route-overview';
import { SpeedCameraAlert } from './speed-camera-alert';
import SpeedLimitDisplay from './speed-limit-display';

/** Fixed accent for map overlays — theme tint is white in dark mode. */
const NAV_ACCENT = '#007AFF';

interface NavigationUIProps {
  nextInstruction: string;
  distanceToTurn: number;
  timeToDestination: number;
  distanceRemaining: number;
  currentManeuver?: string;
  lanes?: LaneInfo[]; // Lane guidance data
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onStopNavigation: () => void;
  unit?: 'miles' | 'km';
  currentLocation?: { latitude: number; longitude: number };
  currentSpeed?: number; // m/s from GPS
  route?: Route; // Full route for overview
  currentLegIndex?: number;
  currentStepIndex?: number;
  cameraAlerts?: CameraAlert[]; // Speed camera warnings
}

const NavigationUI = memo<NavigationUIProps>(({
  nextInstruction,
  distanceToTurn,
  timeToDestination,
  distanceRemaining,
  currentManeuver,
  lanes,
  voiceEnabled,
  onToggleVoice,
  onStopNavigation,
  unit = 'miles',
  currentLocation,
  currentSpeed = 0,
  cameraAlerts = [],
  route,
  currentLegIndex = 0,
  currentStepIndex = 0,
}) => {
  const { tint } = useAppTint();
  const [showRouteOverview, setShowRouteOverview] = useState(false);

  // Format displays
  const distanceToTurnDisplay = useMemo(
    () => navigationService.formatDistance(distanceToTurn, unit),
    [distanceToTurn, unit]
  );

  const distanceRemainingDisplay = useMemo(
    () => navigationService.formatDistance(distanceRemaining, unit),
    [distanceRemaining, unit]
  );

  const etaDisplay = useMemo(
    () => navigationService.formatDuration(timeToDestination),
    [timeToDestination]
  );

  // Calculate actual arrival time
  const arrivalTime = useMemo(() => {
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + timeToDestination * 1000);
    const hours = arrivalDate.getHours();
    const minutes = arrivalDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }, [timeToDestination]);


  // Determine urgency level for styling
  const urgencyLevel = useMemo(() => {
    if (distanceToTurn < 50) return 'now';
    if (distanceToTurn < 100) return 'near';
    if (distanceToTurn < 400) return 'medium';
    return 'far';
  }, [distanceToTurn]);

  const handleToggleVoice = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleVoice();
  }, [onToggleVoice]);

  const handleStop = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onStopNavigation();
  }, [onStopNavigation]);

  const handleOpenOverview = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowRouteOverview(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Speed Camera Alerts */}
      {cameraAlerts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cameraAlertsContainer}
        >
          {cameraAlerts.slice(0, 3).map((alert) => (
            <SpeedCameraAlert key={alert.camera.id} alert={alert} />
          ))}
        </ScrollView>
      )}

      {/* Main Navigation Panel */}
      <TouchableOpacity
        style={[styles.mainPanel, urgencyLevel === 'now' && styles.mainPanelUrgent]}
        onPress={handleOpenOverview}
        activeOpacity={0.7}
      >
        {/* Maneuver Icon */}
        <View style={styles.maneuverContainer}>
          <Text style={styles.maneuverIcon}>{getManeuverSymbol(currentManeuver)}</Text>
        </View>

        {/* Instruction */}
        <View style={styles.instructionContainer}>
          <Text style={[styles.distanceText, urgencyLevel === 'now' && styles.distanceTextUrgent]}>
            {distanceToTurnDisplay}
          </Text>
          <InstructionText
            text={nextInstruction}
            style={[
              styles.instructionText,
              urgencyLevel === 'now' && styles.instructionTextUrgent,
            ]}
            compact
          />
          
          {/* Lane Guidance */}
          {lanes && distanceToTurn < 800 && (
            <LaneGuidance lanes={lanes} tint={tint} />
          )}
        </View>
      </TouchableOpacity>

      {/* Bottom Info Bar */}
      <View style={styles.bottomBar}>
        {/* ETA */}
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Arrive</Text>
          <Text style={styles.infoValue}>{arrivalTime}</Text>
          <Text style={styles.infoSubtext}>{etaDisplay}</Text>
        </View>

        {/* Distance Remaining */}
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Distance</Text>
          <Text style={styles.infoValue}>{distanceRemainingDisplay}</Text>
        </View>

        {/* Speed Limit Display */}
        {currentLocation && (
          <SpeedLimitDisplay
            currentSpeed={currentSpeed}
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
            unit={unit === 'miles' ? 'mph' : 'km/h'}
            showCurrentSpeed={false}
          />
        )}

        {/* Voice Toggle */}
        <TouchableOpacity
          onPress={handleToggleVoice}
          style={[styles.iconButton, voiceEnabled ? styles.iconButtonActive : styles.iconButtonInactive]}
        >
          <Text style={styles.iconButtonText}>{voiceEnabled ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>

        {/* Stop Navigation */}
        <TouchableOpacity
          onPress={handleStop}
          style={[styles.iconButton, { backgroundColor: '#ff3b30' }]}
        >
          <Text style={styles.iconButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Route Overview Modal */}
      <RouteOverview
        visible={showRouteOverview}
        onClose={() => setShowRouteOverview(false)}
        route={route || null}
        currentLegIndex={currentLegIndex}
        currentStepIndex={currentStepIndex}
        unit={unit}
      />
    </View>
  );
});

NavigationUI.displayName = 'NavigationUI';

/**
 * Get symbol for maneuver type
 */
function getManeuverSymbol(maneuver?: string): string {
  if (!maneuver) return '↑';

  const symbols: Record<string, string> = {
    'turn-left': '←',
    'turn-right': '→',
    'turn-slight-left': '↖',
    'turn-slight-right': '↗',
    'turn-sharp-left': '↰',
    'turn-sharp-right': '↱',
    'uturn-left': '↶',
    'uturn-right': '↷',
    'merge': '⤴',
    'fork-left': '↖',
    'fork-right': '↗',
    'ferry': '⛴',
    'roundabout-left': '⭯',
    'roundabout-right': '⭮',
    'ramp-left': '↙',
    'ramp-right': '↘',
    'straight': '↑',
  };

  return symbols[maneuver] || '↑';
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none', // Allow touches to pass through to map
  },
  cameraAlertsContainer: {
    marginTop: 60, // Below status bar
    marginBottom: 8,
    maxHeight: 100,
    zIndex: 1000,
  },
  mainPanel: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 60,
    marginHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mainPanelUrgent: {
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
  },
  maneuverContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: NAV_ACCENT,
  },
  maneuverIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  instructionContainer: {
    flex: 1,
  },
  distanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  distanceTextUrgent: {
    color: '#fff',
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  instructionTextUrgent: {
    color: '#fff',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  infoSubtext: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconButtonActive: {
    backgroundColor: NAV_ACCENT,
    borderColor: NAV_ACCENT,
  },
  iconButtonInactive: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  iconButtonText: {
    fontSize: 20,
  },
});

export default NavigationUI;

