import * as Haptics from 'expo-haptics';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RecorderHUDProps } from '../types';
import { formatDistanceWithUnit, formatElapsedTime } from '../utils/calculations';
import { useAppTint } from './color-context';

const getRgbFromColor = (color: string): [number, number, number] | null => {
  const normalized = color.trim().toLowerCase();

  if (normalized === 'white') return [255, 255, 255];
  if (normalized === 'black') return [0, 0, 0];

  const shortHex = /^#([0-9a-f]{3})$/i.exec(normalized);
  if (shortHex) {
    const h = shortHex[1];
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }

  const longHex = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (longHex) {
    const h = longHex[1];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(normalized);
  if (rgb) {
    return [
      Math.min(255, parseInt(rgb[1], 10)),
      Math.min(255, parseInt(rgb[2], 10)),
      Math.min(255, parseInt(rgb[3], 10)),
    ];
  }

  return null;
};

const isLightColor = (color: string) => {
  const rgb = getRgbFromColor(color);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.72;
};

const RecorderHUD = memo<RecorderHUDProps>(({ 
  meters, 
  elapsedMs, 
  tracking, 
  paused, 
  start, 
  stop, 
  pause, 
  resume, 
  unit, 
  setUnit 
}) => {
  const { tint } = useAppTint();
  const actionButtonColor = useMemo(() => {
    if (!tint) return '#2563eb';
    return isLightColor(tint) ? '#2563eb' : tint;
  }, [tint]);
  const actionTextColor = isLightColor(actionButtonColor) ? '#111' : '#fff';

  // Memoized calculations
  const distanceDisplay = useMemo(() => 
    formatDistanceWithUnit(meters, unit), 
    [meters, unit]
  );

  const elapsedDisplay = useMemo(() => 
    formatElapsedTime(elapsedMs), 
    [elapsedMs]
  );

  // Memoized callbacks with haptics
  const handleUnitToggle = useCallback(() => {
    Haptics.selectionAsync();
    setUnit(unit === 'miles' ? 'km' : 'miles');
  }, [unit, setUnit]);

  const handleStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    start();
  }, [start]);

  const handleStop = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stop();
  }, [stop]);

  const handlePause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pause();
  }, [pause]);

  const handleResume = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resume();
  }, [resume]);

  return (
    <View style={[styles.container, { borderColor: tint }]}> 
      <Text style={styles.stat}>{distanceDisplay}</Text>
      <Text style={styles.stat}>{elapsedDisplay}</Text>

      <View style={styles.row}>
        {!tracking && !paused && (
          <Pressable onPress={handleStart} style={[styles.button, { backgroundColor: actionButtonColor }]}>
            <Text style={[styles.buttonText, { color: actionTextColor }]}>Start Trip</Text>
          </Pressable>
        )}

        {tracking && (
          <>
            <Pressable onPress={handlePause} style={[styles.button, { backgroundColor: actionButtonColor }]}>
              <Text style={[styles.buttonText, { color: actionTextColor }]}>Pause</Text>
            </Pressable>
            <Pressable onPress={handleStop} style={[styles.buttonStop, { backgroundColor: '#ff3b30' }]}>
              <Text style={styles.buttonText}>Stop & Save</Text>
            </Pressable>
          </>
        )}

        {paused && (
          <>
            <Pressable onPress={handleResume} style={[styles.button, { backgroundColor: actionButtonColor }]}>
              <Text style={[styles.buttonText, { color: actionTextColor }]}>Resume</Text>
            </Pressable>
            <Pressable onPress={handleStop} style={[styles.buttonStop, { backgroundColor: '#ff3b30' }]}>
              <Text style={styles.buttonText}>Stop & Save</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.row}> 
        <Pressable onPress={handleUnitToggle} style={styles.smallButton}>
          <Text>Unit: {unit === 'miles' ? 'mi' : 'km'}</Text>
        </Pressable>
      </View>
    </View>
  );
});

RecorderHUD.displayName = 'RecorderHUD';

export default RecorderHUD;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  stat: { fontSize: 18, fontWeight: '600', marginVertical: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, minWidth: 120, alignItems: 'center' },
  buttonStop: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, marginLeft: 4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  smallButton: { padding: 6, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.04)' },
});
