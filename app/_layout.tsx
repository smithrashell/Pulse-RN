import { useEffect, useState } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { lightTheme, darkTheme } from '../src/theme';
import { initializeDatabase } from '../src/db/client';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        setIsReady(true);
      } catch (e) {
        console.error('Database init error:', e);
        const message = e instanceof Error ? e.message : 'Failed to initialize database';
        setError(message);
      }
    };
    init();
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
