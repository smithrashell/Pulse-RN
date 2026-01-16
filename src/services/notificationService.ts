import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { format, addMonths, setDate } from 'date-fns';
import { EngagementLevel, ENGAGEMENT_MESSAGES } from './engagementService';

// Check if running in Expo Go (notifications have limited support)
const isExpoGo = Constants.appOwnership === 'expo';

// Dynamically import expo-notifications only when not in Expo Go
// This prevents the SDK 53 error that occurs just from importing the module
let Notifications: typeof import('expo-notifications') | null = null;

const getNotifications = async () => {
  if (isExpoGo) return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
  }
  return Notifications;
};

// Storage key
const PREFERENCES_KEY = 'pulse_notification_preferences';

// Notification identifiers
export const NOTIFICATION_IDS = {
  MORNING_REMINDER: 'morning-reminder',
  EVENING_REMINDER: 'evening-reminder',
  WEEKLY_CHECKIN: 'weekly-checkin',
  MONTHLY_CHECKIN: 'monthly-checkin',
  RETURN_PROMPT: 'return-prompt',
} as const;

// Notification types for deep linking
export const NOTIFICATION_TYPES = {
  MORNING_REMINDER: 'morning-reminder',
  EVENING_REMINDER: 'evening-reminder',
  WEEKLY_CHECKIN: 'weekly-checkin',
  MONTHLY_CHECKIN: 'monthly-checkin',
  RETURN_PROMPT: 'return-prompt',
} as const;

export interface TimeConfig {
  hour: number;
  minute: number;
}

export interface NotificationPreferences {
  morningReminderEnabled: boolean;
  morningReminderTime: TimeConfig;
  eveningReminderEnabled: boolean;
  eveningReminderTime: TimeConfig;
  weeklyCheckInEnabled: boolean;
  weeklyCheckInTime: TimeConfig;
  monthlyCheckInEnabled: boolean;
  monthlyCheckInTime: TimeConfig;
  returnPromptsEnabled: boolean;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  morningReminderEnabled: false,
  morningReminderTime: { hour: 8, minute: 0 },
  eveningReminderEnabled: false,
  eveningReminderTime: { hour: 21, minute: 0 },
  weeklyCheckInEnabled: false,
  weeklyCheckInTime: { hour: 9, minute: 0 },
  monthlyCheckInEnabled: false,
  monthlyCheckInTime: { hour: 9, minute: 0 },
  returnPromptsEnabled: true,
  permissionStatus: 'undetermined',
};

// Notification content
const NOTIFICATION_CONTENT = {
  morning: {
    title: 'Good Morning',
    body: 'What will you focus on today?',
  },
  evening: {
    title: 'Evening Reflection',
    body: 'How did today go?',
  },
  weekly: {
    title: 'Weekly Review',
    body: 'Close the loop on last week',
  },
  monthly: {
    title: 'Monthly Review',
    body: 'Review your outcomes from last month',
  },
};

