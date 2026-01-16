import { create } from 'zustand';
import {
  notificationService,
  NotificationPreferences,
  TimeConfig,
} from '../services/notificationService';

interface NotificationState {
  // State
  preferences: NotificationPreferences | null;
  isInitialized: boolean;
  isLoading: boolean;

  // Actions
  initialize: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;

  // Toggle actions
  setMorningReminder: (enabled: boolean, time?: TimeConfig) => Promise<void>;
  setEveningReminder: (enabled: boolean, time?: TimeConfig) => Promise<void>;
  setWeeklyCheckIn: (enabled: boolean, time?: TimeConfig) => Promise<void>;
  setMonthlyCheckIn: (enabled: boolean, time?: TimeConfig) => Promise<void>;
  setReturnPrompts: (enabled: boolean) => Promise<void>;

  // Time update actions
  updateMorningTime: (time: TimeConfig) => Promise<void>;
  updateEveningTime: (time: TimeConfig) => Promise<void>;
  updateWeeklyTime: (time: TimeConfig) => Promise<void>;
  updateMonthlyTime: (time: TimeConfig) => Promise<void>;

  // Utility
  refreshPreferences: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  preferences: null,
  isInitialized: false,
  isLoading: false,

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      await notificationService.initialize();
      const preferences = await notificationService.getPreferences();
      set({ preferences, isInitialized: true, isLoading: false });
    } catch (error) {
      console.error('Error initializing notifications:', error);
      set({ isLoading: false });
    }
  },

  requestPermissions: async () => {
    set({ isLoading: true });
    try {
      const granted = await notificationService.requestPermissions();
      const preferences = await notificationService.getPreferences();
      set({ preferences, isLoading: false });
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      set({ isLoading: false });
      return false;
    }
  },

  setMorningReminder: async (enabled, time) => {
    set({ isLoading: true });
    try {
      const currentPrefs = get().preferences;
      const newTime = time || currentPrefs?.morningReminderTime || { hour: 8, minute: 0 };

      const preferences = await notificationService.updatePreferences({
        morningReminderEnabled: enabled,
        morningReminderTime: newTime,
      });

      if (enabled) {
        await notificationService.scheduleMorningReminder(newTime);
      } else {
        await notificationService.cancelMorningReminder();
      }

      set({ preferences, isLoading: false });
    } catch (error) {
      console.error('Error setting morning reminder:', error);
      set({ isLoading: false });
    }
  },

  setEveningReminder: async (enabled, time) => {
    set({ isLoading: true });
    try {
      const currentPrefs = get().preferences;
      const newTime = time || currentPrefs?.eveningReminderTime || { hour: 21, minute: 0 };

      const preferences = await notificationService.updatePreferences({
        eveningReminderEnabled: enabled,
        eveningReminderTime: newTime,
      });

      if (enabled) {
        await notificationService.scheduleEveningReminder(newTime);
      } else {
        await notificationService.cancelEveningReminder();
      }

      set({ preferences, isLoading: false });
    } catch (error) {
      console.error('Error setting evening reminder:', error);
      set({ isLoading: false });
    }
  },

  setWeeklyCheckIn: async (enabled, time) => {
    set({ isLoading: true });
    try {
      const currentPrefs = get().preferences;
      const newTime = time || currentPrefs?.weeklyCheckInTime || { hour: 9, minute: 0 };

      const preferences = await notificationService.updatePreferences({
        weeklyCheckInEnabled: enabled,
        weeklyCheckInTime: newTime,
      });

      if (enabled) {
        await notificationService.scheduleWeeklyCheckIn(newTime);
      } else {
        await notificationService.cancelWeeklyCheckIn();
      }

      set({ preferences, isLoading: false });
    } catch (error) {
      console.error('Error setting weekly check-in:', error);
      set({ isLoading: false });
    }
  },

  setMonthlyCheckIn: async (enabled, time) => {
    set({ isLoading: true });
    try {
      const currentPrefs = get().preferences;
      const newTime = time || currentPrefs?.monthlyCheckInTime || { hour: 9, minute: 0 };

      const preferences = await notificationService.updatePreferences({
        monthlyCheckInEnabled: enabled,
        monthlyCheckInTime: newTime,
      });

      if (enabled) {
        await notificationService.scheduleMonthlyCheckIn(newTime);
      } else {
        await notificationService.cancelMonthlyCheckIn();
      }

      set({ preferences, isLoading: false });
    } catch (error) {
      console.error('Error setting monthly check-in:', error);
      set({ isLoading: false });
    }
  },

  setReturnPrompts: async (enabled) => {
    set({ isLoading: true });
    try {
      const preferences = await notificationService.updatePreferences({
        returnPromptsEnabled: enabled,
      });

      if (!enabled) {
        await notificationService.cancelReturnPrompt();
      }
      // Note: Return prompts are scheduled dynamically in todayStore based on engagement

      set({ preferences, isLoading: false });
    } catch (error) {
      console.error('Error setting return prompts:', error);
      set({ isLoading: false });
    }
  },

  updateMorningTime: async (time) => {
    const prefs = get().preferences;
    if (prefs?.morningReminderEnabled) {
      await get().setMorningReminder(true, time);
    } else {
      const preferences = await notificationService.updatePreferences({
        morningReminderTime: time,
      });
      set({ preferences });
    }
  },

  updateEveningTime: async (time) => {
    const prefs = get().preferences;
    if (prefs?.eveningReminderEnabled) {
      await get().setEveningReminder(true, time);
    } else {
      const preferences = await notificationService.updatePreferences({
        eveningReminderTime: time,
      });
      set({ preferences });
    }
  },

  updateWeeklyTime: async (time) => {
    const prefs = get().preferences;
    if (prefs?.weeklyCheckInEnabled) {
      await get().setWeeklyCheckIn(true, time);
    } else {
      const preferences = await notificationService.updatePreferences({
        weeklyCheckInTime: time,
      });
      set({ preferences });
    }
  },

  updateMonthlyTime: async (time) => {
    const prefs = get().preferences;
    if (prefs?.monthlyCheckInEnabled) {
      await get().setMonthlyCheckIn(true, time);
    } else {
      const preferences = await notificationService.updatePreferences({
        monthlyCheckInTime: time,
      });
      set({ preferences });
    }
  },

  refreshPreferences: async () => {
    const preferences = await notificationService.getPreferences();
    set({ preferences });
  },
}));

export default useNotificationStore;
