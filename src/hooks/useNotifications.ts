import { useCallback } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { TimeConfig } from '../services/notificationService';

/**
 * Hook for accessing notification preferences and controls
 */
export function useNotifications() {
  const {
    preferences,
    isInitialized,
    isLoading,
    initialize,
    requestPermissions,
    setMorningReminder,
    setEveningReminder,
    setWeeklyCheckIn,
    setMonthlyCheckIn,
    setReturnPrompts,
    updateMorningTime,
    updateEveningTime,
    updateWeeklyTime,
    updateMonthlyTime,
    refreshPreferences,
  } = useNotificationStore();

  // Permission helpers
  const hasPermission = preferences?.permissionStatus === 'granted';
  const permissionDenied = preferences?.permissionStatus === 'denied';

  // Toggle with permission check
  const toggleMorningReminder = useCallback(
    async (enabled: boolean, time?: TimeConfig) => {
      if (enabled && !hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return false;
      }
      await setMorningReminder(enabled, time);
      return true;
    },
    [hasPermission, requestPermissions, setMorningReminder]
  );

  const toggleEveningReminder = useCallback(
    async (enabled: boolean, time?: TimeConfig) => {
      if (enabled && !hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return false;
      }
      await setEveningReminder(enabled, time);
      return true;
    },
    [hasPermission, requestPermissions, setEveningReminder]
  );

  const toggleWeeklyCheckIn = useCallback(
    async (enabled: boolean, time?: TimeConfig) => {
      if (enabled && !hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return false;
      }
      await setWeeklyCheckIn(enabled, time);
      return true;
    },
    [hasPermission, requestPermissions, setWeeklyCheckIn]
  );

  const toggleMonthlyCheckIn = useCallback(
    async (enabled: boolean, time?: TimeConfig) => {
      if (enabled && !hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return false;
      }
      await setMonthlyCheckIn(enabled, time);
      return true;
    },
    [hasPermission, requestPermissions, setMonthlyCheckIn]
  );

  const toggleReturnPrompts = useCallback(
    async (enabled: boolean) => {
      if (enabled && !hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return false;
      }
      await setReturnPrompts(enabled);
      return true;
    },
    [hasPermission, requestPermissions, setReturnPrompts]
  );

  return {
    // State
    preferences,
    isInitialized,
    isLoading,
    hasPermission,
    permissionDenied,

    // Actions
    initialize,
    requestPermissions,
    refreshPreferences,

    // Toggles (with permission check)
    toggleMorningReminder,
    toggleEveningReminder,
    toggleWeeklyCheckIn,
    toggleMonthlyCheckIn,
    toggleReturnPrompts,

    // Time updates
    updateMorningTime,
    updateEveningTime,
    updateWeeklyTime,
    updateMonthlyTime,
  };
}

/**
 * Format time for display
 */
export function formatNotificationTime(time: TimeConfig): string {
  const hour = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? 'AM' : 'PM';
  const minute = time.minute.toString().padStart(2, '0');
  return `${hour}:${minute} ${ampm}`;
}

export default useNotifications;
