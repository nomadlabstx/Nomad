import { memo, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { InterstateRecPlace, RecKind } from '../utils/interstate-recs';
import { navigationService } from '../services/navigation';

interface InterstateRecChipProps {
  rec: InterstateRecPlace;
  isNavigating: boolean;
  sheetOpen: boolean;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  onAddOrGo: () => void;
  onDismiss: () => void;
  onMute: () => void;
}

function kindLabel(kind: RecKind): string {
  if (kind === 'eat') return 'Eat';
  if (kind === 'drink') return 'Drink';
  return 'Do';
}

const InterstateRecChip = memo(({
  rec,
  isNavigating,
  sheetOpen,
  onOpenSheet,
  onCloseSheet,
  onAddOrGo,
  onDismiss,
  onMute,
}: InterstateRecChipProps) => {
  const distance = navigationService.formatDistance(rec.distanceMeters, 'miles');
  const actionLabel = isNavigating ? 'Add' : 'Go';

  const handleLongPress = useCallback(() => {
    onMute();
  }, [onMute]);

  return (
    <>
      <Pressable
        onPress={onOpenSheet}
        onLongPress={handleLongPress}
        delayLongPress={450}
        style={styles.chip}
      >
        <Text style={styles.kind}>{kindLabel(rec.kind)}</Text>
        <Text style={styles.name} numberOfLines={1}>{rec.name}</Text>
        <Text style={styles.distance}>{distance}</Text>
        <TouchableOpacity onPress={onAddOrGo} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Text style={styles.dismiss}>Not now</Text>
        </TouchableOpacity>
      </Pressable>

      <Modal
        visible={sheetOpen}
        animationType="slide"
        transparent
        onRequestClose={onCloseSheet}
      >
        <Pressable style={styles.sheetBackdrop} onPress={onCloseSheet}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetKind}>{kindLabel(rec.kind)}</Text>
            <Text style={styles.sheetName}>{rec.name}</Text>
            <Text style={styles.sheetMeta}>
              {distance}
              {rec.rating ? ` · ${rec.rating.toFixed(1)}` : ''}
              {rec.leavesHighway ? ' · Leaves highway' : ''}
            </Text>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetPrimary} onPress={onAddOrGo}>
                <Text style={styles.sheetPrimaryText}>
                  {isNavigating ? 'Add to route' : 'Go'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetSecondary} onPress={onDismiss}>
                <Text style={styles.sheetSecondaryText}>Not now</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetHint}>Long-press a chip to turn recommendations off.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

InterstateRecChip.displayName = 'InterstateRecChip';

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    maxWidth: '92%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  kind: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#007AFF',
  },
  name: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.55)',
  },
  action: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  dismiss: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  sheet: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#fff',
  },
  sheetKind: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#007AFF',
  },
  sheetName: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  sheetMeta: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
  },
  sheetActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  sheetPrimary: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sheetPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  sheetSecondary: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sheetSecondaryText: {
    color: '#333',
    fontWeight: '600',
  },
  sheetHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#888',
  },
});

export default InterstateRecChip;
