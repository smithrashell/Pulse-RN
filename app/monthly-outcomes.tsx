import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  FAB,
  IconButton,
  useTheme,
  ProgressBar,
  Portal,
  Modal,
  TextInput,
  Button,
  Chip,
  Menu,
  TouchableRipple,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, isSameMonth } from 'date-fns';
import { monthlyOutcomeQueries, weeklyIntentionQueries, focusAreaQueries } from '../src/db/queries';
import { MonthlyOutcome, OutcomeStatus, FocusArea, WeeklyIntention } from '../src/db/schema';

// Type for linked intentions per outcome
type LinkedIntentionsMap = Record<number, WeeklyIntention[]>;

// Progress status options (user-selectable)
const PROGRESS_STATUS_OPTIONS: { value: OutcomeStatus; label: string; color: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'surfaceVariant' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'primaryContainer' },
  { value: 'COMPLETED', label: 'Completed', color: 'tertiaryContainer' },
];

// All status options for color mapping
const ALL_STATUS_COLORS: Record<OutcomeStatus, string> = {
  NOT_STARTED: 'surfaceVariant',
  IN_PROGRESS: 'primaryContainer',
  COMPLETED: 'tertiaryContainer',
  CARRIED_OVER: 'secondaryContainer',
};

export default function MonthlyOutcomesScreen() {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [outcomes, setOutcomes] = useState<MonthlyOutcome[]>([]);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [linkedIntentions, setLinkedIntentions] = useState<LinkedIntentionsMap>({});
  const [_isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState<MonthlyOutcome | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFocusAreaId, setSelectedFocusAreaId] = useState<number | null>(null);
  const [status, setStatus] = useState<OutcomeStatus>('NOT_STARTED');
  const [focusAreaMenuVisible, setFocusAreaMenuVisible] = useState(false);

  const monthLabel = format(currentDate, 'MMMM yyyy');
  const monthString = format(currentDate, 'yyyy-MM');

  const completedCount = outcomes.filter((o) => o.status === 'COMPLETED').length;
  const progress = outcomes.length > 0 ? completedCount / outcomes.length : 0;

  // Calculate time context
  const today = new Date();
  const isCurrentMonth = isSameMonth(currentDate, today);
  // Calculate week of month: ceil(day of month / 7)
  const currentWeekOfMonth = isCurrentMonth ? Math.ceil(today.getDate() / 7) : null;
  // Total weeks in month: ceil(days in month / 7)
  const totalWeeksInMonth = Math.ceil(getDaysInMonth(currentDate) / 7);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedOutcomes = await monthlyOutcomeQueries.getForMonth(currentDate);
      setOutcomes(loadedOutcomes);

      // Load focus areas for linking
      const areas = await focusAreaQueries.getAllActive();
      setFocusAreas(areas);

      // Load linked intentions for each outcome
      const intentionsMap: LinkedIntentionsMap = {};
      for (const outcome of loadedOutcomes) {
        const intentions = await weeklyIntentionQueries.getByMonthlyOutcomeId(outcome.id);
        intentionsMap[outcome.id] = intentions;
      }
      setLinkedIntentions(intentionsMap);
    } catch (error) {
      console.error('Error loading outcomes:', error);
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
    setEditingOutcome(null);
    setTitle('');
    setNotes('');
    setSelectedFocusAreaId(null);
    setStatus('NOT_STARTED');
    setDialogVisible(true);
  };

  const openEditDialog = (outcome: MonthlyOutcome) => {
    setEditingOutcome(outcome);
    setTitle(outcome.title);
    setNotes(outcome.notes || '');
    setSelectedFocusAreaId(outcome.focusAreaId);
    setStatus(outcome.status);
    setDialogVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      if (editingOutcome) {
        await monthlyOutcomeQueries.update(editingOutcome.id, {
          title: title.trim(),
          notes: notes.trim() || undefined,
          focusAreaId: selectedFocusAreaId,
          status,
        });
      } else {
        await monthlyOutcomeQueries.create({
          month: monthString,
          title: title.trim(),
          notes: notes.trim() || undefined,
          focusAreaId: selectedFocusAreaId,
          status,
        });
      }
      setDialogVisible(false);
      loadData();
    } catch (error) {
      console.error('Error saving outcome:', error);
    }
  };

  const handleStatusChange = async (outcome: MonthlyOutcome, newStatus: OutcomeStatus) => {
    try {
      await monthlyOutcomeQueries.updateStatus(outcome.id, newStatus);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = (outcome: MonthlyOutcome) => {
    Alert.alert('Delete Outcome', 'Are you sure you want to delete this outcome?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await monthlyOutcomeQueries.delete(outcome.id);
          loadData();
        },
      },
    ]);
  };

  const selectedFocusArea = focusAreas.find((fa) => fa.id === selectedFocusAreaId);

  const getStatusColor = (outcomeStatus: OutcomeStatus) => {
    const colorKey = ALL_STATUS_COLORS[outcomeStatus];
    const colors = theme.colors as Record<string, string>;
    return colors[colorKey] || theme.colors.surfaceVariant;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Period Navigation */}
        <View style={styles.periodNav}>
          <IconButton
            icon="chevron-left"
            onPress={() => setCurrentDate(subMonths(currentDate, 1))}
          />
          <Text variant="titleMedium">{monthLabel}</Text>
          <IconButton
            icon="chevron-right"
            onPress={() => setCurrentDate(addMonths(currentDate, 1))}
          />
        </View>

        {/* Progress Summary */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.progressRow}>
              <Text variant="bodyMedium">
                {completedCount} of {outcomes.length} completed
              </Text>
            </View>
            <ProgressBar progress={progress} style={styles.progressBar} />
          </Card.Content>
        </Card>

        {/* Outcomes List */}
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Outcomes
        </Text>

        {outcomes.length === 0 ? (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.emptyContent}>
              <Ionicons name="flag-outline" size={48} color={theme.colors.outline} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No outcomes set for this month
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Tap + to add your first outcome
              </Text>
            </Card.Content>
          </Card>
        ) : (
          outcomes.map((outcome) => {
            const linkedFocusArea = focusAreas.find((fa) => fa.id === outcome.focusAreaId);
            const cardBackgroundColor = getStatusColor(outcome.status);
            const outcomeIntentions = linkedIntentions[outcome.id] || [];
            const completedIntentions = outcomeIntentions.filter((i) => i.isCompleted).length;
            const pendingIntentions = outcomeIntentions.filter((i) => !i.isCompleted).length;
            const hasLinkedIntentions = outcomeIntentions.length > 0;

            return (
              <Card
                key={outcome.id}
                style={[styles.card, { backgroundColor: cardBackgroundColor }]}
                mode="elevated"
              >
                <TouchableRipple onPress={() => openEditDialog(outcome)}>
                  <Card.Content style={styles.outcomeCardContent}>
                    <View style={styles.outcomeHeader}>
                      <View style={styles.outcomeTitle}>
                        {linkedFocusArea && (
                          <Text style={{ fontSize: 18, marginRight: 8 }}>
                            {linkedFocusArea.icon}
                          </Text>
                        )}
                        <Text variant="titleMedium" style={{ flex: 1 }} numberOfLines={2}>
                          {outcome.title}
                        </Text>
                      </View>
                      <View style={styles.outcomeActions}>
                        <IconButton
                          icon="delete"
                          size={20}
                          iconColor={theme.colors.error}
                          onPress={() => handleDelete(outcome)}
                        />
                      </View>
                    </View>

                    {outcome.notes && (
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                        numberOfLines={2}
                      >
                        {outcome.notes}
                      </Text>
                    )}

                    {/* Linked Intentions Display */}
                    {hasLinkedIntentions && (
                      <View style={styles.intentionsSection}>
                        <View style={styles.intentionRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={theme.colors.primary}
                            style={{ marginRight: 6 }}
                          />
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                            {completedIntentions} intention{completedIntentions !== 1 ? 's' : ''} completed
                          </Text>
                        </View>
                        {pendingIntentions > 0 && (
                          <View style={styles.intentionRow}>
                            <Ionicons
                              name="ellipse-outline"
                              size={16}
                              color={theme.colors.outline}
                              style={{ marginRight: 6 }}
                            />
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {pendingIntentions} intention{pendingIntentions !== 1 ? 's' : ''} pending
                            </Text>
                          </View>
                        )}
                        {isCurrentMonth && currentWeekOfMonth && (
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' }}
                          >
                            Week {currentWeekOfMonth} of {totalWeeksInMonth} in {format(currentDate, 'MMMM')}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Carried Over Badge */}
                    {outcome.status === 'CARRIED_OVER' && (
                      <View style={styles.carriedOverBadge}>
                        <Ionicons
                          name="arrow-forward-circle"
                          size={16}
                          color={theme.colors.secondary}
                          style={{ marginRight: 4 }}
                        />
                        <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>
                          Carried over from previous month
                        </Text>
                      </View>
                    )}

                    <View style={styles.statusRow}>
                      {PROGRESS_STATUS_OPTIONS.map((option) => {
                        const isSelected = outcome.status === option.value;
                        return (
                          <Chip
                            key={option.value}
                            mode={isSelected ? 'flat' : 'outlined'}
                            onPress={() => handleStatusChange(outcome, option.value)}
                            style={[
                              styles.statusChip,
                              isSelected && { backgroundColor: theme.colors.inverseSurface },
                            ]}
                            textStyle={isSelected ? { color: theme.colors.inverseOnSurface } : undefined}
                            compact
                          >
                            {option.label}
                          </Chip>
                        );
                      })}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollContent}
          >
              <Text variant="titleLarge" style={{ marginBottom: 16 }}>
                {editingOutcome ? 'Edit Outcome' : 'New Outcome'}
              </Text>

              <TextInput
                mode="outlined"
                label="What outcome do you want to achieve?"
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

              {/* Focus Area Selection */}
              <Text variant="labelMedium" style={{ marginTop: 8, marginBottom: 4 }}>
                Link to Focus Area (optional)
              </Text>
              <Menu
                visible={focusAreaMenuVisible}
                onDismiss={() => setFocusAreaMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setFocusAreaMenuVisible(true)}
                    contentStyle={{ justifyContent: 'flex-start' }}
                    icon={
                      selectedFocusArea
                        ? () => <Text style={{ fontSize: 16 }}>{selectedFocusArea.icon}</Text>
                        : undefined
                    }
                  >
                    {selectedFocusArea ? selectedFocusArea.name : 'No focus area linked'}
                  </Button>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedFocusAreaId(null);
                    setFocusAreaMenuVisible(false);
                  }}
                  title="No focus area linked"
                />
                <Divider />
                {focusAreas.map((fa) => (
                  <Menu.Item
                    key={fa.id}
                    onPress={() => {
                      setSelectedFocusAreaId(fa.id);
                      setFocusAreaMenuVisible(false);
                    }}
                    title={fa.name}
                    leadingIcon={() => <Text style={{ fontSize: 16 }}>{fa.icon}</Text>}
                  />
                ))}
              </Menu>

              {/* Status Selection */}
              <Text variant="labelMedium" style={{ marginTop: 16, marginBottom: 8 }}>
                Status
              </Text>
              <View style={styles.statusSelection}>
                {PROGRESS_STATUS_OPTIONS.map((option) => {
                  const isSelected = status === option.value;
                  return (
                    <Chip
                      key={option.value}
                      mode={isSelected ? 'flat' : 'outlined'}
                      onPress={() => setStatus(option.value)}
                      style={[
                        styles.statusChip,
                        isSelected && { backgroundColor: theme.colors.inverseSurface },
                      ]}
                      textStyle={isSelected ? { color: theme.colors.inverseOnSurface } : undefined}
                    >
                      {option.label}
                    </Chip>
                  );
                })}
              </View>

            <View style={styles.dialogActions}>
              <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} disabled={!title.trim()}>
                Save
              </Button>
            </View>
          </ScrollView>
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
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  outcomeCardContent: {
    paddingBottom: 16,
  },
  outcomeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  outcomeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  outcomeActions: {
    flexDirection: 'row',
  },
  intentionsSection: {
    marginTop: 12,
  },
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingBottom: 4,
  },
  statusChip: {
    marginRight: 0,
  },
  statusSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  carriedOverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
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
    maxHeight: '80%',
  },
  modalScrollContent: {
    paddingBottom: 40,
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
