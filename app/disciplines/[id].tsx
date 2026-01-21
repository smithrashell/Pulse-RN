import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  Chip,
  ActivityIndicator,
  IconButton,
  Divider,
  ProgressBar,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { disciplineQueries, disciplineCheckQueries } from '../../src/db/queries';
import { disciplineService, DisciplineStats } from '../../src/services';
import { Discipline, DisciplineCheck } from '../../src/db/schema';
import { formatQuarter } from '../../src/utils/quarter';

export default function DisciplineDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [stats, setStats] = useState<DisciplineStats | null>(null);
  const [recentChecks, setRecentChecks] = useState<DisciplineCheck[]>([]);

  // Dialog states
  const [showGraduateDialog, setShowGraduateDialog] = useState(false);
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [graduateReflection, setGraduateReflection] = useState('');
  const [retireReason, setRetireReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentQuarter = formatQuarter(new Date());

  const loadData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const disc = await disciplineQueries.getById(parseInt(id, 10));
      if (disc) {
        setDiscipline(disc);
        const disciplineStats = await disciplineService.getStats(disc, currentQuarter);
        setStats(disciplineStats);
        const checks = await disciplineCheckQueries.getRecent(disc.id, 30);
        setRecentChecks(checks);
      }
    } catch (error) {
      console.error('Error loading discipline:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, currentQuarter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleGraduate = async () => {
    if (!discipline || !graduateReflection.trim()) {
      Alert.alert('Required', 'Please add a reflection for your graduation.');
      return;
    }

    setIsSaving(true);
    try {
      await disciplineQueries.graduate(discipline.id, graduateReflection.trim());
      setShowGraduateDialog(false);
      router.back();
    } catch (error) {
      console.error('Error graduating discipline:', error);
      Alert.alert('Error', 'Failed to graduate discipline.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetire = async () => {
    if (!discipline) return;

    setIsSaving(true);
    try {
      await disciplineQueries.retire(discipline.id, retireReason.trim() || 'No longer serving me');
      setShowRetireDialog(false);
      router.back();
    } catch (error) {
      console.error('Error retiring discipline:', error);
      Alert.alert('Error', 'Failed to retire discipline.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!discipline) return;

    Alert.alert(
      'Delete Discipline',
      'Are you sure you want to delete this discipline? All check history will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await disciplineQueries.delete(discipline.id);
            router.back();
          },
        },
      ]
    );
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'NAILED_IT':
        return { name: 'checkmark-circle', color: theme.colors.tertiary };
      case 'CLOSE':
        return { name: 'checkmark-circle-outline', color: theme.colors.primary };
      case 'MISSED':
        return { name: 'close-circle-outline', color: theme.colors.error };
      default:
        return { name: 'help-circle-outline', color: theme.colors.outline };
    }
  };

  if (isLoading || !discipline) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" style={styles.loading} />
      </SafeAreaView>
    );
  }

  const daysActive = differenceInDays(new Date(), discipline.startedAt);
  const progressToIngrained = Math.min(daysActive / 90, 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
              {discipline.title}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {disciplineService.getFrequencyLabel(discipline)}
              {discipline.targetTime && ` • ${discipline.targetTime}`}
            </Text>
          </View>
          <IconButton
            icon="pencil"
            onPress={() => router.push(`/disciplines/create?id=${discipline.id}`)}
          />
        </View>

        {discipline.description && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text variant="bodyMedium">{discipline.description}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Progress to Ingrained (90 days) */}
        {discipline.status === 'ACTIVE' && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.progressHeader}>
                <Text variant="titleSmall">Progress to Ingrained</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {daysActive} / 90 days
                </Text>
              </View>
              <ProgressBar
                progress={progressToIngrained}
                style={styles.progressBar}
                color={progressToIngrained >= 1 ? theme.colors.tertiary : theme.colors.primary}
              />
              {progressToIngrained >= 1 && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.tertiary, marginTop: 8, textAlign: 'center' }}
                >
                  Ready to graduate!
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Stats */}
        {stats && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '600' }}>
                Statistics
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Ionicons name="flame" size={24} color={theme.colors.primary} />
                  <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginTop: 4 }}>
                    {stats.streak}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Current Streak
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="stats-chart" size={24} color={theme.colors.primary} />
                  <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginTop: 4 }}>
                    {stats.quarterConsistency}%
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Q Consistency
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              <View style={styles.ratingBreakdown}>
                <View style={styles.ratingItem}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.tertiary} />
                  <Text variant="bodyMedium" style={{ marginLeft: 6 }}>
                    {stats.nailitCount} Nailed It
                  </Text>
                </View>
                <View style={styles.ratingItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={{ marginLeft: 6 }}>
                    {stats.closeCount} Close
                  </Text>
                </View>
                <View style={styles.ratingItem}>
                  <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
                  <Text variant="bodyMedium" style={{ marginLeft: 6 }}>
                    {stats.missedCount} Missed
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Recent History */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Recent History
        </Text>
        {recentChecks.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No check-ins yet.
          </Text>
        ) : (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              {recentChecks.slice(0, 10).map((check, index) => {
                const icon = getRatingIcon(check.rating);
                return (
                  <View key={check.id}>
                    {index > 0 && <Divider style={{ marginVertical: 8 }} />}
                    <View style={styles.checkRow}>
                      <Ionicons
                        name={icon.name as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={icon.color}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyMedium">
                          {format(new Date(check.date), 'EEE, MMM d')}
                        </Text>
                        {check.actualTime && (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            at {check.actualTime}
                          </Text>
                        )}
                      </View>
                      <Chip compact mode="outlined">
                        {check.rating.replace('_', ' ')}
                      </Chip>
                    </View>
                  </View>
                );
              })}
            </Card.Content>
          </Card>
        )}

        {/* Actions */}
        {discipline.status === 'ACTIVE' && (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Actions
            </Text>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => setShowGraduateDialog(true)}
                style={[styles.actionButton, { backgroundColor: theme.colors.tertiary }]}
                icon="school"
              >
                Graduate
              </Button>
              <Button
                mode="outlined"
                onPress={() => setShowRetireDialog(true)}
                style={styles.actionButton}
              >
                Retire
              </Button>
            </View>
          </>
        )}

        {/* Delete */}
        <Button
          mode="text"
          textColor={theme.colors.error}
          onPress={handleDelete}
          style={{ marginTop: 24 }}
        >
          Delete Discipline
        </Button>
      </ScrollView>

      {/* Graduate Dialog */}
      <Portal>
        <Dialog visible={showGraduateDialog} onDismiss={() => setShowGraduateDialog(false)}>
          <Dialog.Icon icon="school" />
          <Dialog.Title style={{ textAlign: 'center' }}>Graduate Discipline</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
              Congratulations! This discipline is now part of who you are.
            </Text>
            <TextInput
              mode="outlined"
              label="Reflection"
              placeholder="What did this discipline enable? How has it changed you?"
              value={graduateReflection}
              onChangeText={setGraduateReflection}
              multiline
              numberOfLines={4}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowGraduateDialog(false)}>Cancel</Button>
            <Button onPress={handleGraduate} loading={isSaving}>
              Graduate
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Retire Dialog */}
      <Portal>
        <Dialog visible={showRetireDialog} onDismiss={() => setShowRetireDialog(false)}>
          <Dialog.Title>Retire Discipline</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              This discipline is no longer serving you. That's okay — make room for what matters now.
            </Text>
            <TextInput
              mode="outlined"
              label="Reason (optional)"
              placeholder="Why are you retiring this?"
              value={retireReason}
              onChangeText={setRetireReason}
              multiline
              numberOfLines={2}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRetireDialog(false)}>Cancel</Button>
            <Button onPress={handleRetire} loading={isSaving}>
              Retire
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
  loading: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    padding: 16,
  },
  ratingBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
