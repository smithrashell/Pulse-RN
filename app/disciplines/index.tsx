import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  FAB,
  useTheme,
  Chip,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { disciplineQueries, disciplineCheckQueries } from '../../src/db/queries';
import { disciplineService, DisciplineStats } from '../../src/services';
import { Discipline } from '../../src/db/schema';
import { formatQuarter } from '../../src/utils/quarter';

interface DisciplineWithStats {
  discipline: Discipline;
  stats: DisciplineStats;
}

export default function DisciplinesScreen() {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [activeDisciplines, setActiveDisciplines] = useState<DisciplineWithStats[]>([]);
  const [ingrainedDisciplines, setIngrainedDisciplines] = useState<Discipline[]>([]);
  const [showIngrained, setShowIngrained] = useState(false);

  const currentQuarter = formatQuarter(new Date());

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load active disciplines with stats
      const active = await disciplineQueries.getActive();
      const activeWithStats: DisciplineWithStats[] = [];

      for (const discipline of active) {
        const stats = await disciplineService.getStats(discipline, currentQuarter);
        activeWithStats.push({ discipline, stats });
      }
      setActiveDisciplines(activeWithStats);

      // Load ingrained disciplines
      const ingrained = await disciplineQueries.getByStatus('INGRAINED');
      setIngrainedDisciplines(ingrained);
    } catch (error) {
      console.error('Error loading disciplines:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentQuarter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return theme.colors.primaryContainer;
      case 'INGRAINED':
        return theme.colors.tertiaryContainer;
      default:
        return theme.colors.surfaceVariant;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            variant="headlineMedium"
            style={{ fontWeight: 'bold', color: theme.colors.onBackground }}
          >
            Disciplines
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Foundational practices that support your goals
          </Text>
        </View>

        {/* Info Card */}
        <Card
          style={[styles.card, { backgroundColor: theme.colors.secondaryContainer }]}
          mode="elevated"
        >
          <Card.Content>
            <Text variant="titleSmall" style={{ color: theme.colors.onSecondaryContainer }}>
              Systems {">"} Goals
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSecondaryContainer, marginTop: 4 }}
            >
              "You don't rise to the level of your goals. You fall to the level of your systems."
              — James Clear
            </Text>
          </Card.Content>
        </Card>

        {/* Active Disciplines Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            Active ({activeDisciplines.length}/3)
          </Text>
          {activeDisciplines.length >= 3 && (
            <Chip compact mode="outlined" style={{ backgroundColor: theme.colors.errorContainer }}>
              <Text style={{ color: theme.colors.error, fontSize: 11 }}>At limit</Text>
            </Chip>
          )}
        </View>

        {activeDisciplines.length === 0 ? (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.emptyContent}>
              <Ionicons name="fitness-outline" size={48} color={theme.colors.outline} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No active disciplines
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
              >
                Add a foundational practice to build your systems
              </Text>
            </Card.Content>
          </Card>
        ) : (
          activeDisciplines.map(({ discipline, stats }) => (
            <Card
              key={discipline.id}
              style={[styles.card, { backgroundColor: getStatusColor(discipline.status) }]}
              mode="elevated"
              onPress={() => router.push(`/disciplines/${discipline.id}`)}
            >
              <Card.Content>
                <View style={styles.disciplineHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                      {discipline.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {disciplineService.getFrequencyLabel(discipline)}
                      {discipline.targetTime && ` • ${discipline.targetTime}`}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="flame" size={16} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={{ marginLeft: 4, fontWeight: '600' }}>
                      {stats.streak}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ marginLeft: 4, color: theme.colors.onSurfaceVariant }}
                    >
                      streak
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="stats-chart" size={16} color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={{ marginLeft: 4, fontWeight: '600' }}>
                      {stats.quarterConsistency}%
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ marginLeft: 4, color: theme.colors.onSurfaceVariant }}
                    >
                      Q consistency
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}

        {/* Ingrained Disciplines Section */}
        {ingrainedDisciplines.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                Ingrained
              </Text>
              <IconButton
                icon={showIngrained ? 'chevron-up' : 'chevron-down'}
                size={20}
                onPress={() => setShowIngrained(!showIngrained)}
              />
            </View>

            {showIngrained &&
              ingrainedDisciplines.map((discipline) => (
                <Card
                  key={discipline.id}
                  style={[styles.card, { backgroundColor: getStatusColor(discipline.status) }]}
                  mode="elevated"
                  onPress={() => router.push(`/disciplines/${discipline.id}`)}
                >
                  <Card.Content>
                    <View style={styles.disciplineHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={theme.colors.tertiary}
                            style={{ marginRight: 6 }}
                          />
                          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                            {discipline.title}
                          </Text>
                        </View>
                        {discipline.ingrainedAt && (
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                          >
                            Graduated {format(discipline.ingrainedAt, 'MMM yyyy')}
                          </Text>
                        )}
                        {discipline.ingrainedReflection && (
                          <Text
                            variant="bodySmall"
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              fontStyle: 'italic',
                              marginTop: 4,
                            }}
                            numberOfLines={2}
                          >
                            "{discipline.ingrainedReflection}"
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                  </Card.Content>
                </Card>
              ))}
          </>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/disciplines/create')}
      />
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
    paddingBottom: 80,
  },
  header: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  disciplineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
