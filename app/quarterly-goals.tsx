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
import { quarterlyGoalQueries, focusAreaQueries, monthlyOutcomeQueries } from '../src/db/queries';
import { QuarterlyGoal, QuarterlyGoalStatus, FocusArea, MonthlyOutcome } from '../src/db/schema';
import { FlinchPrompt, ThinkBiggerPrompt } from '../src/components';
import {
  formatQuarter,
  formatQuarterLabel,
  addQuarters,
  getWeekOfQuarter,
  getTotalWeeksInQuarter,
  isInQuarter,
} from '../src/utils/quarter';

// Type for linked outcomes per goal
type LinkedOutcomesMap = Record<number, MonthlyOutcome[]>;

// Status options
const STATUS_OPTIONS: { value: QuarterlyGoalStatus; label: string; color: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'surfaceVariant' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'primaryContainer' },
  { value: 'COMPLETED', label: 'Completed', color: 'tertiaryContainer' },
];

const STATUS_COLORS: Record<QuarterlyGoalStatus, string> = {
  NOT_STARTED: 'surfaceVariant',
  IN_PROGRESS: 'primaryContainer',
  COMPLETED: 'tertiaryContainer',
};

const MAX_GOALS = 6;

export default function QuarterlyGoalsScreen() {
  const theme = useTheme();
  const [currentQuarter, setCurrentQuarter] = useState(formatQuarter(new Date()));
  const [goals, setGoals] = useState<QuarterlyGoal[]>([]);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [linkedOutcomes, setLinkedOutcomes] = useState<LinkedOutcomesMap>({});
  const [_isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<QuarterlyGoal | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFocusAreaId, setSelectedFocusAreaId] = useState<number | null>(null);
  const [status, setStatus] = useState<QuarterlyGoalStatus>('NOT_STARTED');
  const [focusAreaMenuVisible, setFocusAreaMenuVisible] = useState(false);

  // Flinch Test state
  const [showFlinchPrompt, setShowFlinchPrompt] = useState(false);
  const [showThinkBiggerPrompt, setShowThinkBiggerPrompt] = useState(false);
  const [pendingGoalTitle, setPendingGoalTitle] = useState('');

  const quarterLabel = formatQuarterLabel(currentQuarter);
  const completedCount = goals.filter((g) => g.status === 'COMPLETED').length;
  const progress = goals.length > 0 ? completedCount / goals.length : 0;

  // Calculate time context
  const today = new Date();
  const isCurrentQuarter = isInQuarter(today, currentQuarter);
  const currentWeekOfQuarter = isCurrentQuarter ? getWeekOfQuarter(today) : null;
  const totalWeeksInQuarter = getTotalWeeksInQuarter(currentQuarter);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedGoals = await quarterlyGoalQueries.getForQuarter(currentQuarter);
      setGoals(loadedGoals);

      // Load focus areas for linking
      const areas = await focusAreaQueries.getAllActive();
      setFocusAreas(areas);

      // Load linked monthly outcomes for each goal
      const outcomesMap: LinkedOutcomesMap = {};
      for (const goal of loadedGoals) {
        const outcomes = await monthlyOutcomeQueries.getByQuarterlyGoalId(goal.id);
        outcomesMap[goal.id] = outcomes;
      }
      setLinkedOutcomes(outcomesMap);
    } catch (error) {
      console.error('Error loading quarterly goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentQuarter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openAddDialog = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setSelectedFocusAreaId(null);
    setStatus('NOT_STARTED');
    setDialogVisible(true);
  };

  const openEditDialog = (goal: QuarterlyGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setSelectedFocusAreaId(goal.focusAreaId);
    setStatus(goal.status);
    setDialogVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    // For editing, just save directly
    if (editingGoal) {
      try {
        await quarterlyGoalQueries.update(editingGoal.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          focusAreaId: selectedFocusAreaId,
          status,
        });
        setDialogVisible(false);
        loadData();
      } catch (error) {
        console.error('Error saving goal:', error);
      }
      return;
    }

    // For new goals, trigger Flinch Test
    setPendingGoalTitle(title.trim());
    setDialogVisible(false);
    setShowFlinchPrompt(true);
  };

  // Flinch Test handlers
  const handleFlinchScary = async () => {
    // Goal is scary enough - save as-is
    setShowFlinchPrompt(false);
    await saveGoal(pendingGoalTitle, false, null);
  };

  const handleFlinchSafe = () => {
    // Goal is too safe - show Think Bigger prompt
    setShowFlinchPrompt(false);
    setShowThinkBiggerPrompt(true);
  };

  const handleUseStretchGoal = async (stretchedGoal: string) => {
    // Save the stretched goal with original recorded
    setShowThinkBiggerPrompt(false);
    await saveGoal(stretchedGoal, true, pendingGoalTitle);
  };

  const handleKeepOriginal = async () => {
    // Keep original goal
    setShowThinkBiggerPrompt(false);
    await saveGoal(pendingGoalTitle, false, null);
  };

  const saveGoal = async (goalTitle: string, wasStretched: boolean, originalGoal: string | null) => {
    try {
      await quarterlyGoalQueries.create({
        quarter: currentQuarter,
        title: goalTitle,
        description: description.trim() || undefined,
        focusAreaId: selectedFocusAreaId,
        status,
        wasStretched,
        originalGoal: originalGoal || undefined,
      });
      setPendingGoalTitle('');
      loadData();
    } catch (error) {
      console.error('Error saving goal:', error);
      if (error instanceof Error && error.message.includes('maximum')) {
        Alert.alert('Limit Reached', 'You can only have 6 goals per quarter.');
      }
    }
  };

  const handleStatusChange = async (goal: QuarterlyGoal, newStatus: QuarterlyGoalStatus) => {
    try {
      await quarterlyGoalQueries.updateStatus(goal.id, newStatus);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = (goal: QuarterlyGoal) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this quarterly goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await quarterlyGoalQueries.delete(goal.id);
          loadData();
        },
      },
    ]);
  };

  const selectedFocusArea = focusAreas.find((fa) => fa.id === selectedFocusAreaId);

  const getStatusColor = (goalStatus: QuarterlyGoalStatus) => {
    const colorKey = STATUS_COLORS[goalStatus];
    const colors = theme.colors as Record<string, string>;
    return colors[colorKey] || theme.colors.surfaceVariant;
  };

  const canAddGoal = goals.length < MAX_GOALS;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Period Navigation */}
        <View style={styles.periodNav}>
          <IconButton
            icon="chevron-left"
            onPress={() => setCurrentQuarter(addQuarters(currentQuarter, -1))}
          />
          <Text variant="titleMedium">{quarterLabel}</Text>
          <IconButton
            icon="chevron-right"
            onPress={() => setCurrentQuarter(addQuarters(currentQuarter, 1))}
          />
        </View>

        {/* Progress Summary */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.progressRow}>
              <Text variant="bodyMedium">
                {completedCount} of {goals.length} goals completed
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {MAX_GOALS - goals.length} slots remaining
              </Text>
            </View>
            <ProgressBar progress={progress} style={styles.progressBar} />
            {isCurrentQuarter && currentWeekOfQuarter && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.primary, marginTop: 8, textAlign: 'center' }}
              >
                Week {currentWeekOfQuarter} of {totalWeeksInQuarter}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* 3-6-9 Method Info */}
        <Card
          style={[styles.card, { backgroundColor: theme.colors.secondaryContainer }]}
          mode="elevated"
        >
          <Card.Content>
            <Text variant="titleSmall" style={{ color: theme.colors.onSecondaryContainer }}>
              The 3-6-9 Method
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSecondaryContainer, marginTop: 4 }}
            >
              3 months, 6 goals maximum, 90 days to execute. Focus on what matters most.
            </Text>
          </Card.Content>
        </Card>

        {/* Goals List */}
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Quarterly Goals
        </Text>

        {goals.length === 0 ? (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.emptyContent}>
              <Ionicons name="trophy-outline" size={48} color={theme.colors.outline} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No goals set for this quarter
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Tap + to add your first quarterly goal
              </Text>
            </Card.Content>
          </Card>
        ) : (
          goals.map((goal) => {
            const linkedFocusArea = focusAreas.find((fa) => fa.id === goal.focusAreaId);
            const cardBackgroundColor = getStatusColor(goal.status);
            const goalOutcomes = linkedOutcomes[goal.id] || [];
            const completedOutcomes = goalOutcomes.filter((o) => o.status === 'COMPLETED').length;
            const hasLinkedOutcomes = goalOutcomes.length > 0;

            return (
              <Card
                key={goal.id}
                style={[styles.card, { backgroundColor: cardBackgroundColor }]}
                mode="elevated"
              >
                <TouchableRipple onPress={() => openEditDialog(goal)}>
                  <Card.Content style={styles.goalCardContent}>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalTitle}>
                        <Text
                          variant="labelSmall"
                          style={{ color: theme.colors.primary, marginBottom: 4 }}
                        >
                          Goal {goal.position}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {linkedFocusArea && (
                            <Text style={{ fontSize: 18, marginRight: 8 }}>
                              {linkedFocusArea.icon}
                            </Text>
                          )}
                          <Text variant="titleMedium" style={{ flex: 1 }} numberOfLines={2}>
                            {goal.title}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.goalActions}>
                        <IconButton
                          icon="delete"
                          size={20}
                          iconColor={theme.colors.error}
                          onPress={() => handleDelete(goal)}
                        />
                      </View>
                    </View>

                    {goal.description && (
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                        numberOfLines={2}
                      >
                        {goal.description}
                      </Text>
                    )}

                    {/* Linked Monthly Outcomes Display */}
                    {hasLinkedOutcomes && (
                      <View style={styles.outcomesSection}>
                        <View style={styles.outcomeRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={theme.colors.primary}
                            style={{ marginRight: 6 }}
                          />
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                            {completedOutcomes} of {goalOutcomes.length} monthly outcome
                            {goalOutcomes.length !== 1 ? 's' : ''} completed
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.statusRow}>
                      {STATUS_OPTIONS.map((option) => {
                        const isSelected = goal.status === option.value;
                        return (
                          <Chip
                            key={option.value}
                            mode={isSelected ? 'flat' : 'outlined'}
                            onPress={() => handleStatusChange(goal, option.value)}
                            style={[
                              styles.statusChip,
                              isSelected && { backgroundColor: theme.colors.inverseSurface },
                            ]}
                            textStyle={
                              isSelected ? { color: theme.colors.inverseOnSurface } : undefined
                            }
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
        style={[
          styles.fab,
          { backgroundColor: canAddGoal ? theme.colors.primary : theme.colors.surfaceDisabled },
        ]}
        color={canAddGoal ? theme.colors.onPrimary : theme.colors.onSurfaceDisabled}
        onPress={canAddGoal ? openAddDialog : undefined}
        disabled={!canAddGoal}
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
              {editingGoal ? 'Edit Goal' : 'New Quarterly Goal'}
            </Text>

            <TextInput
              mode="outlined"
              label="What's your goal for this quarter?"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
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
              {STATUS_OPTIONS.map((option) => {
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

      {/* Flinch Test Prompt */}
      <FlinchPrompt
        goalText={pendingGoalTitle}
        visible={showFlinchPrompt}
        onScary={handleFlinchScary}
        onSafe={handleFlinchSafe}
        onDismiss={() => setShowFlinchPrompt(false)}
      />

      {/* Think Bigger Prompt */}
      <ThinkBiggerPrompt
        originalGoal={pendingGoalTitle}
        visible={showThinkBiggerPrompt}
        onUseStretch={handleUseStretchGoal}
        onKeepOriginal={handleKeepOriginal}
        onDismiss={() => setShowThinkBiggerPrompt(false)}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  goalCardContent: {
    paddingBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  goalTitle: {
    flex: 1,
  },
  goalActions: {
    flexDirection: 'row',
  },
  outcomesSection: {
    marginTop: 12,
  },
  outcomeRow: {
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
