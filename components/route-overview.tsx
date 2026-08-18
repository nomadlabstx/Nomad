/**
 * Route Overview Component
 * Shows all remaining directions like Waze/Apple Maps
 */

import * as Haptics from 'expo-haptics';
import { memo, useCallback } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Route, RouteStep } from '../services/navigation';
import { navigationService } from '../services/navigation';
import { formatDirectionInstruction } from '../utils/format-directions';
import { useAppTint } from './color-context';
import InstructionText from './instruction-text';

interface RouteOverviewProps {
  visible: boolean;
  onClose: () => void;
  route: Route | null;
  currentLegIndex: number;
  currentStepIndex: number;
  unit?: 'miles' | 'km';
}

const RouteOverview = memo<RouteOverviewProps>(({
  visible,
  onClose,
  route,
  currentLegIndex,
  currentStepIndex,
  unit = 'miles',
}) => {
  const { tint } = useAppTint();

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const renderStep = useCallback(
    ({ item }: { item: RouteStep & { isCurrent: boolean }; index: number }) => {
      const distance = navigationService.formatDistance(item.distance, unit);
      const maneuverIcon = getManeuverSymbol(item.maneuver);
      const { primary, secondary } = formatDirectionInstruction(item.instruction);

      return (
        <View
          style={[
            styles.stepContainer,
            item.isCurrent && { backgroundColor: `${tint}15` },
          ]}
        >
          {/* Maneuver Icon */}
          <View
            style={[
              styles.maneuverIcon,
              item.isCurrent && { backgroundColor: tint },
              !item.isCurrent && { backgroundColor: '#e5e7eb' },
            ]}
          >
            <Text style={[styles.maneuverText, item.isCurrent && { color: '#fff' }]}>
              {maneuverIcon}
            </Text>
          </View>

          {/* Instruction */}
          <View style={styles.instructionContainer}>
            <InstructionText
              text={primary}
              style={[styles.instructionText, item.isCurrent && styles.currentInstruction]}
            />
            {secondary ? (
              <InstructionText text={secondary} style={styles.secondaryInstructionText} />
            ) : null}
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
        </View>
      );
    },
    [tint, unit]
  );

  if (!route) return null;

  // Collect all remaining steps
  const remainingSteps: (RouteStep & { isCurrent: boolean })[] = [];

  // Add remaining steps from current leg
  for (let i = currentStepIndex; i < route.legs[currentLegIndex].steps.length; i++) {
    remainingSteps.push({
      ...route.legs[currentLegIndex].steps[i],
      isCurrent: i === currentStepIndex,
    });
  }

  // Add steps from remaining legs
  for (let legIdx = currentLegIndex + 1; legIdx < route.legs.length; legIdx++) {
    for (const step of route.legs[legIdx].steps) {
      remainingSteps.push({
        ...step,
        isCurrent: false,
      });
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Directions</Text>
        <Text style={styles.headerSubtitle}>
          {remainingSteps.length} remaining {remainingSteps.length === 1 ? 'step' : 'steps'}
        </Text>
      </View>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {renderHeader()}
        <FlatList
          data={remainingSteps}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderStep}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        />
      </SafeAreaView>
    </Modal>
  );
});

RouteOverview.displayName = 'RouteOverview';

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
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#374151',
  },
  listContent: {
    paddingVertical: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  maneuverIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  maneuverText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  instructionContainer: {
    flex: 1,
  },
  instructionText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 4,
  },
  currentInstruction: {
    fontWeight: '600',
  },
  secondaryInstructionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default RouteOverview;

