import { useEffect, useState, useRef } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { lightTheme, darkTheme } from '../src/theme';
import { initializeDatabase } from '../src/db/client';
import { useNotificationStore } from '../src/stores/notificationStore';
import { NOTIFICATION_TYPES } from '../src/services/notificationService';

// Check if running in Expo Go (notifications have limited support)
const isExpoGo = Constants.appOwnership === 'expo';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notificationResponseListener = useRef<{ remove: () => void } | null>(null);
  const initializeNotifications = useNotificationStore((state) => state.initialize);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await initializeNotifications();
        setIsReady(true);
      } catch (e) {
        console.error('Database init error:', e);
        const message = e instanceof Error ? e.message : 'Failed to initialize database';
        setError(message);
      }
    };
    init();
  }, [initializeNotifications]);

  // Handle notification taps for deep linking (skip in Expo Go)
  useEffect(() => {
    if (isExpoGo) return;

    const setupNotificationListener = async () => {
      try {
        const Notifications = await import('expo-notifications');
        notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            const type = data?.type as string | undefined;

            switch (type) {
              case NOTIFICATION_TYPES.MORNING_REMINDER:
                router.push('/daily-log?mode=morning');
                break;
              case NOTIFICATION_TYPES.EVENING_REMINDER:
                router.push('/daily-log?mode=evening');
                break;
              case NOTIFICATION_TYPES.WEEKLY_CHECKIN:
                router.push('/review/weekly');
                break;
              case NOTIFICATION_TYPES.MONTHLY_CHECKIN:
                router.push('/review/monthly');
                break;
              case NOTIFICATION_TYPES.RETURN_PROMPT:
                router.push('/(tabs)');
                break;
              default:
                router.push('/(tabs)');
            }
          }
        );
      } catch (e) {
        console.log('[Notifications] Failed to set up listener:', e);
      }
    };

    setupNotificationListener();

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>Error: {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.onBackground }}>Loading Pulse...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider style={{ backgroundColor: theme.colors.background }}>
        <PaperProvider theme={theme}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTintColor: theme.colors.onBackground,
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              contentStyle: {
                backgroundColor: theme.colors.background,
              },
              navigationBarColor: theme.colors.background,
              animation: 'none',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="weekly-intentions"
              options={{
                headerShown: true,
                title: 'Weekly Intentions',
              }}
            />
            <Stack.Screen
              name="monthly-outcomes"
              options={{
                headerShown: true,
                title: 'Monthly Outcomes',
              }}
            />
            <Stack.Screen
              name="daily-log"
              options={{
                headerShown: true,
                title: 'Daily Log',
              }}
            />
          </Stack>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