export const notificationService = {
  // Initialize notification service
  async initialize(): Promise<void> {
    // Skip in Expo Go (limited notification support)
    if (isExpoGo) {
      console.log('[Notifications] Running in Expo Go - notifications have limited support');
      return;
    }

    const notifications = await getNotifications();
    if (!notifications) return;

    // Set up notification handler for foreground notifications
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Sync scheduled notifications with current preferences
    await this.syncScheduledNotifications();
  },

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    if (isExpoGo) return false;
    const notifications = await getNotifications();
    if (!notifications) return false;

    const { status: existingStatus } = await notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      await this.updatePreferences({ permissionStatus: 'granted' });
      return true;
    }

    const { status } = await notifications.requestPermissionsAsync();
    const granted = status === 'granted';

    await this.updatePreferences({
      permissionStatus: granted ? 'granted' : 'denied',
    });

    return granted;
  },

  // Get current permission status
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    if (isExpoGo) return 'undetermined';
    const notifications = await getNotifications();
    if (!notifications) return 'undetermined';

    const { status } = await notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  },

  // Get preferences from storage
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await SecureStore.getItemAsync(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle any new fields
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Error reading notification preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  },

  // Update preferences in storage
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...updates };

    try {
      await SecureStore.setItemAsync(PREFERENCES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }

    return updated;
  },

  // Schedule morning reminder
  async scheduleMorningReminder(time: TimeConfig): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;

    await this.cancelMorningReminder();

    await notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.MORNING_REMINDER,
      content: {
        title: NOTIFICATION_CONTENT.morning.title,
        body: NOTIFICATION_CONTENT.morning.body,
        data: { type: NOTIFICATION_TYPES.MORNING_REMINDER },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
  },

  // Cancel morning reminder
  async cancelMorningReminder(): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;
    await notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.MORNING_REMINDER);
  },

  // Schedule evening reminder
  async scheduleEveningReminder(time: TimeConfig): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;

    await this.cancelEveningReminder();

    await notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.EVENING_REMINDER,
      content: {
        title: NOTIFICATION_CONTENT.evening.title,
        body: NOTIFICATION_CONTENT.evening.body,
        data: { type: NOTIFICATION_TYPES.EVENING_REMINDER },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
  },

  // Cancel evening reminder
  async cancelEveningReminder(): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;
    await notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.EVENING_REMINDER);
  },

  // Schedule weekly check-in (Mondays)
  async scheduleWeeklyCheckIn(time: TimeConfig): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;

    await this.cancelWeeklyCheckIn();

    await notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.WEEKLY_CHECKIN,
      content: {
        title: NOTIFICATION_CONTENT.weekly.title,
        body: NOTIFICATION_CONTENT.weekly.body,
        data: { type: NOTIFICATION_TYPES.WEEKLY_CHECKIN },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2, // Monday (1=Sunday, 2=Monday, etc.)
        hour: time.hour,
        minute: time.minute,
      },
    });
  },

  // Cancel weekly check-in
  async cancelWeeklyCheckIn(): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;
    await notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.WEEKLY_CHECKIN);
  },

  // Schedule monthly check-in (1st of month)
  async scheduleMonthlyCheckIn(time: TimeConfig): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;

    await this.cancelMonthlyCheckIn();

    // expo-notifications doesn't support "day of month" triggers directly
    // So we schedule for the next 1st of the month and reschedule when received
    const nextFirst = this.getNextFirstOfMonth(time);

    await notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.MONTHLY_CHECKIN,
      content: {
        title: NOTIFICATION_CONTENT.monthly.title,
        body: `Review your outcomes from ${format(new Date(), 'MMMM')}`,
        data: { type: NOTIFICATION_TYPES.MONTHLY_CHECKIN },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: nextFirst,
      },
    });
  },

  // Get the next 1st of month date
  getNextFirstOfMonth(time: TimeConfig): Date {
    const now = new Date();
    let nextFirst = setDate(now, 1);
    nextFirst.setHours(time.hour, time.minute, 0, 0);

    // If we're past the 1st this month, or it's today but past the time, go to next month
    if (now > nextFirst) {
      nextFirst = setDate(addMonths(now, 1), 1);
      nextFirst.setHours(time.hour, time.minute, 0, 0);
    }

    return nextFirst;
  },

  // Cancel monthly check-in
  async cancelMonthlyCheckIn(): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;
    await notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.MONTHLY_CHECKIN);
  },

  // Schedule return prompt based on engagement level
  async scheduleReturnPrompt(engagementLevel: EngagementLevel): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;

    await this.cancelReturnPrompt();

    // Only schedule for non-ACTIVE levels
    if (engagementLevel === 'ACTIVE') return;

    const message = ENGAGEMENT_MESSAGES[engagementLevel];

    // Schedule for tomorrow at 10am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    await notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.RETURN_PROMPT,
      content: {
        title: message.title,
        body: message.message,
        data: { type: NOTIFICATION_TYPES.RETURN_PROMPT, engagementLevel },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });
  },

  // Cancel return prompt
  async cancelReturnPrompt(): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;
    await notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.RETURN_PROMPT);
  },

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    if (isExpoGo) return;
    const notifications = await getNotifications();
    if (!notifications) return;
    await notifications.cancelAllScheduledNotificationsAsync();
  },

  // Sync scheduled notifications with current preferences
  async syncScheduledNotifications(): Promise<void> {
    if (isExpoGo) return;
    const prefs = await this.getPreferences();

    // Update permission status
    const permissionStatus = await this.getPermissionStatus();
    if (permissionStatus !== prefs.permissionStatus) {
      await this.updatePreferences({ permissionStatus });
    }

    // If no permission, cancel all and return
    if (permissionStatus !== 'granted') {
      await this.cancelAllNotifications();
      return;
    }

    // Sync morning reminder
    if (prefs.morningReminderEnabled) {
      await this.scheduleMorningReminder(prefs.morningReminderTime);
    } else {
      await this.cancelMorningReminder();
    }

    // Sync evening reminder
    if (prefs.eveningReminderEnabled) {
      await this.scheduleEveningReminder(prefs.eveningReminderTime);
    } else {
      await this.cancelEveningReminder();
    }

    // Sync weekly check-in
    if (prefs.weeklyCheckInEnabled) {
      await this.scheduleWeeklyCheckIn(prefs.weeklyCheckInTime);
    } else {
      await this.cancelWeeklyCheckIn();
    }

    // Sync monthly check-in
    if (prefs.monthlyCheckInEnabled) {
      await this.scheduleMonthlyCheckIn(prefs.monthlyCheckInTime);
    } else {
      await this.cancelMonthlyCheckIn();
    }

    // Note: Return prompts are scheduled dynamically based on engagement state
    // They are handled in todayStore when loading engagement state
  },

  // Clear all notification data (for testing/reset)
  async clearAll(): Promise<void> {
    await this.cancelAllNotifications();
    await SecureStore.deleteItemAsync(PREFERENCES_KEY);
  },

  // Reschedule monthly notification (call this when monthly notification is received)
  async rescheduleMonthlyCheckIn(): Promise<void> {
    if (isExpoGo) return;
    const prefs = await this.getPreferences();
    if (prefs.monthlyCheckInEnabled) {
      await this.scheduleMonthlyCheckIn(prefs.monthlyCheckInTime);
    }
  },
};

export default notificationService;
