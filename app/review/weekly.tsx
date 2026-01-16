import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  TextInput,
  ActivityIndicator,
  ProgressBar,
  Divider,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { format, startOfWeek, subWeeks, addWeeks, getISOWeek, getYear } from 'date-fns';
import { weeklyIntentionQueries, weeklyReviewQueries } from '../../src/db/queries';
import { WeeklyIntention, WeeklyReview } from '../../src/db/schema';
import { checkInService } from '../../src/services';

export default function WeeklyReviewScreen() {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(subWeeks(new Date(), 1));

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Data state
  const [intentions, setIntentions] = useState<WeeklyIntention[]>([]);
  const [existingReview, setExistingReview] = useState<WeeklyReview | undefined>(undefined);

  // Form state
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [tryNextWeek, setTryNextWeek] = useState('');

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekLabel = `Week of ${format(weekStart, 'MMM d')}`;
  const weekString = `${getYear(currentDate)}-W${getISOWeek(currentDate).toString().padStart(2, '0')}`;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const weeklyIntentions = await weeklyIntentionQueries.getForWeek(currentDate);
      setIntentions(weeklyIntentions);

      const review = await weeklyReviewQueries.getForWeek(weekString);
      setExistingReview(review);
      if (review) {
        setWhatWorked(review.whatWorked || '');
        setWhatDidntWork(review.whatDidntWork || '');
        setTryNextWeek(review.tryNextWeek || '');
        setIsEditing(false);
      } else {
        setWhatWorked('');
        setWhatDidntWork('');
        setTryNextWeek('');
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading weekly review data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, weekString]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (existingReview) {
        await weeklyReviewQueries.update(existingReview.id, {
          whatWorked,
          whatDidntWork,
          tryNextWeek,
        });
      } else {
        await weeklyReviewQueries.create({
          week: weekString,
          whatWorked,
          whatDidntWork,
          tryNextWeek,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await checkInService.completeWeeklyCheckIn();
      setIsEditing(false);
      await loadData();
    } catch (error) {
      console.error('Error saving review:', error);
      Alert.alert('Error', 'Failed to save review');
    } finally {
      setIsSaving(false);
    }
  };

  const completedIntentions = intentions.filter((i) => i.isCompleted).length;
  const progress = intentions.length > 0 ? completedIntentions / intentions.length : 0;

  // Check if review has any content
  const hasReviewContent =
    existingReview?.whatWorked || existingReview?.whatDidntWork || existingReview?.tryNextWeek;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header with Navigation */}
        <View style={styles.header}>
          <View style={styles.periodNav}>
            <IconButton icon="chevron-left" onPress={goToPreviousWeek} />
            <Text variant="titleLarge" style={{ fontWeight: '600' }}>
              {weekLabel}
            </Text>
            <IconButton icon="chevron-right" onPress={goToNextWeek} />
          </View>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, textAlign: 'center' }}>
            Weekly Review
          </Text>
        </View>

        {/* Intentions Review */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="Intentions Reality Check" />
          <Card.Content>
            <View style={styles.progressRow}>
              <Text variant="bodyMedium">
                {completedIntentions} of {intentions.length} completed
              </Text>
              <ProgressBar progress={progress} style={styles.progressBar} />
            </View>
            {intentions.map((intention) => (
              <View key={intention.id} style={styles.intentionRow}>
                <Text
                  style={{
                    color: intention.isCompleted
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                  }}
                >
                  {intention.isCompleted ? '✓' : '○'}
                </Text>
                <Text
                  style={[
                    styles.intentionText,
                    intention.isCompleted && {
                      textDecorationLine: 'line-through',
                      color: theme.colors.outline,
                    },
                  ]}
                >
                  {intention.title}
                </Text>
              </View>
            ))}
            {intentions.length === 0 && (
              <Text style={{ fontStyle: 'italic', color: theme.colors.outline }}>
                No intentions were set for this week.
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Reflection Section */}
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Reflection
        </Text>

        {isEditing ? (
          /* Edit Mode - Show form */
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.question}>
                  What worked well?
                </Text>
                <Text variant="bodySmall" style={styles.helper}>
                  Wins, patterns, and good decisions
                </Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  value={whatWorked}
                  onChangeText={setWhatWorked}
                  style={styles.input}
                  placeholder="e.g. Batching calls in the morning..."
                />

                <Divider style={styles.divider} />

                <Text variant="titleMedium" style={styles.question}>
                  What got in the way?
                </Text>
                <Text variant="bodySmall" style={styles.helper}>
                  Distractions, energy dips, or blocks
                </Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  value={whatDidntWork}
                  onChangeText={setWhatDidntWork}
                  style={styles.input}
                  placeholder="e.g. Too many meetings on Tuesday..."
                />

                <Divider style={styles.divider} />

                <Text variant="titleMedium" style={styles.question}>
                  One thing to try next week?
                </Text>
                <Text variant="bodySmall" style={styles.helper}>
                  A small experiment to improve
                </Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  value={tryNextWeek}
                  onChangeText={setTryNextWeek}
                  style={styles.input}
                  placeholder="e.g. No phone before 9am..."
                />
              </Card.Content>
            </Card>

            <View style={styles.actions}>
              {existingReview && (
                <Button mode="outlined" onPress={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
              <Button mode="contained" onPress={handleSave} loading={isSaving}>
                {existingReview ? 'Save Changes' : 'Complete Review'}
              </Button>
            </View>
          </>
        ) : (
          /* View Mode - Show readable text */
          <>
            {hasReviewContent ? (
              <>
                {existingReview?.whatWorked && (
                  <Card style={styles.card} mode="elevated">
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          What worked well?
                        </Text>
                        <IconButton
                          icon="pencil"
                          size={18}
                          iconColor={theme.colors.primary}
                          onPress={() => setIsEditing(true)}
                          style={{ margin: 0 }}
                        />
                      </View>
                      <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                        {existingReview.whatWorked}
                      </Text>
                    </Card.Content>
                  </Card>
                )}

                {existingReview?.whatDidntWork && (
                  <Card style={styles.card} mode="elevated">
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          What got in the way?
                        </Text>
                        <IconButton
                          icon="pencil"
                          size={18}
                          iconColor={theme.colors.primary}
                          onPress={() => setIsEditing(true)}
                          style={{ margin: 0 }}
                        />
                      </View>
                      <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                        {existingReview.whatDidntWork}
                      </Text>
                    </Card.Content>
                  </Card>
                )}

                {existingReview?.tryNextWeek && (
                  <Card style={styles.card} mode="elevated">
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Trying next week
                        </Text>
                        <IconButton
                          icon="pencil"
                          size={18}
                          iconColor={theme.colors.primary}
                          onPress={() => setIsEditing(true)}
                          style={{ margin: 0 }}
                        />
                      </View>
                      <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                        {existingReview.tryNextWeek}
                      </Text>
                    </Card.Content>
                  </Card>
                )}
              </>
            ) : (
              <Card style={styles.card} mode="outlined">
                <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
                  >
                    No review recorded for this week.
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => setIsEditing(true)}
                    style={{ marginTop: 16 }}
                  >
                    Add Review
                  </Button>
                </Card.Content>
              </Card>
            )}
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  progressRow: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  intentionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  intentionText: {
    flex: 1,
  },
  question: {
    fontWeight: '600',
    marginBottom: 4,
  },
  helper: {
    marginBottom: 8,
    color: '#666',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  divider: {
    marginVertical: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
});
