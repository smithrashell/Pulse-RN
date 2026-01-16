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
import { format, subMonths, addMonths } from 'date-fns';
import { monthlyOutcomeQueries, monthlyReviewQueries } from '../../src/db/queries';
import { MonthlyOutcome, MonthlyReview } from '../../src/db/schema';
import { checkInService } from '../../src/services';

export default function MonthlyReviewScreen() {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(subMonths(new Date(), 1));

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Data state
  const [outcomes, setOutcomes] = useState<MonthlyOutcome[]>([]);
  const [existingReview, setExistingReview] = useState<MonthlyReview | undefined>(undefined);

  // Form state
  const [biggestWin, setBiggestWin] = useState('');
  const [carryForward, setCarryForward] = useState('');

  const monthString = format(currentDate, 'yyyy-MM');
  const monthLabel = format(currentDate, 'MMMM yyyy');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthlyOutcomes = await monthlyOutcomeQueries.getForMonth(currentDate);
      setOutcomes(monthlyOutcomes);

      const review = await monthlyReviewQueries.getForMonth(monthString);
      setExistingReview(review);
      if (review) {
        setBiggestWin(review.biggestWin || '');
        setCarryForward(review.carryForward || '');
        setIsEditing(false);
      } else {
        setBiggestWin('');
        setCarryForward('');
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading monthly review data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, monthString]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (existingReview) {
        await monthlyReviewQueries.update(existingReview.id, {
          biggestWin,
          carryForward,
        });
      } else {
        await monthlyReviewQueries.create({
          month: monthString,
          biggestWin,
          carryForward,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await checkInService.completeMonthlyCheckIn();
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
  const hasReviewContent = existingReview?.biggestWin || existingReview?.carryForward;

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
            <IconButton icon="chevron-left" onPress={goToPreviousMonth} />
            <Text variant="titleLarge" style={{ fontWeight: '600' }}>
              {monthLabel}
            </Text>
            <IconButton icon="chevron-right" onPress={goToNextMonth} />
          </View>
          <Text variant="titleMedium" style={{ color: theme.colors.primary, textAlign: 'center' }}>
            Monthly Review
          </Text>
        </View>

        {/* Outcomes Review */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="Outcomes Review" />
          <Card.Content>
            {outcomes.map((outcome) => (
              <View key={outcome.id} style={styles.outcomeRow}>
                <View style={styles.outcomeHeader}>
                  <Text variant="titleSmall" style={{ flex: 1 }}>
                    {outcome.title}
                  </Text>
                  <Chip compact style={{ backgroundColor: theme.colors.secondaryContainer }}>
                    {outcome.status.replace('_', ' ')}
                  </Chip>
                </View>
                {outcome.notes && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {outcome.notes}
                  </Text>
                )}
                <Divider style={{ marginVertical: 8 }} />
              </View>
            ))}
            {outcomes.length === 0 && (
              <Text style={{ fontStyle: 'italic', color: theme.colors.outline }}>
                No outcomes were set for this month.
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
                  Biggest win this month?
                </Text>
                <Text variant="bodySmall" style={styles.helper}>
                  Celebrate your progress
                </Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  value={biggestWin}
                  onChangeText={setBiggestWin}
                  style={styles.input}
                  placeholder="e.g. Finally shipped the MVP..."
                />

                <Divider style={styles.divider} />

                <Text variant="titleMedium" style={styles.question}>
                  What to carry forward?
                </Text>
                <Text variant="bodySmall" style={styles.helper}>
                  Habits or intentions for next month
                </Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  value={carryForward}
                  onChangeText={setCarryForward}
                  style={styles.input}
                  placeholder="e.g. Continue the morning routine..."
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

                {existingReview?.carryForward && (
                  <Card style={styles.card} mode="elevated">
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Carrying forward
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
                        {existingReview.carryForward}
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
                    No review recorded for this month.
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
  outcomeRow: {
    marginBottom: 8,
  },
  outcomeHeader: {
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
