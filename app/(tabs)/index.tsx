import { useAppTint } from '@/components/color-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeColors } from '../../hooks/use-theme-colors';

// Color palette removed - colors are now theme-based only

interface QuickActionButtonProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  tint: string;
}

const QuickActionButton = memo<QuickActionButtonProps>(({ icon, title, description, onPress, tint }) => {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity 
      style={[styles.actionButton, Platform.OS !== 'web' && styles.actionButtonShadow]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: tint }]}>
        <IconSymbol size={32} name={icon as any} color="#fff" />
      </View>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <IconSymbol size={20} name="chevron.right" color="#999" />
    </TouchableOpacity>
  );
});

QuickActionButton.displayName = 'QuickActionButton';

const HomeScreen = memo(() => {
  const { tint } = useAppTint();
  const theme = useThemeColors();
  const router = useRouter();
  
  const handleOpenPathfinder = useCallback(() => {
    router.push('/(tabs)/ai-assistant');
  }, [router]);

  const handleOpenRecorder = useCallback(() => {
    router.push('/(tabs)/recorder');
  }, [router]);

  const handleOpenTravelLog = useCallback(() => {
    router.push('/(tabs)/explore');
  }, [router]);

  const handleOpenBookings = useCallback(() => {
    router.push('/(tabs)/bookings');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerSection}>
        <Text style={[styles.greeting, { color: theme.text }]}>What&apos;s the move,</Text>
        <Text style={[styles.greeting, { color: theme.text }]}>Chief?</Text>
      </View>

      <View style={styles.actionsSection}>
        <QuickActionButton
          icon="brain.head.profile"
          title="Pathfinder"
          description="Plan your trip with AI"
          onPress={handleOpenPathfinder}
          tint={tint}
        />
        <QuickActionButton
          icon="paperplane.fill"
          title="Start Recording"
          description="Track your journey"
          onPress={handleOpenRecorder}
          tint={tint}
        />
        <QuickActionButton
          icon="map.fill"
          title="Travel Log"
          description="View your trip history"
          onPress={handleOpenTravelLog}
          tint={tint}
        />
        <QuickActionButton
          icon="calendar"
          title="My Bookings"
          description="Manage your travel bookings"
          onPress={handleOpenBookings}
          tint={tint}
        />
      </View>

    </View>
  );
});

HomeScreen.displayName = 'HomeScreen';

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  actionsSection: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  actionButtonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#888',
  },
});
