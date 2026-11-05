/**
 * Compact Apple Maps-style turn-by-turn chrome.
 */

import * as Haptics from 'expo-haptics';
import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LaneInfo, Route } from '../services/navigation';
import { navigationService } from '../services/navigation';
import type { PlaceIdentity } from '../utils/place-identity';
import { useAppTint } from './color-context';
import InstructionText from './instruction-text';
import LaneGuidance from './lane-guidance';
import PlaceIdentityHud from './place-identity-hud';
import RouteOverview from './route-overview';

const NAV_ACCENT = '#007AFF';

interface NavigationUIProps {
  nextInstruction: string;
  distanceToTurn: number;
  timeToDestination: number;
  distanceRemaining: number;
  currentManeuver?: string;
  lanes?: LaneInfo[];
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onStopNavigation: () => void;
  unit?: 'miles' | 'km';
  currentLocation?: { latitude: number; longitude: number };
  currentSpeed?: number;
  route?: Route;
  currentLegIndex?: number;
  currentStepIndex?: number;
  topOffset?: number;
  identity?: PlaceIdentity | null;
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
  route,
  currentLegIndex = 0,
  currentStepIndex = 0,
  topOffset = 60,
  identity = null,
}) => {
  const { tint } = useAppTint();
  const [showRouteOverview, setShowRouteOverview] = useState(false);

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

  const arrivalTime = useMemo(() => {
    const arrivalDate = new Date(Date.now() + timeToDestination * 1000);
    const hours = arrivalDate.getHours();
    const minutes = arrivalDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }, [timeToDestination]);

  const urgencyLevel = useMemo(() => {
    if (distanceToTurn < 50) return 'now';
    if (distanceToTurn < 100) return 'near';
    if (distanceToTurn < 400) return 'medium';
    return 'far';
  }, [distanceToTurn]);

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
      <TouchableOpacity
        style={[
          styles.mainPanel,
          { marginTop: topOffset },
          urgencyLevel === 'now' && styles.mainPanelUrgent,
        ]}
        onPress={handleOpenOverview}
        activeOpacity={0.8}
      >
        <View style={[styles.maneuverContainer, urgencyLevel === 'now' && styles.maneuverUrgent]}>
          <Text style={styles.maneuverIcon}>{getManeuverSymbol(currentManeuver)}</Text>
        </View>

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
          <PlaceIdentityHud identity={identity} compact inverted={urgencyLevel === 'now'} />
          {lanes && distanceToTurn < 800 && (
            <LaneGuidance lanes={lanes} tint={tint} />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.bottomBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Arrive</Text>
          <Text style={styles.infoValue}>{arrivalTime}</Text>
          <Text style={styles.infoSubtext}>{etaDisplay}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Distance</Text>
          <Text style={styles.infoValue}>{distanceRemainingDisplay}</Text>
        </View>

        <TouchableOpacity
          onPress={handleStop}
          style={styles.endButton}
        >
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>

      <RouteOverview
        visible={showRouteOverview}
        onClose={() => setShowRouteOverview(false)}
        route={route || null}
        currentLegIndex={currentLegIndex}
        currentStepIndex={currentStepIndex}
        unit={unit}
        voiceEnabled={voiceEnabled}
        onToggleVoice={onToggleVoice}
      />
    </View>
  );
});

NavigationUI.displayName = 'NavigationUI';

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
    'roundabout-left': 'O',
    'roundabout-right': 'O',
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
    pointerEvents: 'box-none',
  },
  mainPanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  mainPanelUrgent: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  maneuverContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: NAV_ACCENT,
  },
  maneuverUrgent: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  maneuverIcon: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  instructionContainer: {
    flex: 1,
  },
  distanceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  distanceTextUrgent: {
    color: '#fff',
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  instructionTextUrgent: {
    color: '#fff',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  infoItem: {
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  infoSubtext: {
    fontSize: 11,
    color: '#888',
  },
  endButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
  },
  endButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default NavigationUI;
