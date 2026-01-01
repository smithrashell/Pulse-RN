import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  IconButton,
  ActivityIndicator,
  TouchableRipple,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths, subMonths, startOfMonth, getDay, isToday, isFuture } from 'date-fns';
import { historyQueries, DayActivity, monthlyOutcomeQueries } from '../src/db/queries';
import { MonthlyOutcome } from '../src/db/schema';
import { formatMinutes } from '../src/utils/time';
import { useTodayStore } from '../src/stores/todayStore';

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

  const loadMonthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activityData, outcomes] = await Promise.all([
        historyQueries.getMonthActivityData(currentMonth),
        monthlyOutcomeQueries.getForMonth(currentMonth),
      ]);
      setDays(activityData.days);
      setTotalMinutes(activityData.totalMinutes);
      setActiveDays(activityData.activeDays);
      setComparison(activityData.comparison);
      setMonthlyOutcomes(outcomes);
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
});
