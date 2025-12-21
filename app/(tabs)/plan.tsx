import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Chip,
  IconButton,
  useTheme,
  ProgressBar,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachWeekOfInterval,
  eachDayOfInterval,
} from 'date-fns';
import {
  sessionQueries,
  focusAreaQueries,
  weeklyIntentionQueries,
  monthlyOutcomeQueries,
} from '../../src/db/queries';
import { FocusArea } from '../../src/db/schema';
import { formatMinutes } from '../../src/utils/time';

type ViewMode = 'WEEK' | 'MONTH';

interface DayData {
  date: Date;
  minutes: number;
  label: string;
}

interface FocusAreaProgress {
  focusArea: FocusArea;
  currentMinutes: number;
  targetMinutes: number | null;
  progress: number;
}

export default function PlanScreen() {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('WEEK');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Data
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [focusAreaProgress, setFocusAreaProgress] = useState<FocusAreaProgress[]>([]);
  const [_intentionCount, setIntentionCount] = useState({ total: 0, completed: 0 });
  const [_outcomeCount, setOutcomeCount] = useState({ total: 0, completed: 0 });
  const [activeFocusAreaCount, setActiveFocusAreaCount] = useState(0);

  // Calculate period dates
  const periodStart =
    viewMode === 'WEEK' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate);
  const periodEnd =
    viewMode === 'WEEK' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate);

  const periodLabel =
    viewMode === 'WEEK'
      ? `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d')}`
      : format(currentDate, 'MMMM yyyy');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate period dates inside callback to satisfy exhaustive-deps
      const loadPeriodStart =
        viewMode === 'WEEK'
          ? startOfWeek(currentDate, { weekStartsOn: 1 })
          : startOfMonth(currentDate);
      const loadPeriodEnd =
        viewMode === 'WEEK' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate);

      // Get active focus area count
      const activeFAs = await focusAreaQueries.getAllActive();
      setActiveFocusAreaCount(activeFAs.length);

      let loadedData: DayData[] = [];

      if (viewMode === 'WEEK') {
        // For week view, show each day (M, T, W, T, F, S, S)
        const days = eachDayOfInterval({ start: loadPeriodStart, end: loadPeriodEnd });
        const dayDataPromises = days.map(async (date) => {
          const minutes = await sessionQueries.getTotalMinutesForDay(date);
          return {
            date,
            minutes,
            label: format(date, 'EEEEE'), // M, T, W, etc.
          };
        });
        loadedData = await Promise.all(dayDataPromises);
      } else {
        // For month view, show each week (W1, W2, W3, W4, W5)
        const weeks = eachWeekOfInterval(
          { start: loadPeriodStart, end: loadPeriodEnd },
          { weekStartsOn: 1 }
        );
        const weekDataPromises = weeks.map(async (weekStart, index) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          // Sum up all days in the week
          const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
          let weekMinutes = 0;
          for (const day of days) {
            // Only count days within the month
            if (day >= loadPeriodStart && day <= loadPeriodEnd) {
              weekMinutes += await sessionQueries.getTotalMinutesForDay(day);
            }
          }
          return {
            date: weekStart,
            minutes: weekMinutes,
            label: `W${index + 1}`,
          };
        });
        loadedData = await Promise.all(weekDataPromises);
      }

      setDayData(loadedData);

      // Calculate total minutes
      const total = loadedData.reduce((sum, d) => sum + d.minutes, 0);
      setTotalMinutes(total);

      // Load focus area progress
      const activeFocusAreas = await focusAreaQueries.getTrackable();
      const progressPromises = activeFocusAreas.map(async (fa) => {
        const minutes = await sessionQueries.getTotalMinutesForFocusAreaInRange(
          fa.id,
          loadPeriodStart,
          loadPeriodEnd
        );

        // Calculate target based on view mode
        let targetMinutes = fa.targetTimeWeeklyMinutes;
        if (viewMode === 'MONTH' && targetMinutes) {
          targetMinutes = targetMinutes * 4; // Approximate month as 4 weeks
        }

        const progress = targetMinutes ? Math.min(minutes / targetMinutes, 1) : 0;

        return {
          focusArea: fa,
          currentMinutes: minutes,
          targetMinutes,
          progress,
        };
      });
      const progressData = await Promise.all(progressPromises);
      // Sort by progress (highest first) and filter out those with no time
      setFocusAreaProgress(
        progressData
          .filter((p) => p.currentMinutes > 0 || p.targetMinutes)
          .sort((a, b) => b.currentMinutes - a.currentMinutes)
      );

      // Load intentions for current week
      const intentions = await weeklyIntentionQueries.getForWeek(currentDate);
      setIntentionCount({
        total: intentions.length,
        completed: intentions.filter((i) => i.isCompleted).length,
      });

      // Load outcomes for current month
      const outcomes = await monthlyOutcomeQueries.getForMonth(currentDate);
      setOutcomeCount({
        total: outcomes.length,
        completed: outcomes.filter((o) => o.status === 'COMPLETED').length,
      });
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, viewMode]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const navigatePrevious = () => {
    if (viewMode === 'WEEK') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'WEEK') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  // Calculate bar heights for chart
  const maxMinutes = Math.max(...dayData.map((d) => d.minutes), 60); // Min 60 for scale
  const chartHeight = 100;

  // Calculate time breakdown with percentages
  const timeBreakdown = focusAreaProgress
    .filter((p) => p.currentMinutes > 0)
    .map((p) => ({
      ...p,
      percentage: totalMinutes > 0 ? Math.round((p.currentMinutes / totalMinutes) * 100) : 0,
    }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with subtitle */}
        <View style={styles.header}>
          <Text
            variant="headlineMedium"
            style={{ fontWeight: 'bold', color: theme.colors.onBackground }}
          >
            Plan
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {activeFocusAreaCount} active focus areas
          </Text>
        </View>

        {/* Planning Section */}
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Planning
        </Text>
        <View style={styles.planningNav}>
          <Card
            style={[styles.navCard, { backgroundColor: theme.colors.tertiaryContainer }]}
            onPress={() => router.push('/weekly-intentions')}
          >
            <Card.Content style={styles.navCardContent}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onTertiaryContainer, fontWeight: '600' }}
              >
                Weekly
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer }}>
                Set intentions
              </Text>
            </Card.Content>
          </Card>
          <Card
            style={[styles.navCard, { backgroundColor: theme.colors.tertiaryContainer }]}
            onPress={() => router.push('/monthly-outcomes')}
          >
            <Card.Content style={styles.navCardContent}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onTertiaryContainer, fontWeight: '600' }}
              >
                Monthly
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer }}>
                Define outcomes
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <Chip
            selected={viewMode === 'WEEK'}
            onPress={() => setViewMode('WEEK')}
            style={styles.chip}
          >
            Week
          </Chip>
          <Chip
            selected={viewMode === 'MONTH'}
            onPress={() => setViewMode('MONTH')}
            style={styles.chip}
          >
            Month
          </Chip>
        </View>

        {/* Period Navigation */}
        <View style={styles.periodNav}>
          <IconButton icon="chevron-left" onPress={navigatePrevious} />
          <Text variant="titleMedium">{periodLabel}</Text>
          <IconButton icon="chevron-right" onPress={navigateNext} />
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" style={{ marginVertical: 32 }} />
        ) : (
          <>
            {/* Time Chart */}
            <Card style={styles.card} mode="elevated">
              <Card.Content>
                <View style={styles.chartHeader}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Total Time
                  </Text>
                  <Text
                    variant="headlineSmall"
                    style={{ color: theme.colors.primary, fontWeight: 'bold' }}
                  >
                    {formatMinutes(totalMinutes)}
                  </Text>
                </View>
                <View style={[styles.barChart, { height: chartHeight + 40 }]}>
                  {dayData.map((day, index) => {
                    const barHeight =
                      maxMinutes > 0 ? Math.max((day.minutes / maxMinutes) * chartHeight, 4) : 4;
                    const hoursLabel =
                      day.minutes >= 60
                        ? `${Math.floor(day.minutes / 60)}h`
                        : day.minutes > 0
                          ? `${day.minutes}m`
                          : '';
                    return (
                      <View key={index} style={styles.barContainer}>
                        {/* Hour label above bar */}
                        <Text
                          variant="labelSmall"
                          style={{
                            color: theme.colors.onSurfaceVariant,
                            marginBottom: 4,
                            minHeight: 14,
                          }}
                        >
                          {hoursLabel}
                        </Text>
                        <View
                          style={[
                            styles.bar,
                            {
                              backgroundColor:
                                day.minutes > 0
                                  ? theme.colors.primary
                                  : theme.colors.surfaceVariant,
                              height: barHeight,
                            },
                          ]}
                        />
                        <Text
                          variant="labelSmall"
                          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                        >
                          {day.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card.Content>
            </Card>

            {/* Time Breakdown */}
            <Card style={styles.card} mode="elevated">
              <Card.Content>
                <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '600' }}>
                  Time Breakdown
                </Text>
                {timeBreakdown.length === 0 ? (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    No tracked time this period.
                  </Text>
                ) : (
                  <>
                    {timeBreakdown.map((item) => (
                      <View key={item.focusArea.id} style={styles.breakdownItem}>
                        <View style={styles.breakdownLeft}>
                          {item.focusArea.type === 'AREA' && (
                            <Ionicons
                              name="folder-outline"
                              size={16}
                              color={theme.colors.onSurfaceVariant}
                              style={{ marginRight: 8 }}
                            />
                          )}
                          <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                            {item.focusArea.icon} {item.focusArea.name}
                          </Text>
                        </View>
                        <View style={styles.breakdownRight}>
                          <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                            {formatMinutes(item.currentMinutes)}
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}
                          >
                            {item.percentage}%
                          </Text>
                        </View>
                      </View>
                    ))}
                    {/* Total row */}
                    <View style={[styles.breakdownItem, { marginTop: 8 }]}>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.primary, fontWeight: '600' }}
                      >
                        Total
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.primary, fontWeight: '600' }}
                      >
                        {formatMinutes(totalMinutes)}
                      </Text>
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>

            {/* Focus Area Progress */}
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onBackground, marginTop: 8 }]}
            >
              Focus Area Progress
            </Text>
            {focusAreaProgress.length === 0 ? (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
              >
                No tracked time this period.
              </Text>
            ) : (
              focusAreaProgress.map((item) => (
                <Card
                  key={item.focusArea.id}
                  style={styles.card}
                  mode="elevated"
                  onPress={() => router.push(`/focus-area/${item.focusArea.id}`)}
                >
                  <Card.Content>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressIcon}>{item.focusArea.icon}</Text>
                      <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                        {item.focusArea.name}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.primary, fontWeight: '600' }}
                      >
                        {formatMinutes(item.currentMinutes)}
                      </Text>
                      {item.targetMinutes && (
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                          {' '}
                          / {formatMinutes(item.targetMinutes)}
                        </Text>
                      )}
                    </View>
                    {item.targetMinutes && (
                      <ProgressBar
                        progress={item.progress}
                        color={item.progress >= 1 ? theme.colors.tertiary : theme.colors.primary}
                        style={styles.progressBar}
                      />
                    )}
                  </Card.Content>
                </Card>
              ))
            )}

            {/* Quick Stats */}
            <Card style={styles.card} mode="elevated">
              <Card.Title title="Period Stats" />
              <Card.Content>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                      {dayData.filter((d) => d.minutes > 0).length}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Active Days
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                      {formatMinutes(
                        Math.round(
                          totalMinutes / Math.max(dayData.filter((d) => d.minutes > 0).length, 1)
                        )
                      )}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Avg/Active Day
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                      {focusAreaProgress.length}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Focus Areas
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </>
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
  },
  header: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  planningNav: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  navCard: {
    flex: 1,
  },
  navCardContent: {
    alignItems: 'center',
    gap: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderRadius: 20,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 16,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    minWidth: 8,
    maxWidth: 32,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  progressIcon: {
    fontSize: 18,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
});
