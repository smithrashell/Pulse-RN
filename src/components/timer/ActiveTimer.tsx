import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Card,
  Text,
  Button,
  useTheme,
  IconButton,
  TextInput,
  Portal,
  Modal,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { TimerDisplay } from './TimerDisplay';
import { FocusArea } from '../../db/schema';

interface ActiveTimerProps {
  focusArea: FocusArea | null;
  formattedTime: string;
  onStop: (note?: string, qualityRating?: number) => void;
}

export function ActiveTimer({ focusArea, formattedTime, onStop }: ActiveTimerProps) {
  const theme = useTheme();
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  const handleStop = () => {
    setShowStopDialog(true);
  };

  const handleConfirmStop = () => {
    onStop(note || undefined, rating || undefined);
    setShowStopDialog(false);
    setNote('');
    setRating(null);
  };

  const handleQuickStop = () => {
    onStop();
  };

  return (
    <>
      <Card
        style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
        mode="elevated"
      >
        <Card.Content style={styles.content}>
          {/* Focus area label */}
          <View style={styles.labelRow}>
            {focusArea ? (
              <>
                <Text style={styles.icon}>{focusArea.icon}</Text>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onPrimaryContainer }}
                  numberOfLines={1}
                >
                  {focusArea.name}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="timer-outline" size={20} color={theme.colors.onPrimaryContainer} />
                <Text
                  variant="titleMedium"
                  style={[styles.labelText, { color: theme.colors.onPrimaryContainer }]}
                >
                  Quick Timer
                </Text>
              </>
            )}
          </View>

          {/* Timer display */}
          <TimerDisplay formattedTime={formattedTime} size="large" />

          {/* Stop button */}
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={handleQuickStop}
              style={[styles.stopButton, { backgroundColor: theme.colors.error }]}
              labelStyle={{ color: theme.colors.onError }}
              icon={() => <Ionicons name="stop" size={18} color={theme.colors.onError} />}
            >
              Stop
            </Button>
            <IconButton
              icon={() => (
                <Ionicons name="create-outline" size={20} color={theme.colors.onPrimaryContainer} />
              )}
              onPress={handleStop}
              style={styles.noteButton}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Stop with note dialog */}
      <Portal>
        <Modal
          visible={showStopDialog}
          onDismiss={() => setShowStopDialog(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
            Stop Session
          </Text>

          {/* Quality rating */}
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
          >
            How was this session?
          </Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <IconButton
                key={value}
                icon={() => (
                  <Ionicons
                    name={rating && rating >= value ? 'star' : 'star-outline'}
                    size={28}
                    color={rating && rating >= value ? theme.colors.primary : theme.colors.outline}
                  />
                )}
                onPress={() => setRating(value)}
              />
            ))}
          </View>

          {/* Note input */}
          <TextInput
            mode="outlined"
            label="Add a note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            style={styles.noteInput}
          />

          {/* Buttons */}
          <View style={styles.dialogButtons}>
            <Button onPress={() => setShowStopDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleConfirmStop}>
              Stop Session
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  labelText: {
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  stopButton: {
    paddingHorizontal: 24,
  },
  noteButton: {
    margin: 0,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noteInput: {
    marginBottom: 16,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

export default ActiveTimer;
