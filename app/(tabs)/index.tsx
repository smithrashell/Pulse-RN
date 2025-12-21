import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  FAB,
  useTheme,
  ActivityIndicator,
  Button,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { format, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTimer } from '../../src/hooks';
import { useTodayStore } from '../../src/stores';
import {
  ActiveTimer,
  QuickStartSlider,
  SessionList,
  WeekDaySelector,
  AdaptivePromptCard,
  WeeklyCheckInCard,
  MonthlyCheckInCard,
} from '../../src/components';
import { FocusArea, Session, DailyLog } from '../../src/db/schema';
import { formatMinutes } from '../../src/utils/time';
import { dailyLogQueries } from '../../src/db/queries';
import { engagementService, EngagementState } from '../../src/services/engagementService';
import { checkInService, CheckInState } from '../../src/services/checkInService';

export default function TodayScreen() {
  const theme = useTheme();
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [engagementState, setEngagementState] = useState<EngagementState | null>(null);
  const [checkInState, setCheckInState] = useState<CheckInState | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  // Timer state
  const {
    activeFocusArea,
    formattedTime,
    isRunning,
    startSession,
    startQuickSession,
    stopSession,
  } = useTimer();

  // Today store state
  const {
    rootFocusAreas,
    focusAreasById,
    todaySessions,
    aggregatedSessions,
    totalMinutesToday,
    selectedDate,
    weekDays,
    engagementState: storeEngagementState,
    isLoading,
    loadData,
    selectDate,
    deleteSession,
  } = useTodayStore();

  // Build dayMinutes map for WeekDaySelector
  const dayMinutes = React.useMemo(() => {
    const map = new Map<string, number>();
    weekDays.forEach((day) => {
      map.set(format(day.date, 'yyyy-MM-dd'), day.totalMinutes);
    });
    return map;
  }, [weekDays]);

  // Load daily log for today
  const loadDailyLog = useCallback(async () => {
    try {
      const log = await dailyLogQueries.getForDate(new Date());
      setDailyLog(log || null);
    } catch (error) {
      console.error('Error loading daily log:', error);
    }
  }, []);

  // Load engagement and check-in state
  const loadEngagementAndCheckIn = useCallback(async () => {
    try {
      const [engagement, checkIn] = await Promise.all([
        engagementService.getEngagementState(),
        checkInService.getCheckInState(),
      ]);
      setEngagementState(engagement);
      setCheckInState(checkIn);
    } catch (error) {
      console.error('Error loading engagement/check-in:', error);
    }
  }, []);

  // Load data on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      loadDailyLog();
      loadEngagementAndCheckIn();
    }, [loadData, loadDailyLog, loadEngagementAndCheckIn])
  );

  // Handler for dismissing weekly check-in
  const handleDismissWeekly = useCallback(async () => {
    await checkInService.dismissWeeklyPrompt();
    loadEngagementAndCheckIn();
  }, [loadEngagementAndCheckIn]);

  // Handler for completing weekly check-in
  const handleCompleteWeekly = useCallback(async () => {
    await checkInService.completeWeeklyCheckIn();
    loadEngagementAndCheckIn();
  }, [loadEngagementAndCheckIn]);

  // Handler for dismissing monthly check-in
  const handleDismissMonthly = useCallback(async () => {
    await checkInService.dismissMonthlyPrompt();
    loadEngagementAndCheckIn();
  }, [loadEngagementAndCheckIn]);

  // Handler for completing monthly check-in
  const handleCompleteMonthly = useCallback(async () => {
    await checkInService.completeMonthlyCheckIn();
    loadEngagementAndCheckIn();
  }, [loadEngagementAndCheckIn]);

  // Format the date header (like Android: "Thursday" with "12/18" below)
  const dayName = format(selectedDate, 'EEEE');
  const dateString = format(selectedDate, 'M/d');
  const isViewingToday = isSameDay(selectedDate, new Date());

  // Time-based check-in prompts (morning 5am-11am, evening 6pm-5am)
  const currentHour = new Date().getHours();
  const isMorning = currentHour >= 5 && currentHour < 12;
  const isEvening = currentHour >= 18 || currentHour < 5;
  const showMorningPrompt = isViewingToday && isMorning && !dailyLog?.morningIntention;
  const showEveningPrompt =
    isViewingToday && isEvening && totalMinutesToday > 0 && !dailyLog?.eveningReflection;

  // Build aggregated sessions for SessionList component
  const sessionListData = aggregatedSessions.map((agg) => {
    // Find the focus area for this aggregation using the lookup map
    const focusArea = agg.focusAreaId ? focusAreasById.get(agg.focusAreaId) || null : null;

    // Filter sessions for this focus area
    const sessionsForArea = todaySessions.filter((s) =>
      agg.focusAreaId === null ? s.focusAreaId === null : s.focusAreaId === agg.focusAreaId
    );

    return {
      focusAreaId: agg.focusAreaId,
      focusArea,
      sessions: sessionsForArea,
      totalMinutes: agg.totalMinutes,
    };
  });

  // Handle starting a session
  const handleStartSession = (focusArea: FocusArea) => {
    startSession(focusArea);
  };

  // Handle stopping a session
  const handleStopSession = async (note?: string, qualityRating?: number) => {
    await stopSession(note, qualityRating);
    loadData(); // Refresh data after stopping
  };

  // Handle deleting a session
  const handleDeleteSession = async (session: Session) => {
    await deleteSession(session.id);
  };

  // Handle resuming/continuing a session from the session list
  const handleResumeSession = (focusAreaId: number | null) => {
    if (focusAreaId === null) {
      startQuickSession();
    } else {
      const focusArea = focusAreasById.get(focusAreaId);
      if (focusArea) {
        startSession(focusArea);
      }
    }
  };

  // Calculate session count
  const sessionCount = todaySessions.length;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header - fixed at top */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <Text
          variant="headlineMedium"
          style={{ fontWeight: 'bold', color: theme.colors.onBackground }}
        >
          {dayName}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {dateString}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
      >
        {/* Week day selector */}
        <WeekDaySelector
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          dayMinutes={dayMinutes}
        />

        {/* "Back to Today" banner when viewing past days */}
        {!isViewingToday && (
          <Card
            style={[styles.card, { backgroundColor: theme.colors.secondaryContainer }]}
            mode="contained"
          >
            <Card.Content>
              <View style={styles.backToTodayRow}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer }}>
                  Viewing {dateString}
                </Text>
                <Button mode="contained-tonal" onPress={() => selectDate(new Date())} compact>
                  Back to Today
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Check-in prompts (only show when viewing today) */}
        {isViewingToday && checkInState?.showWeeklyPrompt && (
          <WeeklyCheckInCard
            incompleteIntentionsCount={checkInState.incompleteIntentionsFromLastWeek}
            onDismiss={handleDismissWeekly}
            onComplete={handleCompleteWeekly}
          />
        )}

        {isViewingToday && checkInState?.showMonthlyPrompt && (
          <MonthlyCheckInCard
            monthName={checkInState.currentMonthName}
            onDismiss={handleDismissMonthly}
            onComplete={handleCompleteMonthly}
          />
        )}

        {/* Adaptive prompt based on engagement (only show when not active) */}
        {isViewingToday &&
          engagementState &&
          engagementService.shouldShowPrompt(engagementState.level) && (
            <AdaptivePromptCard
              level={engagementState.level}
              streak={engagementState.currentStreak}
            />
          )}

        {/* Active Timer (only show when running AND viewing today) */}
        {isRunning && isViewingToday && (
          <ActiveTimer
            focusArea={activeFocusArea}
            formattedTime={formattedTime}
            onStop={handleStopSession}
          />
        )}

        {/* Quick Start Section (only show when no active timer and viewing today) */}
        {!isRunning && isViewingToday && (
          <QuickStartSlider
            focusAreas={rootFocusAreas}
            onStartSession={handleStartSession}
            onStartQuickSession={startQuickSession}
          />
        )}

        {/* Streak Card (only show when streak > 1 and viewing today) */}
        {isViewingToday && storeEngagementState && storeEngagementState.currentStreak > 1 && (
          <Card
            style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
            mode="contained"
          >
            <Card.Content>
              <View style={styles.streakRow}>
                <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                <Text
                  variant="titleMedium"
                  style={{ marginLeft: 8, color: theme.colors.primary, fontWeight: '600' }}
                >
                  {storeEngagementState.currentStreak} day streak!
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Time Today Summary - like Android layout */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.summaryRowHorizontal}>
              <View>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Time Today
                </Text>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                  {formatMinutes(totalMinutesToday)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Sessions
                </Text>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                  {sessionCount}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Morning Intention Prompt (5am-12pm, not yet filled) */}
        {showMorningPrompt && (
          <Card
            style={[styles.card, { backgroundColor: theme.colors.tertiaryContainer }]}
            mode="contained"
            onPress={() => router.push('/daily-log?mode=morning')}
          >
            <Card.Content>
              <View style={styles.dailyLogHeader}>
                <View style={styles.dailyLogTitle}>
                  <Ionicons
                    name="sunny"
                    size={20}
                    color={theme.colors.onTertiaryContainer}
                    style={{ marginRight: 8 }}
                  />
                  <Text variant="titleSmall" style={{ color: theme.colors.onTertiaryContainer }}>
                    Set Morning Intention
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.onTertiaryContainer}
                />
              </View>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onTertiaryContainer, marginTop: 4, opacity: 0.8 }}
              >
                What identity will you embody today?
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Morning Intention Completed - show entry */}
        {isViewingToday && dailyLog?.morningIntention && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.dailyLogHeader}>
                <View style={styles.dailyLogTitle}>
                  <Ionicons
                    name="sunny"
                    size={20}
                    color={theme.colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                    Morning Intention
                  </Text>
                </View>
                <IconButton
                  icon="pencil"
                  size={18}
                  iconColor={theme.colors.primary}
                  onPress={() => router.push('/daily-log?mode=morning')}
                  style={{ margin: 0 }}
                />
              </View>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurface, marginTop: 8 }}
                numberOfLines={3}
              >
                {dailyLog.morningIntention}
              </Text>
              {dailyLog.proofCommitment && (
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 4,
                    fontStyle: 'italic',
                  }}
                  numberOfLines={2}
                >
                  Proof: {dailyLog.proofCommitment}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Evening Reflection Prompt (6pm-5am, has tracked time, not yet reflected) */}
        {showEveningPrompt && (
          <Card
            style={[styles.card, { backgroundColor: theme.colors.secondaryContainer }]}
            mode="contained"
            onPress={() => router.push('/daily-log?mode=evening')}
          >
            <Card.Content>
              <View style={styles.dailyLogHeader}>
                <View style={styles.dailyLogTitle}>
                  <Ionicons
                    name="moon"
                    size={20}
                    color={theme.colors.onSecondaryContainer}
                    style={{ marginRight: 8 }}
                  />
                  <Text variant="titleSmall" style={{ color: theme.colors.onSecondaryContainer }}>
                    Evening Reflection
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.onSecondaryContainer}
                />
              </View>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSecondaryContainer, marginTop: 4, opacity: 0.8 }}
              >
                You tracked {formatMinutes(totalMinutesToday)} today. How do you feel?
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Evening Reflection Completed - show entry */}
        {isViewingToday && dailyLog?.eveningReflection && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.dailyLogHeader}>
                <View style={styles.dailyLogTitle}>
                  <Ionicons
                    name="moon"
                    size={20}
                    color={theme.colors.secondary}
                    style={{ marginRight: 8 }}
                  />
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                    Evening Reflection
                  </Text>
                </View>
                <IconButton
                  icon="pencil"
                  size={18}
                  iconColor={theme.colors.secondary}
                  onPress={() => router.push('/daily-log?mode=evening')}
                  style={{ margin: 0 }}
                />
              </View>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurface, marginTop: 8 }}
                numberOfLines={3}
              >
                {dailyLog.eveningReflection}
              </Text>
              {dailyLog.feelingRating && (
                <View style={styles.feelingRow}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Feeling:
                  </Text>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Ionicons
                      key={num}
                      name={num <= dailyLog.feelingRating! ? 'star' : 'star-outline'}
                      size={14}
                      color={
                        num <= dailyLog.feelingRating!
                          ? theme.colors.secondary
                          : theme.colors.outline
                      }
                    />
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Sessions Section */}
        <View style={styles.sessionsSection}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Sessions
          </Text>
          <SessionList
            aggregatedSessions={sessionListData}
            onDeleteSession={handleDeleteSession}
            onStartSession={isViewingToday && !isRunning ? handleResumeSession : undefined}
          />
        </View>
      </ScrollView>

      {/* FAB for quick actions */}
      {isViewingToday && !isRunning && (
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            {
              icon: 'target',
              label: 'Create Focus Area',
              onPress: () => router.push('/focus-area/create'),
            },
            {
              icon: 'folder-outline',
              label: 'Create Area',
              onPress: () => router.push('/focus-area/create-area'),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          fabStyle={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          style={styles.fabGroup}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRowHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToTodayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionsSection: {
    marginTop: 8,
  },
  dailyLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyLogTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feelingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  fab: {
    backgroundColor: undefined,
  },
  fabGroup: {
    paddingBottom: 30,
  },
});
