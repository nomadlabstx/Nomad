import { usePathname, useRouter } from 'expo-router';
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderHandlers,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

const DRAWER_WIDTH = 280;

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const AppDrawerContext = createContext<DrawerContextValue | null>(null);

const useAppDrawer = () => {
  const context = useContext(AppDrawerContext);
  if (!context) {
    throw new Error('useAppDrawer must be used within AppDrawerProvider');
  }
  return context;
};

const DrawerItem = memo(({ label, icon, href, isActive, onNavigate }: {
  label: string;
  icon: string;
  href: string;
  isActive: boolean;
  onNavigate: (href: string) => void;
}) => {
  const theme = useThemeColors();

  return (
    <Pressable
      style={[
        styles.drawerItem,
        isActive && { backgroundColor: theme.inactive },
      ]}
      onPress={() => onNavigate(href)}
    >
      <IconSymbol size={20} name={icon as any} color={theme.text} />
      <Text style={[styles.drawerItemText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
});

DrawerItem.displayName = 'DrawerItem';

const AppDrawerOverlay = memo(({ translateX, isOpen, onClose, panHandlers }: {
  translateX: Animated.Value;
  isOpen: boolean;
  onClose: () => void;
  panHandlers?: GestureResponderHandlers;
}) => {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();

  const onNavigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const isActive = useCallback((href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.includes(href.replace('/(tabs)', ''));
  }, [pathname]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isOpen ? 'box-none' : 'none'}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        pointerEvents={isOpen ? 'auto' : 'none'}
      />
      <Animated.View
        {...panHandlers}
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
            paddingTop: insets.top + 16,
            backgroundColor: theme.cardBackground,
            borderRightColor: theme.border,
          },
        ]}
      >
        <Text style={[styles.drawerTitle, { color: theme.text }]}>Menu</Text>
        <View style={[styles.drawerSection, { borderTopColor: theme.border }]}>
          <DrawerItem label="Home" icon="house.fill" href="/" isActive={isActive('/')} onNavigate={onNavigate} />
          <DrawerItem label="Pathfinder" icon="brain.head.profile" href="/(tabs)/ai-assistant" isActive={isActive('/(tabs)/ai-assistant')} onNavigate={onNavigate} />
          <DrawerItem label="GPS" icon="paperplane.fill" href="/(tabs)/recorder" isActive={isActive('/(tabs)/recorder')} onNavigate={onNavigate} />
          <DrawerItem label="Travel Log" icon="map.fill" href="/(tabs)/travel-log" isActive={isActive('/(tabs)/travel-log')} onNavigate={onNavigate} />
          <DrawerItem label="Checklist" icon="checkmark.circle.fill" href="/(tabs)/explore" isActive={isActive('/(tabs)/explore')} onNavigate={onNavigate} />
        </View>
        <View style={[styles.drawerSection, { borderTopColor: theme.border }]}>
          <DrawerItem label="Trips" icon="list.bullet" href="/(tabs)/planned-trips" isActive={isActive('/(tabs)/planned-trips')} onNavigate={onNavigate} />
          <DrawerItem label="Achievements" icon="trophy.fill" href="/(tabs)/achievements" isActive={isActive('/(tabs)/achievements')} onNavigate={onNavigate} />
          <DrawerItem label="Bookings" icon="calendar" href="/(tabs)/bookings" isActive={isActive('/(tabs)/bookings')} onNavigate={onNavigate} />
        </View>
        <View style={[styles.drawerSection, { borderTopColor: theme.border }]}>
          <DrawerItem label="Settings" icon="gearshape.fill" href="/(tabs)/settings" isActive={isActive('/(tabs)/settings')} onNavigate={onNavigate} />
        </View>
      </Animated.View>
    </View>
  );
});

AppDrawerOverlay.displayName = 'AppDrawerOverlay';

export const AppDrawerProvider = memo(({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const translateXValue = useRef(-DRAWER_WIDTH);
  const isOpenRef = useRef(false);

  // Native maps own their gestures. A parent PanResponder wrapping the whole
  // app (or an off-screen drawer that still occupies its layout hit box)
  // swallows pans/zooms on the GPS screen.
  const isMapScreen = pathname.includes('/recorder') || pathname.includes('/trip/');

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const listenerId = translateX.addListener(({ value }) => {
      translateXValue.current = value;
    });

    return () => {
      translateX.removeListener(listenerId);
    };
  }, [translateX]);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const closeDrawer = useCallback(() => {
    Animated.timing(translateX, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsOpen(false);
      }
    });
  }, [translateX]);

  const toggleDrawer = useCallback(() => {
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [isOpen, openDrawer, closeDrawer]);

  const value = useMemo(() => ({
    isOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  }), [isOpen, openDrawer, closeDrawer, toggleDrawer]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gesture) => {
          const { dx, dy } = gesture;
          const isHorizontal = Math.abs(dx) > Math.abs(dy);
          if (!isHorizontal || Math.abs(dx) < 8) return false;

          if (isOpenRef.current) {
            return dx < 0;
          }

          return evt.nativeEvent.pageX <= 24 && dx > 0;
        },
        onPanResponderMove: (_evt, gesture) => {
          let nextX = -DRAWER_WIDTH;
          if (isOpenRef.current) {
            nextX = Math.min(0, Math.max(-DRAWER_WIDTH, translateXValue.current + gesture.dx));
          } else {
            nextX = Math.min(0, Math.max(-DRAWER_WIDTH, -DRAWER_WIDTH + gesture.dx));
          }
          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const shouldOpen = gesture.vx > 0.3 || translateXValue.current > -DRAWER_WIDTH / 2;
          if (shouldOpen) {
            openDrawer();
          } else {
            closeDrawer();
          }
        },
      }),
    [translateX, openDrawer, closeDrawer]
  );

  return (
    <AppDrawerContext.Provider value={value}>
      <View style={styles.container}>
        {children}
        {!isOpen && !isMapScreen && (
          <View
            style={styles.edgeSwipe}
            {...panResponder.panHandlers}
            collapsable={false}
          />
        )}
        <AppDrawerOverlay
          translateX={translateX}
          isOpen={isOpen}
          onClose={closeDrawer}
          panHandlers={isOpen ? panResponder.panHandlers : undefined}
        />
      </View>
    </AppDrawerContext.Provider>
  );
});

AppDrawerProvider.displayName = 'AppDrawerProvider';

export const DrawerToggleButton = memo(() => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { toggleDrawer } = useAppDrawer();

  return (
    <Pressable
      style={[
        styles.menuButton,
        {
          top: insets.top + 8,
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        },
      ]}
      onPress={toggleDrawer}
    >
      <IconSymbol size={20} name="line.3.horizontal" color={theme.text} />
    </Pressable>
  );
});

DrawerToggleButton.displayName = 'DrawerToggleButton';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  edgeSwipe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    paddingHorizontal: 16,
    borderRightWidth: 1,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  drawerSection: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  drawerItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuButton: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    zIndex: 40,
  },
});

