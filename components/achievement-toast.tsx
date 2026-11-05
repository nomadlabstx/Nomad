import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AchievementToastProps {
  name: string;
  onDone: () => void;
}

const AchievementToast = memo(({ name, onDone }: AchievementToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [name, onDone]);

  return (
    <View style={styles.chip} pointerEvents="none">
      <Text style={styles.check}>✓</Text>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
    </View>
  );
});

AchievementToast.displayName = 'AchievementToast';

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    maxWidth: '88%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  check: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f9d58',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
});

export default AchievementToast;
