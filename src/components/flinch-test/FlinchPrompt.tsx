import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme, Card, Portal, Modal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface FlinchPromptProps {
  goalText: string;
  visible: boolean;
  onScary: () => void; // User says it's scary - proceed
  onSafe: () => void; // User says it's safe - show stretch
  onDismiss?: () => void;
}

export function FlinchPrompt({
  goalText,
  visible,
  onScary,
  onSafe,
  onDismiss,
}: FlinchPromptProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.header}>
          <Ionicons name="fitness-outline" size={32} color={theme.colors.primary} />
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            The Flinch Test
          </Text>
        </View>

        <Card style={[styles.goalCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              You wrote:
            </Text>
            <Text variant="bodyLarge" style={{ fontWeight: '600', marginTop: 4 }}>
              "{goalText}"
            </Text>
          </Card.Content>
        </Card>

        <Text variant="bodyLarge" style={[styles.question, { color: theme.colors.onSurface }]}>
          Does this goal scare you a little?
        </Text>

        <Text
          variant="bodySmall"
          style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
        >
          Your goals should make you uncomfortable. That's how you grow.
        </Text>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onSafe}
            style={styles.button}
          >
            No, it's safe
          </Button>
          <Button
            mode="contained"
            onPress={onScary}
            style={styles.button}
          >
            Yes, it's a stretch
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
    marginBottom: 20,
  },
  title: {
    marginTop: 12,
    fontWeight: '600',
  },
  goalCard: {
    marginBottom: 20,
  },
  question: {
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  hint: {
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});
