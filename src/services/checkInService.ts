import * as SecureStore from 'expo-secure-store';
import { format, isMonday, getDate, getISOWeek, getYear } from 'date-fns';
import { weeklyIntentionQueries } from '../db/queries';

// Storage keys
const KEYS = {
  LAST_WEEKLY_CHECK_IN: 'pulse_last_weekly_check_in',
  LAST_MONTHLY_CHECK_IN: 'pulse_last_monthly_check_in',
  WEEKLY_PROMPT_DISMISSED: 'pulse_weekly_prompt_dismissed',
  MONTHLY_PROMPT_DISMISSED: 'pulse_monthly_prompt_dismissed',
};

export interface CheckInState {
  showWeeklyPrompt: boolean;
  showMonthlyPrompt: boolean;
  currentWeekIdentifier: string; // e.g., "2024-W48"
  currentMonthIdentifier: string; // e.g., "2024-12"
  currentMonthName: string; // e.g., "December"
  incompleteIntentionsFromLastWeek: number;
}

// Helper to format week as YYYY-Www
const formatWeek = (date: Date): string => {
  const year = getYear(date);
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

// Helper to format month as YYYY-MM
const formatMonth = (date: Date): string => format(date, 'yyyy-MM');

export const checkInService = {
  // Get the current check-in state
  async getCheckInState(): Promise<CheckInState> {
    const today = new Date();
    const currentWeek = formatWeek(today);
    const currentMonth = formatMonth(today);
    const currentMonthName = format(today, 'MMMM');
    const isStartOfWeek = isMonday(today);
    const isStartOfMonth = getDate(today) === 1;

    // Get stored values
    const lastWeeklyCheckIn = await SecureStore.getItemAsync(KEYS.LAST_WEEKLY_CHECK_IN);
    const lastMonthlyCheckIn = await SecureStore.getItemAsync(KEYS.LAST_MONTHLY_CHECK_IN);
    const weeklyDismissed = await SecureStore.getItemAsync(KEYS.WEEKLY_PROMPT_DISMISSED);
    const monthlyDismissed = await SecureStore.getItemAsync(KEYS.MONTHLY_PROMPT_DISMISSED);

    // Determine if we should show prompts
    const showWeeklyPrompt =
      isStartOfWeek && lastWeeklyCheckIn !== currentWeek && weeklyDismissed !== currentWeek;

    const showMonthlyPrompt =
      isStartOfMonth && lastMonthlyCheckIn !== currentMonth && monthlyDismissed !== currentMonth;

    // Get incomplete intentions from last week
    const incompleteIntentions = await weeklyIntentionQueries.getIncompleteFromLastWeek(today);

    return {
      showWeeklyPrompt,
      showMonthlyPrompt,
      currentWeekIdentifier: currentWeek,
      currentMonthIdentifier: currentMonth,
      currentMonthName,
      incompleteIntentionsFromLastWeek: incompleteIntentions.length,
    };
  },

  // Complete weekly check-in
  async completeWeeklyCheckIn(): Promise<void> {
    const currentWeek = formatWeek(new Date());
    await SecureStore.setItemAsync(KEYS.LAST_WEEKLY_CHECK_IN, currentWeek);
    // Clear any dismissal for this week
    await SecureStore.deleteItemAsync(KEYS.WEEKLY_PROMPT_DISMISSED);
  },

  // Dismiss weekly prompt (snooze)
  async dismissWeeklyPrompt(): Promise<void> {
    const currentWeek = formatWeek(new Date());
    await SecureStore.setItemAsync(KEYS.WEEKLY_PROMPT_DISMISSED, currentWeek);
  },

  // Complete monthly check-in
  async completeMonthlyCheckIn(): Promise<void> {
    const currentMonth = formatMonth(new Date());
    await SecureStore.setItemAsync(KEYS.LAST_MONTHLY_CHECK_IN, currentMonth);
    // Clear any dismissal for this month
    await SecureStore.deleteItemAsync(KEYS.MONTHLY_PROMPT_DISMISSED);
  },

  // Dismiss monthly prompt (snooze)
  async dismissMonthlyPrompt(): Promise<void> {
    const currentMonth = formatMonth(new Date());
    await SecureStore.setItemAsync(KEYS.MONTHLY_PROMPT_DISMISSED, currentMonth);
  },

  // Check if it's the start of the week
  isStartOfWeek(): boolean {
    return isMonday(new Date());
  },

  // Check if it's the start of the month
  isStartOfMonth(): boolean {
    return getDate(new Date()) === 1;
  },

  // Clear all check-in data (for testing/reset)
  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.LAST_WEEKLY_CHECK_IN);
    await SecureStore.deleteItemAsync(KEYS.LAST_MONTHLY_CHECK_IN);
    await SecureStore.deleteItemAsync(KEYS.WEEKLY_PROMPT_DISMISSED);
    await SecureStore.deleteItemAsync(KEYS.MONTHLY_PROMPT_DISMISSED);
  },
};

export default checkInService;
