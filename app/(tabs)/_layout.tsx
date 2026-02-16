import { Tabs } from 'expo-router';
import { memo } from 'react';

import { useAppTint } from '@/components/color-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { AppDrawerProvider, DrawerToggleButton } from '@/components/app-drawer';

const TabLayout = memo(() => {
  const colorScheme = useColorScheme();
  const { tint } = useAppTint();
  const theme = useThemeColors();

  return (
    <AppDrawerProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: tint ?? Colors[colorScheme ?? 'light'].tint,
          tabBarInactiveTintColor: theme.secondaryText,
          tabBarStyle: {
            display: 'none',
          },
          headerShown: false,
          tabBarButton: (props) => <HapticTab {...props} />,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="ai-assistant"
          options={{
            title: 'Pathfinder',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="brain.head.profile" color={color} />,
          }}
        />
        <Tabs.Screen
          name="recorder"
          options={{
            title: 'GPS',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="travel-log"
          options={{
            title: 'Travel Log',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="map.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Checklist',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="checkmark.circle.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="planned-trips"
          options={{
            title: 'Trips',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="list.bullet" color={color} />,
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            title: 'Achievements',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="trophy.fill" color={color} />,
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="calendar" color={color} />,
            tabBarButton: () => null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
          }}
        />
      </Tabs>
      <DrawerToggleButton />
    </AppDrawerProvider>
  );
});

TabLayout.displayName = 'TabLayout';

export default TabLayout;
