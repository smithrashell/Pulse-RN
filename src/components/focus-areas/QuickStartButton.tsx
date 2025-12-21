import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { FocusArea } from '../../db/schema';

interface QuickStartButtonProps {
  focusArea: FocusArea;
  onPress: () => void;
  isArea?: boolean;
  isExpanded?: boolean;
  isChild?: boolean;
}

export function QuickStartButton({
  focusArea,
  onPress,
  isArea = false,
  isExpanded = false,
  isChild = false,
}: QuickStartButtonProps) {
  const theme = useTheme();

  const backgroundColor = isArea
    ? theme.colors.secondaryContainer
    : isChild
      ? theme.colors.surfaceVariant
      : theme.colors.primaryContainer;

  const textColor = isArea
    ? theme.colors.onSecondaryContainer
    : isChild
      ? theme.colors.onSurfaceVariant
      : theme.colors.onPrimaryContainer;

  return (
    <Button
      mode="contained-tonal"
      onPress={onPress}
      style={[styles.button, { backgroundColor }, isChild && styles.childButton]}
      contentStyle={styles.buttonContent}
      labelStyle={[styles.label, { color: textColor }]}
    >
      <View style={styles.buttonInner}>
        <Text style={styles.icon}>{focusArea.icon}</Text>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1} ellipsizeMode="tail">
          {focusArea.name}
        </Text>
        {isArea && (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={textColor}
            style={styles.expandIcon}
          />
        )}
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 12,
  },
  childButton: {
    marginLeft: 24,
  },
  buttonContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 120,
  },
  label: {
    marginHorizontal: 0,
  },
  expandIcon: {
    marginLeft: 4,
  },
});

export default QuickStartButton;
