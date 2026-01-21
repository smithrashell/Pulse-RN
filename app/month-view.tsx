import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  IconButton,
  ActivityIndicator,
  TouchableRipple,
  ProgressBar,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  isToday,
  isFuture,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isWeekend,
  getISOWeek,
} from 'date-fns';
import {
  historyQueries,
  DayActivity,
  monthlyOutcomeQueries,
  disciplineQueries,
  disciplineCheckQueries,
} from '../src/db/queries';
import { MonthlyOutcome, Discipline, DisciplineCheck } from '../src/db/schema';
import { formatMinutes } from '../src/utils/time';
import { useTodayStore } from '../src/stores/todayStore';
import { formatQuarter } from '../src/utils/quarter';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Account for: scrollContent padding (16*2) + Card.Content padding (16*2) = 64
const DAY_CELL_SIZE = Math.floor((SCREEN_WIDTH - 64) / 7);

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Format minutes as compact string (1h13m, 45m, etc)
function formatMinutesShort(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

// Types for new sections
interface DisciplineSummary {
  discipline: Discipline;
  completedDays: number;
  expectedDays: number;
  progress: number;
}

interface WeekSummary {
  weekNumber: number;
  startDate: Date;
  totalMinutes: number;
  activeDays: number;
  totalDaysInMonth: number;
}

export default function MonthViewScreen() {
  const theme = useTheme();
  const selectDate = useTodayStore((s) => s.selectDate);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<DayActivity[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [monthlyOutcomes, setMonthlyOutcomes] = useState<MonthlyOutcome[]>([]);
  const [comparison, setComparison] = useState<{
    previousMonth: number;
    percentChange: number | null;
  }>({ previousMonth: 0, percentChange: null });
  const [disciplineSummaries, setDisciplineSummaries] = useState<DisciplineSummary[]>([]);
  const [weekSummaries, setWeekSummaries] = useState<WeekSummary[]>([]);

  const loadMonthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const today = new Date();

      const [activityData, outcomes, activeDisciplines] = await Promise.all([
        historyQueries.getMonthActivityData(currentMonth),
        monthlyOutcomeQueries.getForMonth(currentMonth),
        disciplineQueries.getActive(),
      ]);
      setDays(activityData.days);
      setTotalMinutes(activityData.totalMinutes);
      setActiveDays(activityData.activeDays);
      setComparison(activityData.comparison);
      setMonthlyOutcomes(outcomes);

      // Calculate discipline summaries
      const disciplineSummaryPromises = activeDisciplines.map(async (discipline) => {
        const checks = await disciplineCheckQueries.getForDiscipline(discipline.id);
        const monthChecks = checks.filter((check) => {
          const checkDate = new Date(check.date);
          return checkDate >= monthStart && checkDate <= monthEnd;
        });
        const completedDays = monthChecks.filter(
          (c) => c.rating === 'NAILED_IT' || c.rating === 'CLOSE'
        ).length;

        // Calculate expected days based on frequency
        const daysInMonth = eachDayOfInterval({
          start: monthStart,
          end: isFuture(monthEnd) ? today : monthEnd,
        });
        let expectedDays = 0;
        for (const day of daysInMonth) {
          if (isFuture(day)) continue;
          const dayOfWeek = format(day, 'EEEE').toLowerCase();
          const isWeekendDay = isWeekend(day);

          switch (discipline.frequency) {
            case 'DAILY':
              expectedDays++;
              break;
            case 'WEEKDAYS':
              if (!isWeekendDay) expectedDays++;
              break;
            case 'WEEKENDS':
              if (isWeekendDay) expectedDays++;
              break;
            case 'SPECIFIC_DAYS':
              if (discipline.specificDays) {
                const specificDays = JSON.parse(discipline.specificDays) as string[];
                if (specificDays.includes(dayOfWeek)) expectedDays++;
              }
              break;
            case 'ALWAYS':
              expectedDays++;
              break;
          }
        }

        const progress = expectedDays > 0 ? completedDays / expectedDays : 0;
        return { discipline, completedDays, expectedDays, progress };
      });
      const summaries = await Promise.all(disciplineSummaryPromises);
      setDisciplineSummaries(summaries);

      // Calculate week summaries from activity data
      const weekMap = new Map<number, WeekSummary>();
      for (const day of activityData.days) {
        const dayDate = new Date(day.date);
        const weekNum = getISOWeek(dayDate);
        const weekStart = startOfWeek(dayDate, { weekStartsOn: 1 });

        if (!weekMap.has(weekNum)) {
          weekMap.set(weekNum, {
            weekNumber: weekNum,
            startDate: weekStart,
            totalMinutes: 0,
            activeDays: 0,
            totalDaysInMonth: 0,
          });
        }
        const week = weekMap.get(weekNum)!;
        week.totalMinutes += day.totalMinutes;
        if (day.totalMinutes > 0) week.activeDays++;
        if (isSameMonth(dayDate, currentMonth)) week.totalDaysInMonth++;
      }
      setWeekSummaries(
        Array.from(weekMap.values()).sort((a, b) => a.weekNumber - b.weekNumber)
      );
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadMonthData();
    }, [loadMonthData])
  );

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayPress = async (dateStr: string) => {
    // Select the date in the store, then navigate to Today screen
    await selectDate(new Date(dateStr));
    router.push('/');
  };

  // Get the day of week for the first day of the month (0 = Sunday, 1 = Monday, etc.)
  // We want Monday = 0, so adjust
  const firstDayOfMonth = startOfMonth(currentMonth);
  const firstDayWeekday = getDay(firstDayOfMonth);
  const offsetDays = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Convert to Monday-based

  // Calculate trailing empty cells to complete the last row
  const totalCells = offsetDays + days.length;
  const trailingEmptyCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  // Get circle color based on activity (matching WeekDaySelector pattern)
  const getCircleColor = (minutes: number, dateStr: string) => {
    const date = new Date(dateStr);
    if (isFuture(date)) {
      return theme.colors.surfaceVariant;
    }
    if (minutes > 0) {
      return theme.colors.secondaryContainer;
    }
    return theme.colors.surfaceVariant;
  };

  const getCircleTextColor = (minutes: number, dateStr: string) => {
    const date = new Date(dateStr);
    if (isFuture(date)) {
      return theme.colors.onSurfaceVariant;
    }
    if (minutes > 0) {
      return theme.colors.onSecondaryContainer;
    }
    return theme.colors.onSurfaceVariant;
  };

  // Calculate average per day
  const averagePerDay = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

  // Comparison text
  const getComparisonText = () => {
    if (comparison.percentChange === null) {
      return 'First month tracked';
    }
    if (comparison.percentChange > 0) {
      return `+${comparison.percentChange}% vs last month`;
    }
    if (comparison.percentChange < 0) {
      return `${comparison.percentChange}% vs last month`;
    }
    return 'Same as last month';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with month navigation */}
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={handlePreviousMonth} />
        <Text variant="titleLarge" style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <IconButton icon="chevron-right" onPress={handleNextMonth} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary Card */}
        <Card style={styles.summaryCard} mode="elevated">
          <Card.Content>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                  {formatMinutes(totalMinutes)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Total time
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                  {activeDays}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Active days
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                  {formatMinutes(averagePerDay)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Avg/day
                </Text>
              </View>
            </View>
            <Text
              variant="bodySmall"
              style={[styles.comparisonText, { color: theme.colors.onSurfaceVariant }]}
            >
              {getComparisonText()}
            </Text>
          </Card.Content>
        </Card>

        {/* Monthly Outcomes Link */}
        {monthlyOutcomes.length > 0 && (
          <TouchableRipple
            onPress={() => router.push('/monthly-outcomes')}
            style={[styles.outcomesButton, { backgroundColor: theme.colors.secondaryContainer }]}
          >
            <View style={styles.outcomesContent}>
              <View style={styles.outcomesLeft}>
                <Ionicons name="flag-outline" size={20} color={theme.colors.onSecondaryContainer} />
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSecondaryContainer, marginLeft: 8 }}
                >
                  This Month's Outcomes ({monthlyOutcomes.length})
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.onSecondaryContainer}
              />
            </View>
          </TouchableRipple>
        )}

        {/* Calendar Grid */}
        <Card style={styles.calendarCard} mode="elevated">
          <Card.Content>
            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <View key={index} style={[styles.weekdayCell, { width: DAY_CELL_SIZE }]}>
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <View style={styles.calendarGrid}>
                {/* Empty cells for offset */}
                {Array.from({ length: offsetDays }).map((_, index) => (
                  <View
                    key={`empty-${index}`}
                    style={[styles.dayCell, styles.emptyCell, { width: DAY_CELL_SIZE }]}
                  />
                ))}

                {/* Day cells - circle with time label below */}
                {days.map((day) => {
                  const date = new Date(day.date);
                  const dayNumber = format(date, 'd');
                  const isCurrentDay = isToday(date);
                  const isFutureDay = isFuture(date);
                  const circleColor = getCircleColor(day.totalMinutes, day.date);
                  const textColor = getCircleTextColor(day.totalMinutes, day.date);

                  return (
                    <TouchableRipple
                      key={day.date}
                      onPress={() => !isFutureDay && handleDayPress(day.date)}
                      disabled={isFutureDay}
                      style={[styles.dayCell, { width: DAY_CELL_SIZE }]}
                      borderless
                    >
                      <View style={[styles.dayCellContent, isFutureDay && styles.futureDay]}>
                        {/* Circle with day number */}
                        <View
                          style={[
                            styles.dayCircle,
                            { backgroundColor: circleColor },
                            isCurrentDay && {
                              borderWidth: 2,
                              borderColor: theme.colors.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              { color: textColor },
                              isCurrentDay && { fontWeight: '700' },
                            ]}
                          >
                            {dayNumber}
                          </Text>
                        </View>
                        {/* Time label below circle */}
                        <Text
                          style={[styles.timeLabel, { color: theme.colors.onSurfaceVariant }]}
                          numberOfLines={1}
                        >
                          {day.totalMinutes > 0 ? formatMinutesShort(day.totalMinutes) : ' '}
                        </Text>
                      </View>
                    </TouchableRipple>
                  );
                })}

                {/* Trailing empty cells to complete the last row */}
                {Array.from({ length: trailingEmptyCells }).map((_, index) => (
                  <View
                    key={`trailing-${index}`}
                    style={[styles.dayCell, styles.emptyCell, { width: DAY_CELL_SIZE }]}
                  />
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Disciplines Summary */}
        {disciplineSummaries.length > 0 && (
          <Card style={styles.sectionCard} mode="elevated">
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                  Disciplines
                </Text>
                <TouchableRipple
                  onPress={() => router.push('/disciplines')}
                  style={styles.sectionLink}
                >
                  <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                    View All
                  </Text>
                </TouchableRipple>
              </View>
              {disciplineSummaries.map((summary) => (
                <View key={summary.discipline.id} style={styles.disciplineRow}>
                  <View style={styles.disciplineInfo}>
                    <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                      {summary.discipline.title}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}
                    >
                      {summary.completedDays}/{summary.expectedDays}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={Math.min(summary.progress, 1)}
                    color={
                      summary.progress >= 0.8
                        ? theme.colors.tertiary
                        : summary.progress >= 0.5
                          ? theme.colors.primary
                          : theme.colors.error
                    }
                    style={styles.disciplineProgress}
                  />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Weekly Rollup */}
        {weekSummaries.length > 0 && (
          <Card style={styles.sectionCard} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 12 }}>
                Weeks
              </Text>
              {weekSummaries.map((week, index) => (
                <View key={week.weekNumber} style={styles.weekRow}>
                  <Text variant="bodyMedium" style={styles.weekNumber}>
                    W{index + 1}
                  </Text>
                  <Text variant="bodySmall" style={styles.weekDate}>
                    {format(week.startDate, 'MMM d')}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[styles.weekTime, { color: theme.colors.primary }]}
                  >
                    {formatMinutesShort(week.totalMinutes)}
                  </Text>
                  <View style={styles.weekDots}>
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const dayData = days.find((d) => {
                        const dayDate = new Date(d.date);
                        return (
                          getISOWeek(dayDate) === week.weekNumber &&
                          dayDate.getDay() === (dayIndex === 6 ? 0 : dayIndex + 1)
                        );
                      });
                      const hasActivity = dayData && dayData.totalMinutes > 0;
                      const isInMonth = dayData && isSameMonth(new Date(dayData.date), currentMonth);
                      return (
                        <View
                          key={dayIndex}
                          style={[
                            styles.weekDot,
                            {
                              backgroundColor: !isInMonth
                                ? 'transparent'
                                : hasActivity
                                  ? theme.colors.primary
                                  : theme.colors.surfaceVariant,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            onPress={() => router.push('/review/monthly')}
            style={styles.quickActionButton}
            contentStyle={styles.quickActionContent}
            labelStyle={styles.quickActionLabel}
          >
            Monthly Review
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/monthly-outcomes')}
            style={styles.quickActionButton}
            contentStyle={styles.quickActionContent}
            labelStyle={styles.quickActionLabel}
          >
            Outcomes
          </Button>
          <Button
            mode="outlined"
            onPress={() => router.push('/quarterly-goals')}
            style={styles.quickActionButton}
            contentStyle={styles.quickActionContent}
            labelStyle={styles.quickActionLabel}
          >
            Quarter
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  monthTitle: {
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  comparisonText: {
    textAlign: 'center',
  },
  outcomesButton: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  outcomesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  outcomesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarCard: {
    marginBottom: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  emptyCell: {
    height: 54, // Match height of circle (32) + timeLabel (14) + padding (8)
  },
  dayCellContent: {
    alignItems: 'center',
    width: '100%',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 13,
  },
  timeLabel: {
    fontSize: 9,
    marginTop: 2,
    height: 12,
  },
  futureDay: {
    opacity: 0.4,
  },
  // New sections styles
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  disciplineRow: {
    marginBottom: 12,
  },
  disciplineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  disciplineProgress: {
    height: 6,
    borderRadius: 3,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  weekNumber: {
    fontWeight: '500',
    width: 32,
  },
  weekDate: {
    color: '#999',
    width: 52,
  },
  weekTime: {
    fontWeight: '600',
    width: 48,
    textAlign: 'right',
  },
  weekDots: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
  },
  quickActionContent: {
    paddingVertical: 8,
  },
  quickActionLabel: {
    fontSize: 11,
  },
});
