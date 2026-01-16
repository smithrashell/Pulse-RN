import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
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
  liveNote: string;
  onNoteChange: (note: string) => void;
  onStop: (note?: string, qualityRating?: number) => void;
}

export function ActiveTimer({ focusArea, formattedTime, liveNote, onNoteChange, onStop }: ActiveTimerProps) {
  const theme = useTheme();
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  const handleStop = () => {
    setShowStopDialog(true);
  };

  const handleConfirmStop = () => {
    onStop(liveNote || undefined, rating || undefined);
    setShowStopDialog(false);
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

          {/* Live note section */}
          {showNoteInput ? (
            <View style={styles.noteSection}>
              <TextInput
                mode="outlined"
                placeholder="What are you working on?"
                value={liveNote}
                onChangeText={onNoteChange}
                multiline
                numberOfLines={2}
                style={styles.liveNoteInput}
                dense
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
              <Button
                mode="text"
                compact
                onPress={() => setShowNoteInput(false)}
                textColor={theme.colors.onPrimaryContainer}
                style={styles.doneButton}
              >
                Done
              </Button>
            </View>
          ) : liveNote ? (
            <View style={styles.noteDisplaySection}>
              <Text
                variant="bodyMedium"
                style={[styles.noteText, { color: theme.colors.onPrimaryContainer }]}
                numberOfLines={2}
              >
                {liveNote}
              </Text>
              <Button
                mode="text"
                compact
                onPress={() => setShowNoteInput(true)}
                icon={() => (
                  <Ionicons name="create-outline" size={14} color={theme.colors.onPrimaryContainer} />
                )}
                textColor={theme.colors.onPrimaryContainer}
                style={styles.editNoteButton}
              >
                Edit
              </Button>
            </View>
          ) : (
            <Button
              mode="text"
              compact
              onPress={() => setShowNoteInput(true)}
              icon={() => (
                <Ionicons name="add-circle-outline" size={16} color={theme.colors.onPrimaryContainer} />
              )}
              textColor={theme.colors.onPrimaryContainer}
              style={styles.addNoteButton}
            >
              Add note
            </Button>
          )}

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
                <Ionicons name="star-outline" size={20} color={theme.colors.onPrimaryContainer} />
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollContent}
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
              label="Session notes"
              value={liveNote}
              onChangeText={onNoteChange}
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
          </ScrollView>
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
  noteSection: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
  },
  liveNoteInput: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  doneButton: {
    marginTop: 4,
  },
  noteDisplaySection: {
    marginTop: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  noteText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  editNoteButton: {
    marginTop: 4,
  },
  addNoteButton: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
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
    maxHeight: '80%',
  },
  modalScrollContent: {
    paddingBottom: 20,
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
