import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { memo, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ColorProvider } from '@/components/color-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { ToastProvider } from '@/components/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dataReportsService } from '../services/data-reports';
import { navigationService } from '../services/navigation';
import { offlineCacheService } from '../services/offline-cache';
import { networkStatusService } from '../services/network-status';
import { bookingContextManager } from '../services/booking-context';
import { userOnboardingService } from '../services/user-onboarding';
import { bookingService } from '../services/booking';

// Make tabs the root of the app
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const RootLayout = memo(() => {
  const colorScheme = useColorScheme();

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await navigationService.initialize();
        await dataReportsService.initialize();
        await offlineCacheService.initialize();
        await networkStatusService.initialize();
        await bookingContextManager.initialize();
        await userOnboardingService.initialize();
        await bookingService.initialize();
      } catch (error) {
        console.warn('[RootLayout] Failed to initialize services:', error);
      }
    };
    
    initializeServices();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <ColorProvider>
              <ToastProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back', gestureEnabled: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                  <Stack.Screen name="report-data" options={{ presentation: 'modal', title: 'Report Missing Data' }} />
                  <Stack.Screen name="trip/[id]" options={{ title: 'Trip Details' }} />
                </Stack>
                <StatusBar style="auto" />
              </ToastProvider>
            </ColorProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
});

RootLayout.displayName = 'RootLayout';

export default RootLayout;
