import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  IconButton,
  useTheme,
  TextInput,
  Button,
  TouchableRipple,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, isToday, isFuture } from 'date-fns';
import { dailyLogQueries } from '../src/db/queries';
import { DailyLog } from '../src/db/schema';

const FEELING_VALUES = ['1', '2', '3', '4', '5'];

export default function DailyLogScreen() {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [log, setLog] = useState<DailyLog | null>(null);
  const [_isLoading, setIsLoading] = useState(true);

  // Form state
  const [morningIntention, setMorningIntention] = useState('');
  const [proofCommitment, setProofCommitment] = useState('');
  const [eveningReflection, setEveningReflection] = useState('');
  const [feelingRating, setFeelingRating] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const dateLabel = isToday(currentDate) ? 'Today' : format(currentDate, 'EEEE, MMM d');

  const loadLog = useCallback(async () => {
    setIsLoading(true);
    try {
      const existing = await dailyLogQueries.getForDate(currentDate);
      setLog(existing || null);

      // Populate form
      setMorningIntention(existing?.morningIntention || '');
      setProofCommitment(existing?.proofCommitment || '');
      setEveningReflection(existing?.eveningReflection || '');
      setFeelingRating(existing?.feelingRating?.toString() || '');
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading daily log:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useFocusEffect(
    useCallback(() => {
      loadLog();
    }, [loadLog])
  );

  // Track changes
  useEffect(() => {
    if (log) {
      const changed =
        morningIntention !== (log.morningIntention || '') ||
        proofCommitment !== (log.proofCommitment || '') ||
        eveningReflection !== (log.eveningReflection || '') ||
        feelingRating !== (log.feelingRating?.toString() || '');
      setHasChanges(changed);
    } else {
      // No existing log - any input is a change
      setHasChanges(
        morningIntention.length > 0 ||
          proofCommitment.length > 0 ||
          eveningReflection.length > 0 ||
          feelingRating.length > 0
      );
    }
  }, [morningIntention, proofCommitment, eveningReflection, feelingRating, log]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await dailyLogQueries.upsert({
        date: format(currentDate, 'yyyy-MM-dd'),
        morningIntention: morningIntention.trim() || null,
        proofCommitment: proofCommitment.trim() || null,
        eveningReflection: eveningReflection.trim() || null,
        feelingRating: feelingRating ? parseInt(feelingRating, 10) : null,
      });
      setHasChanges(false);
      // Reload to get updated data
      loadLog();
    } catch (error) {
      console.error('Error saving daily log:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canGoForward = !isToday(currentDate) && !isFuture(addDays(currentDate, 1));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <IconButton icon="chevron-left" onPress={() => setCurrentDate(subDays(currentDate, 1))} />
          <View style={styles.dateLabel}>
            <Text variant="titleMedium">{dateLabel}</Text>
            {!isToday(currentDate) && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {format(currentDate, 'MMM d, yyyy')}
              </Text>
            )}
          </View>
          <IconButton
            icon="chevron-right"
            onPress={() => setCurrentDate(addDays(currentDate, 1))}
            disabled={!canGoForward}
          />
        </View>

        {/* Morning Section */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Ionicons name="sunny-outline" size={24} color={theme.colors.primary} />
              <Text variant="titleMedium" style={{ marginLeft: 8 }}>
                Morning Check-in
              </Text>
            </View>

            <TextInput
              label="What's your intention for today?"
              value={morningIntention}
              onChangeText={setMorningIntention}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="What do you want to accomplish or focus on?"
            />

            <TextInput
              label="Proof of commitment"
              value={proofCommitment}
              onChangeText={setProofCommitment}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
              placeholder="How will you know you committed to this?"
            />
          </Card.Content>
        </Card>

        {/* Evening Section */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Ionicons name="moon-outline" size={24} color={theme.colors.secondary} />
              <Text variant="titleMedium" style={{ marginLeft: 8 }}>
                Evening Reflection
              </Text>
            </View>

            <TextInput
              label="How did today go?"
              value={eveningReflection}
              onChangeText={setEveningReflection}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="What went well? What could improve?"
            />

            <Text variant="labelMedium" style={styles.ratingLabel}>
              How are you feeling? (1-5)
            </Text>
            <View
              style={[
                styles.segmentedControl,
                { borderColor: theme.colors.outline, backgroundColor: 'transparent' },
              ]}
            >
              {FEELING_VALUES.map((value, index) => {
                const isSelected = feelingRating === value;
                const isFirst = index === 0;
                const isLast = index === FEELING_VALUES.length - 1;
                return (
                  <TouchableRipple
                    key={value}
                    onPress={() => setFeelingRating(value)}
                    style={[
                      styles.segmentButton,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                        borderLeftWidth: isFirst ? 0 : 1,
                        borderColor: theme.colors.outline,
                        borderTopLeftRadius: isFirst ? 20 : 0,
                        borderBottomLeftRadius: isFirst ? 20 : 0,
                        borderTopRightRadius: isLast ? 20 : 0,
                        borderBottomRightRadius: isLast ? 20 : 0,
                      },
                    ]}
                  >
                    <Text
                      variant="labelLarge"
                      style={{
                        color: isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                        fontWeight: isSelected ? '600' : '400',
                      }}
                    >
                      {value}
                    </Text>
                  </TouchableRipple>
                );
              })}
            </View>
            <View style={styles.ratingHints}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Struggling
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Thriving
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Save Button */}
        {hasChanges && (
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
          >
            Save
          </Button>
        )}

        {/* Quick Nav to Today */}
        {!isToday(currentDate) && (
          <Button mode="text" onPress={() => setCurrentDate(new Date())} style={styles.todayButton}>
            Go to Today
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dateLabel: {
    alignItems: 'center',
    minWidth: 150,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  ratingLabel: {
    marginTop: 8,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  saveButton: {
    marginTop: 8,
  },
  todayButton: {
    marginTop: 8,
  },
});
