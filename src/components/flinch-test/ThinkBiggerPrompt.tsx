import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, useTheme, Portal, Modal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface ThinkBiggerPromptProps {
  originalGoal: string;
  visible: boolean;
  onUseStretch: (stretchedGoal: string) => void;
  onKeepOriginal: () => void;
  onDismiss?: () => void;
}

export function ThinkBiggerPrompt({
  originalGoal,
  visible,
  onUseStretch,
  onKeepOriginal,
  onDismiss,
}: ThinkBiggerPromptProps) {
  const theme = useTheme();
  const [stretchGoal, setStretchGoal] = useState('');

  const handleUseStretch = () => {
    if (stretchGoal.trim()) {
      onUseStretch(stretchGoal.trim());
      setStretchGoal('');
    }
  };

  const handleKeepOriginal = () => {
    setStretchGoal('');
    onKeepOriginal();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <Ionicons name="flame" size={32} color={theme.colors.error} />
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            Think Bigger
          </Text>
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.quote, { color: theme.colors.onSurfaceVariant }]}
        >
          "Your goals should scare you. If they don't, they're not big enough."
        </Text>

        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
          What would the stretch version be?
        </Text>

        <TextInput
          mode="outlined"
          value={stretchGoal}
          onChangeText={setStretchGoal}
          placeholder={`e.g., Double: "${originalGoal}"`}
          style={styles.input}
          multiline
          numberOfLines={2}
        />

        <Text
          variant="bodySmall"
          style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
        >
          Think: What would make this goal actually challenging?
        </Text>

        <View style={styles.actions}>
          <Button
            mode="text"
            onPress={handleKeepOriginal}
            style={styles.keepButton}
          >
            Keep Original
          </Button>
          <Button
            mode="contained"
            onPress={handleUseStretch}
            disabled={!stretchGoal.trim()}
            style={styles.stretchButton}
          >
            Use Stretch Goal
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    marginTop: 12,
    fontWeight: '600',
  },
  quote: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  hint: {
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  keepButton: {},
  stretchButton: {},
});
