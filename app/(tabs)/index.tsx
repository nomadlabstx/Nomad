import { useAppTint } from '@/components/color-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/use-theme-colors';

// Color palette removed - colors are now theme-based only

interface QuickActionButtonProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  tint: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const QuickActionButton = memo<QuickActionButtonProps>(({ icon, title, description, onPress, tint }) => {
  const scale = useSharedValue(1);
  const theme = useThemeColors();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()}>
      <AnimatedTouchable 
        style={[
          styles.actionButton,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
          Platform.OS !== 'web' && styles.actionButtonShadow,
          animatedStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
      <Animated.View 
        style={[
          styles.actionIconContainer, 
          { backgroundColor: tint },
        ]}
        entering={FadeInUp.delay(100).duration(300)}
      >
        <IconSymbol size={32} name={icon as any} color="#fff" />
      </Animated.View>
      <View style={styles.actionTextContainer}>
        <Text style={[styles.actionTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.actionDescription, { color: theme.secondaryText }]}>{description}</Text>
      </View>
      <IconSymbol size={20} name="chevron.right" color={theme.secondaryText} />
      </AnimatedTouchable>
    </Animated.View>
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
    router.push('/(tabs)/travel-log');
  }, [router]);

  const handleOpenBookings = useCallback(() => {
    router.push('/(tabs)/bookings');
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View 
        style={styles.headerSection}
        entering={FadeInUp.duration(500).springify()}
      >
        <Text style={[styles.greeting, { color: theme.text }]}>What&apos;s the move,</Text>
        <Text style={[styles.greeting, styles.greetingSubtitle, { color: theme.text }]}>Chief?</Text>
      </Animated.View>

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
  },
  headerSection: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  greetingSubtitle: {
    marginBottom: 0,
  },
  actionsSection: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16,
    borderWidth: 1,
  },
  actionButtonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
