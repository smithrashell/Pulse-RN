import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  FAB,
  IconButton,
  Checkbox,
  useTheme,
  ProgressBar,
  Portal,
  Modal,
  TextInput,
  Button,
  Menu,
  TouchableRipple,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, addWeeks, subWeeks, getISOWeek, getYear } from 'date-fns';
import { weeklyIntentionQueries, monthlyOutcomeQueries } from '../src/db/queries';
import { WeeklyIntention, MonthlyOutcome } from '../src/db/schema';

export default function WeeklyIntentionsScreen() {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [intentions, setIntentions] = useState<WeeklyIntention[]>([]);
  const [monthlyOutcomes, setMonthlyOutcomes] = useState<MonthlyOutcome[]>([]);
  const [_isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingIntention, setEditingIntention] = useState<WeeklyIntention | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);
  const [outcomeMenuVisible, setOutcomeMenuVisible] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekLabel = `Week of ${format(weekStart, 'MMM d')}`;
  const weekString = `${getYear(currentDate)}-W${getISOWeek(currentDate).toString().padStart(2, '0')}`;

  const completedCount = intentions.filter((i) => i.isCompleted).length;
  const progress = intentions.length > 0 ? completedCount / intentions.length : 0;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedIntentions = await weeklyIntentionQueries.getForWeek(currentDate);
      setIntentions(loadedIntentions);

      // Load monthly outcomes for linking
      const outcomes = await monthlyOutcomeQueries.getForMonth(currentDate);
      setMonthlyOutcomes(outcomes);
    } catch (error) {
      console.error('Error loading intentions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openAddDialog = () => {
    setEditingIntention(null);
    setTitle('');
    setNotes('');
    setSelectedOutcomeId(null);
    setDialogVisible(true);
  };

  const openEditDialog = (intention: WeeklyIntention) => {
    setEditingIntention(intention);
    setTitle(intention.title);
    setNotes(intention.notes || '');
    setSelectedOutcomeId(intention.monthlyOutcomeId);
    setDialogVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      if (editingIntention) {
        await weeklyIntentionQueries.update(editingIntention.id, {
          title: title.trim(),
          notes: notes.trim() || undefined,
          monthlyOutcomeId: selectedOutcomeId,
        });
      } else {
        await weeklyIntentionQueries.create({
          week: weekString,
          title: title.trim(),
          notes: notes.trim() || undefined,
          monthlyOutcomeId: selectedOutcomeId,
          isCompleted: false,
        });
      }
      setDialogVisible(false);
      loadData();
    } catch (error) {
      console.error('Error saving intention:', error);
    }
  };

  const handleToggle = async (intention: WeeklyIntention) => {
    try {
      await weeklyIntentionQueries.toggleCompletion(intention.id);
      loadData();
    } catch (error) {
      console.error('Error toggling intention:', error);
    }
  };

  const handleDelete = (intention: WeeklyIntention) => {
    Alert.alert('Delete Intention', 'Are you sure you want to delete this intention?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await weeklyIntentionQueries.delete(intention.id);
          loadData();
        },
      },
    ]);
  };

  const selectedOutcome = monthlyOutcomes.find((o) => o.id === selectedOutcomeId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Period Navigation */}
        <View style={styles.periodNav}>
          <IconButton
            icon="chevron-left"
            onPress={() => setCurrentDate(subWeeks(currentDate, 1))}
          />
          <Text variant="titleMedium">{weekLabel}</Text>
          <IconButton
            icon="chevron-right"
            onPress={() => setCurrentDate(addWeeks(currentDate, 1))}
          />
        </View>

        {/* Progress Summary */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.progressRow}>
              <Text variant="bodyMedium">
                {completedCount} of {intentions.length} completed
              </Text>
            </View>
            <ProgressBar progress={progress} style={styles.progressBar} />
          </Card.Content>
        </Card>

        {/* Monthly Link */}
        <Card
          style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
          onPress={() => router.push('/monthly-outcomes')}
        >
          <Card.Content>
            <View style={styles.linkRow}>
              <View>
                <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  Monthly Outcomes
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  Link intentions to bigger goals
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.onPrimaryContainer} />
            </View>
          </Card.Content>
        </Card>

        {/* Intentions List */}
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Intentions
        </Text>

        {intentions.length === 0 ? (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.emptyContent}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.outline} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No intentions set for this week
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Tap + to add your first intention
              </Text>
            </Card.Content>
          </Card>
        ) : (
          intentions.map((intention) => {
            const linkedOutcome = monthlyOutcomes.find((o) => o.id === intention.monthlyOutcomeId);
            return (
              <Card key={intention.id} style={styles.card} mode="outlined">
                <TouchableRipple onPress={() => handleToggle(intention)}>
                  <Card.Content style={styles.intentionContent}>
                    <Checkbox
                      status={intention.isCompleted ? 'checked' : 'unchecked'}
                      onPress={() => handleToggle(intention)}
                    />
                    <View style={styles.intentionText}>
                      <Text
                        variant="bodyLarge"
                        style={[
                          intention.isCompleted && {
                            textDecorationLine: 'line-through',
                            color: theme.colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {intention.title}
                      </Text>
                      {linkedOutcome && (
                        <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                          Links to: {linkedOutcome.title}
                        </Text>
                      )}
                      {intention.notes && (
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                          numberOfLines={2}
                        >
                          {intention.notes}
                        </Text>
                      )}
                    </View>
                    <View style={styles.intentionActions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() => openEditDialog(intention)}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={theme.colors.error}
                        onPress={() => handleDelete(intention)}
                      />
                    </View>
                  </Card.Content>
                </TouchableRipple>
              </Card>
            );
          })
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={openAddDialog}
      />

      {/* Add/Edit Dialog */}
      <Portal>
        <Modal
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>
            {editingIntention ? 'Edit Intention' : 'New Intention'}
          </Text>

          <TextInput
            mode="outlined"
            label="What do you intend to accomplish?"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            style={styles.input}
          />

          {monthlyOutcomes.length > 0 && (
            <>
              <Text variant="labelMedium" style={{ marginTop: 8, marginBottom: 4 }}>
                Link to Monthly Outcome (optional)
              </Text>
              <Menu
                visible={outcomeMenuVisible}
                onDismiss={() => setOutcomeMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setOutcomeMenuVisible(true)}
                    contentStyle={{ justifyContent: 'flex-start' }}
                  >
                    {selectedOutcome ? selectedOutcome.title : 'No outcome linked'}
                  </Button>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedOutcomeId(null);
                    setOutcomeMenuVisible(false);
                  }}
                  title="No outcome linked"
                />
                <Divider />
                {monthlyOutcomes.map((outcome) => (
                  <Menu.Item
                    key={outcome.id}
                    onPress={() => {
                      setSelectedOutcomeId(outcome.id);
                      setOutcomeMenuVisible(false);
                    }}
                    title={outcome.title}
                  />
                ))}
              </Menu>
            </>
          )}

          <View style={styles.dialogActions}>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} disabled={!title.trim()}>
              Save
            </Button>
          </View>
        </Modal>
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
    paddingBottom: 80,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  progressRow: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  intentionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  intentionText: {
    flex: 1,
    paddingTop: 8,
    gap: 4,
  },
  intentionActions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  input: {
    marginBottom: 12,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
