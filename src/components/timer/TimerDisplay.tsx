import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface TimerDisplayProps {
  formattedTime: string;
  size?: 'small' | 'medium' | 'large';
}

export function TimerDisplay({ formattedTime, size = 'large' }: TimerDisplayProps) {
  const theme = useTheme();

  const fontSize = {
    small: 24,
    medium: 36,
    large: 56,
  }[size];

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.time,
          {
            fontSize,
            color: theme.colors.primary,
            fontVariant: ['tabular-nums'],
          },
        ]}
      >
        {formattedTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontWeight: '300',
    letterSpacing: 2,
  },
});

export default TimerDisplay;
