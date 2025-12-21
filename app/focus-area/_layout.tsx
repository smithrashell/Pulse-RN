import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function FocusAreaLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
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
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Focus Area',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Create Focus Area',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="create-area"
        options={{
          title: 'Create Area',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
