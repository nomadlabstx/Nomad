/**
 * Dev-only GPS route player controls.
 * Hidden from production builds via __DEV__ at the call site.
 */

import { memo, useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGpsSimulator } from '../hooks/use-gps-simulator';
import { gpsSimulator, type GpsSimulatorPreset } from '../utils/gps-simulator';
import { getAccentFill, getOnAccentColor } from '../utils/theme-helpers';

interface GpsSimulatorPanelProps {
  tintColor: string;
  canStart: boolean;
  raised?: boolean;
  navigating?: boolean;
  onSimulateDrive: (preset: GpsSimulatorPreset) => void;
  onStopSimulation: () => void;
}

const PRESETS: { id: GpsSimulatorPreset; label: string }[] = [
  { id: 'city', label: 'City' },
  { id: 'highway', label: 'Hwy' },
  { id: 'fast', label: 'Fast' },
];

const GpsSimulatorPanel = memo<GpsSimulatorPanelProps>(({
  tintColor,
  canStart,
  raised = false,
  navigating = false,
  onSimulateDrive,
  onStopSimulation,
}) => {
  const sim = useGpsSimulator();
  const [preset, setPreset] = useState<GpsSimulatorPreset>('highway');
  const accentFill = getAccentFill(tintColor);
  const onAccent = getOnAccentColor(accentFill);

  const handlePreset = useCallback((next: GpsSimulatorPreset) => {
    setPreset(next);
    if (gpsSimulator.isRunning()) {
      gpsSimulator.setPreset(next);
    }
  }, []);

  const progressPct = Math.round(sim.progress * 100);

  if (navigating) {
    if (!sim.running) {
      return null;
    }

    return (
      <View style={styles.navChipWrap} pointerEvents="box-none">
        <View style={styles.navChip}>
          <Text style={styles.navChipLabel}>SIM {progressPct}%</Text>
          <TouchableOpacity
            onPress={onStopSimulation}
            accessibilityRole="button"
            accessibilityLabel="Stop simulated drive"
            hitSlop={8}
          >
            <Text style={styles.navChipStop}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.containerBase,
        navigating ? styles.containerTop : raised ? styles.containerRaised : styles.containerBottom,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <Text style={styles.badge}>DEV · Simulated GPS</Text>
        <View style={styles.presets}>
          {PRESETS.map((item) => {
            const selected = (sim.running ? sim.preset : preset) === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.presetButton,
                  selected && { backgroundColor: accentFill, borderColor: accentFill },
                ]}
                onPress={() => handlePreset(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} simulation speed`}
              >
                <Text style={[styles.presetText, selected && { color: onAccent }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {sim.running ? (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onStopSimulation}
              accessibilityRole="button"
              accessibilityLabel="Stop simulated drive"
            >
              <Text style={styles.secondaryText}>Stop sim</Text>
            </TouchableOpacity>
            <Text style={styles.progress}>{progressPct}% along route</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: accentFill },
              !canStart && styles.disabled,
            ]}
            onPress={() => onSimulateDrive(preset)}
            disabled={!canStart}
            accessibilityRole="button"
            accessibilityLabel="Simulate drive along this route"
          >
            <Text style={[styles.primaryText, { color: onAccent }]}>Simulate drive</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

GpsSimulatorPanel.displayName = 'GpsSimulatorPanel';

export default GpsSimulatorPanel;

const styles = StyleSheet.create({
  containerBase: {
    position: 'absolute',
    left: 16,
    zIndex: 40,
    alignItems: 'stretch',
  },
  containerBottom: {
    right: 72,
    bottom: 120,
  },
  containerRaised: {
    right: 72,
    bottom: '52%',
  },
  containerTop: {
    right: 16,
    top: 52,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  badge: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  presetText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progress: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  navChipWrap: {
    position: 'absolute',
    left: 16,
    bottom: 130,
    zIndex: 40,
  },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navChipLabel: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  navChipStop: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
