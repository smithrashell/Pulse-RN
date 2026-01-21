import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  TextInput,
  ActivityIndicator,
  Divider,
  Chip,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { quarterlyGoalQueries, quarterlyReviewQueries } from '../../src/db/queries';
import { QuarterlyGoal, QuarterlyReview } from '../../src/db/schema';
import {
  formatQuarter,
  formatQuarterLabel,
  addQuarters,
} from '../../src/utils/quarter';

export default function QuarterlyReviewScreen() {
  const theme = useTheme();
  // Default to previous quarter for review
  const [currentQuarter, setCurrentQuarter] = useState(addQuarters(formatQuarter(new Date()), -1));

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Data state
  const [goals, setGoals] = useState<QuarterlyGoal[]>([]);
  const [existingReview, setExistingReview] = useState<QuarterlyReview | undefined>(undefined);

  // Form state
  const [biggestWin, setBiggestWin] = useState('');
  const [biggestChallenge, setBiggestChallenge] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [focusNextQuarter, setFocusNextQuarter] = useState('');

  const quarterLabel = formatQuarterLabel(currentQuarter);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const quarterlyGoals = await quarterlyGoalQueries.getForQuarter(currentQuarter);
      setGoals(quarterlyGoals);

      const review = await quarterlyReviewQueries.getForQuarter(currentQuarter);
      setExistingReview(review);
      if (review) {
        setBiggestWin(review.biggestWin || '');
        setBiggestChallenge(review.biggestChallenge || '');
        setLessonsLearned(review.lessonsLearned || '');
        setFocusNextQuarter(review.focusNextQuarter || '');
        setIsEditing(false);
      } else {
        setBiggestWin('');
        setBiggestChallenge('');
        setLessonsLearned('');
        setFocusNextQuarter('');
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading quarterly review data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentQuarter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const goToPreviousQuarter = () => setCurrentQuarter(addQuarters(currentQuarter, -1));
  const goToNextQuarter = () => setCurrentQuarter(addQuarters(currentQuarter, 1));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const completedCount = goals.filter((g) => g.status === 'COMPLETED').length;

      if (existingReview) {
        await quarterlyReviewQueries.update(existingReview.id, {
          biggestWin,
          biggestChallenge,
          lessonsLearned,
          focusNextQuarter,
          goalsCompleted: completedCount,
          goalsTotal: goals.length,
        });
      } else {
        await quarterlyReviewQueries.create({
          quarter: currentQuarter,
          biggestWin,
          biggestChallenge,
          lessonsLearned,
          focusNextQuarter,
          goalsCompleted: completedCount,
          goalsTotal: goals.length,
        });
      }

      setIsEditing(false);
      await loadData();
    } catch (error) {
      console.error('Error saving review:', error);
      Alert.alert('Error', 'Failed to save review');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if review has any content
  const hasReviewContent =
    existingReview?.biggestWin ||
    existingReview?.biggestChallenge ||
    existingReview?.lessonsLearned ||
    existingReview?.focusNextQuarter;

  const completedGoals = goals.filter((g) => g.status === 'COMPLETED').length;

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
              <IconButton icon="chevron-left" onPress={goToPreviousQuarter} />
              <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                {quarterLabel}
              </Text>
              <IconButton icon="chevron-right" onPress={goToNextQuarter} />
            </View>
            <Text variant="titleMedium" style={{ color: theme.colors.primary, textAlign: 'center' }}>
              Quarterly Review
            </Text>
          </View>

          {/* Goals Summary */}
          <Card style={styles.card} mode="outlined">
            <Card.Title
              title="Goals Summary"
              subtitle={`${completedGoals} of ${goals.length} goals completed`}
            />
            <Card.Content>
              {goals.map((goal) => (
                <View key={goal.id} style={styles.goalRow}>
                  <View style={styles.goalHeader}>
                    <Text variant="titleSmall" style={{ flex: 1 }}>
                      {goal.position}. {goal.title}
                    </Text>
                    <Chip
                      compact
                      style={{
                        backgroundColor:
                          goal.status === 'COMPLETED'
                            ? theme.colors.tertiaryContainer
                            : goal.status === 'IN_PROGRESS'
                              ? theme.colors.primaryContainer
                              : theme.colors.surfaceVariant,
                      }}
                    >
                      {goal.status.replace('_', ' ')}
                    </Chip>
                  </View>
                  {goal.description && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {goal.description}
                    </Text>
                  )}
                  <Divider style={{ marginVertical: 8 }} />
                </View>
              ))}
              {goals.length === 0 && (
                <Text style={{ fontStyle: 'italic', color: theme.colors.outline }}>
                  No goals were set for this quarter.
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
                    Biggest win this quarter?
                  </Text>
                  <Text variant="bodySmall" style={styles.helper}>
                    Celebrate your major achievement
                  </Text>
                  <TextInput
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    value={biggestWin}
                    onChangeText={setBiggestWin}
                    style={styles.input}
                    placeholder="e.g. Launched the new product..."
                  />

                  <Divider style={styles.divider} />

                  <Text variant="titleMedium" style={styles.question}>
                    Biggest challenge?
                  </Text>
                  <Text variant="bodySmall" style={styles.helper}>
                    What obstacle did you face?
                  </Text>
                  <TextInput
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    value={biggestChallenge}
                    onChangeText={setBiggestChallenge}
                    style={styles.input}
                    placeholder="e.g. Struggled with time management..."
                  />

                  <Divider style={styles.divider} />

                  <Text variant="titleMedium" style={styles.question}>
                    Lessons learned?
                  </Text>
                  <Text variant="bodySmall" style={styles.helper}>
                    What will you do differently?
                  </Text>
                  <TextInput
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    value={lessonsLearned}
                    onChangeText={setLessonsLearned}
                    style={styles.input}
                    placeholder="e.g. Need to break down goals into smaller steps..."
                  />

                  <Divider style={styles.divider} />

                  <Text variant="titleMedium" style={styles.question}>
                    Focus for next quarter?
                  </Text>
                  <Text variant="bodySmall" style={styles.helper}>
                    What's your main priority?
                  </Text>
                  <TextInput
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    value={focusNextQuarter}
                    onChangeText={setFocusNextQuarter}
                    style={styles.input}
                    placeholder="e.g. Double down on skill development..."
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
                  {existingReview?.biggestWin && (
                    <Card style={styles.card} mode="elevated">
                      <Card.Content>
                        <View style={styles.cardHeader}>
                          <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Biggest win
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
                          {existingReview.biggestWin}
                        </Text>
                      </Card.Content>
                    </Card>
                  )}

                  {existingReview?.biggestChallenge && (
                    <Card style={styles.card} mode="elevated">
                      <Card.Content>
                        <View style={styles.cardHeader}>
                          <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Biggest challenge
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
                          {existingReview.biggestChallenge}
                        </Text>
                      </Card.Content>
                    </Card>
                  )}

                  {existingReview?.lessonsLearned && (
                    <Card style={styles.card} mode="elevated">
                      <Card.Content>
                        <View style={styles.cardHeader}>
                          <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Lessons learned
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
                          {existingReview.lessonsLearned}
                        </Text>
                      </Card.Content>
                    </Card>
                  )}

                  {existingReview?.focusNextQuarter && (
                    <Card style={styles.card} mode="elevated">
                      <Card.Content>
                        <View style={styles.cardHeader}>
                          <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Focus for next quarter
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
                          {existingReview.focusNextQuarter}
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
                      No review recorded for this quarter.
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
  goalRow: {
    marginBottom: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
