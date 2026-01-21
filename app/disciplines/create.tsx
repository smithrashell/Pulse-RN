import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  TextInput,
  RadioButton,
  Chip,
  Portal,
  Dialog,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { disciplineQueries } from '../../src/db/queries';
import { disciplineService } from '../../src/services';
import { DisciplineFrequency, Discipline } from '../../src/db/schema';
import { formatQuarter } from '../../src/utils/quarter';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const FREQUENCY_OPTIONS: { value: DisciplineFrequency; label: string; description: string }[] = [
  { value: 'DAILY', label: 'Daily', description: 'Every day' },
  { value: 'WEEKDAYS', label: 'Weekdays', description: 'Mon-Fri' },
  { value: 'WEEKENDS', label: 'Weekends', description: 'Sat-Sun' },
  { value: 'SPECIFIC_DAYS', label: 'Specific days', description: 'Choose days' },
  { value: 'ALWAYS', label: 'Always', description: 'Contextual practice' },
];

export default function CreateDisciplineScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<DisciplineFrequency>('DAILY');
  const [specificDays, setSpecificDays] = useState<string[]>([]);
  const [targetTime, setTargetTime] = useState('');
  const [flexibilityMinutes, setFlexibilityMinutes] = useState('15');

  const loadDiscipline = useCallback(async () => {
    if (!params.id) return;

    setIsLoading(true);
    try {
      const discipline = await disciplineQueries.getById(parseInt(params.id, 10));
      if (discipline) {
        setTitle(discipline.title);
        setDescription(discipline.description || '');
        setFrequency(discipline.frequency);
        if (discipline.specificDays) {
          try {
            setSpecificDays(JSON.parse(discipline.specificDays));
          } catch {
            setSpecificDays([]);
          }
        }
        setTargetTime(discipline.targetTime || '');
        setFlexibilityMinutes(String(discipline.flexibilityMinutes || 15));
      }
    } catch (error) {
      console.error('Error loading discipline:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      if (isEditing) {
        loadDiscipline();
      }
    }, [isEditing, loadDiscipline])
  );

  const toggleDay = (day: string) => {
    setSpecificDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async (skipWarning = false) => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for your discipline.');
      return;
    }

    if (frequency === 'SPECIFIC_DAYS' && specificDays.length === 0) {
      Alert.alert('Required', 'Please select at least one day.');
      return;
    }

    // Check limit warning for new disciplines
    if (!isEditing && !skipWarning) {
      const shouldWarn = await disciplineService.shouldWarnAboutLimit();
      if (shouldWarn) {
        setShowLimitWarning(true);
        return;
      }
    }

    setIsSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        specificDays: frequency === 'SPECIFIC_DAYS' ? JSON.stringify(specificDays) : undefined,
        targetTime: targetTime.trim() || undefined,
        flexibilityMinutes: targetTime.trim() ? parseInt(flexibilityMinutes, 10) : undefined,
        quarter: formatQuarter(new Date()),
        startedAt: new Date(),
      };

      if (isEditing && params.id) {
        await disciplineQueries.update(parseInt(params.id, 10), data);
      } else {
        await disciplineQueries.create(data);
      }

      router.back();
    } catch (error) {
      console.error('Error saving discipline:', error);
      Alert.alert('Error', 'Failed to save discipline.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 16 }}>
            {isEditing ? 'Edit Discipline' : 'New Discipline'}
          </Text>

          {/* Title */}
          <TextInput
            mode="outlined"
            label="What's your foundational practice?"
            placeholder="e.g., Wake up at 5 AM"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          {/* Description */}
          <TextInput
            mode="outlined"
            label="Why does this support your goals? (optional)"
            placeholder="e.g., Gives me 2 hours of focused work before the day starts"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          {/* Frequency */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Schedule
          </Text>
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <RadioButton.Group
                onValueChange={(value) => setFrequency(value as DisciplineFrequency)}
                value={frequency}
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <View key={option.value} style={styles.radioRow}>
                    <RadioButton value={option.value} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text variant="bodyMedium">{option.label}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </RadioButton.Group>
            </Card.Content>
          </Card>

          {/* Specific Days Selection */}
          {frequency === 'SPECIFIC_DAYS' && (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                  Select days
                </Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Chip
                      key={day.key}
                      mode={specificDays.includes(day.key) ? 'flat' : 'outlined'}
                      selected={specificDays.includes(day.key)}
                      onPress={() => toggleDay(day.key)}
                      style={[
                        styles.dayChip,
                        specificDays.includes(day.key) && {
                          backgroundColor: theme.colors.primaryContainer,
                        },
                      ]}
                      compact
                    >
                      {day.label}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Target Time (optional) */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Target Time (optional)
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            For time-based disciplines like "Wake up at 5 AM"
          </Text>
          <View style={styles.timeRow}>
            <TextInput
              mode="outlined"
              label="Time"
              placeholder="05:00"
              value={targetTime}
              onChangeText={setTargetTime}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              mode="outlined"
              label="Flexibility (±min)"
              placeholder="15"
              value={flexibilityMinutes}
              onChangeText={setFlexibilityMinutes}
              keyboardType="numeric"
              style={[styles.input, { width: 120, marginLeft: 12 }]}
            />
          </View>

          {/* Save Button */}
          <View style={styles.actions}>
            <Button mode="outlined" onPress={() => router.back()} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => handleSave()}
              loading={isSaving}
              style={{ flex: 1, marginLeft: 12 }}
            >
              {isEditing ? 'Save Changes' : 'Add Discipline'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Limit Warning Dialog */}
      <Portal>
        <Dialog visible={showLimitWarning} onDismiss={() => setShowLimitWarning(false)}>
          <Dialog.Icon icon="alert" />
          <Dialog.Title style={{ textAlign: 'center' }}>Focus Check</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
              You have 3 or more active disciplines.{'\n\n'}
              Adding more may dilute your focus. Consider graduating or retiring one before adding
              another.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLimitWarning(false)}>Review Current</Button>
            <Button onPress={() => { setShowLimitWarning(false); handleSave(true); }}>
              Add Anyway
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    marginRight: 0,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 24,
  },
});
