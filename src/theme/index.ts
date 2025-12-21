import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Pulse color palette
const colors = {
  // Primary (Blue - reliability & rhythm)
  pulseBlue80: '#B4C7E7',
  pulseBlue60: '#7BA3D9',
  pulseBlue40: '#4A7FC7',
  pulseBlue20: '#2E5A99',

  // Secondary (Orange - warm accents)
  pulseOrange80: '#FFD4B8',
  pulseOrange60: '#FFAB7A',
  pulseOrange40: '#FF8243',
  pulseOrange20: '#E65C1A',

  // Neutrals
  pulseGray95: '#F5F5F5',
  pulseGray90: '#E8E8E8',
  pulseGray80: '#CCCCCC',
  pulseGray60: '#999999',
  pulseGray40: '#666666',
  pulseGray20: '#333333',
  pulseGray10: '#1A1A1A',

  // Semantic
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',

  // Focus Area Type Colors
  skill: '#5C6BC0',
  habit: '#26A69A',
  project: '#FF7043',
  maintenance: '#78909C',
  area: '#7E57C2',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.pulseBlue40,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.pulseBlue80,
    onPrimaryContainer: colors.pulseBlue20,
    secondary: colors.pulseOrange40,
    onSecondary: '#FFFFFF',
    secondaryContainer: colors.pulseOrange80,
    onSecondaryContainer: colors.pulseOrange20,
    tertiary: colors.area,
    tertiaryContainer: '#EDE7F6',
    background: colors.pulseGray95,
    surface: '#FFFFFF',
    surfaceVariant: colors.pulseGray90,
    error: colors.error,
    onError: '#FFFFFF',
    errorContainer: '#FFEBEE',
    onErrorContainer: '#B71C1C',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.pulseBlue60,
    onPrimary: colors.pulseGray10,
    primaryContainer: colors.pulseBlue20,
    onPrimaryContainer: colors.pulseBlue80,
    secondary: colors.pulseOrange60,
    onSecondary: colors.pulseGray10,
    secondaryContainer: colors.pulseOrange20,
    onSecondaryContainer: colors.pulseOrange80,
    tertiary: '#B39DDB',
    tertiaryContainer: '#4527A0',
    background: colors.pulseGray10,
    surface: colors.pulseGray20,
    surfaceVariant: colors.pulseGray40,
    error: '#EF5350',
    onError: colors.pulseGray10,
    errorContainer: '#B71C1C',
    onErrorContainer: '#FFCDD2',
  },
};

export const focusAreaTypeColors = {
  SKILL: colors.skill,
  HABIT: colors.habit,
  PROJECT: colors.project,
  MAINTENANCE: colors.maintenance,
  AREA: colors.area,
};

export const engagementColors = {
  ACTIVE: colors.pulseBlue40,
  SLIPPING: colors.pulseOrange40,
  DORMANT: colors.area,
  RESET: colors.error,
};

export { colors };
