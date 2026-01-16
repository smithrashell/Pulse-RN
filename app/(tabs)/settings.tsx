import { ScrollView, StyleSheet, Alert, Share, View, Platform } from 'react-native';
import {
  Text,
  Card,
  List,
  Switch,
  Divider,
  useTheme,
  ActivityIndicator,
  Portal,
  Modal,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { focusAreaQueries, sessionQueries } from '../../src/db/queries';
import { useNotifications, formatNotificationTime } from '../../src/hooks/useNotifications';
import { TimeConfig } from '../../src/services/notificationService';
import Constants from 'expo-constants';

type NotificationType = 'morning' | 'evening' | 'weekly' | 'monthly';

export default function SettingsScreen() {
  const theme = useTheme();
  const {
    preferences,
    isLoading: notificationLoading,
    hasPermission,
    permissionDenied,
    toggleMorningReminder,
    toggleEveningReminder,
    toggleWeeklyCheckIn,
    toggleMonthlyCheckIn,
    toggleReturnPrompts,
    updateMorningTime,
    updateEveningTime,
    updateWeeklyTime,
    updateMonthlyTime,
  } = useNotifications();

  const [stats, setStats] = useState({ focusAreas: 0, sessions: 0, totalMinutes: 0 });
  const [isExporting, setIsExporting] = useState(false);

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingType, setEditingType] = useState<NotificationType | null>(null);
  const [tempTime, setTempTime] = useState(new Date());

  const loadStats = useCallback(async () => {
    try {
      const allFocusAreas = await focusAreaQueries.getAll();
      const allSessions = await sessionQueries.getAll();
      const totalMinutes = allSessions
        .filter((s) => s.durationMinutes)
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      setStats({
        focusAreas: allFocusAreas.length,
        sessions: allSessions.filter((s) => s.endTime).length,
        totalMinutes,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const formatTotalTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const focusAreas = await focusAreaQueries.getAll();
      const sessions = await sessionQueries.getAll();

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        focusAreas: focusAreas.map((fa) => ({
          ...fa,
          startedAt: fa.startedAt.toISOString(),
          createdAt: fa.createdAt.toISOString(),
          completedAt: fa.completedAt?.toISOString(),
        })),
        sessions: sessions.map((s) => ({
          ...s,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime?.toISOString(),
        })),
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: jsonString,
        title: 'Pulse Export',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage !== 'Share dismissed') {
        Alert.alert('Export Error', 'Failed to export data. Please try again.');
        console.error('Export error:', error);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your focus areas and sessions. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            Alert.alert('Are you sure?', 'Please confirm that you want to delete all data.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, Delete Everything',
                style: 'destructive',
                onPress: async () => {
                  // TODO: Implement clear all data
                  Alert.alert('Info', 'Clear data functionality coming soon');
                },
              },
            ]);
          },
        },
      ]
    );
  };

  // Time picker handlers
  const openTimePicker = (type: NotificationType) => {
    let currentTime: TimeConfig;
    switch (type) {
      case 'morning':
        currentTime = preferences?.morningReminderTime || { hour: 8, minute: 0 };
        break;
      case 'evening':
        currentTime = preferences?.eveningReminderTime || { hour: 21, minute: 0 };
        break;
      case 'weekly':
        currentTime = preferences?.weeklyCheckInTime || { hour: 9, minute: 0 };
        break;
      case 'monthly':
        currentTime = preferences?.monthlyCheckInTime || { hour: 9, minute: 0 };
        break;
    }
    const date = new Date();
    date.setHours(currentTime.hour, currentTime.minute, 0, 0);
    setTempTime(date);
    setEditingType(type);
    setShowTimePicker(true);
  };

  const handleTimeChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selectedDate && editingType) {
        saveTime(editingType, selectedDate);
      }
    } else if (selectedDate) {
      setTempTime(selectedDate);
    }
  };

  const saveTime = async (type: NotificationType, date: Date) => {
    const time: TimeConfig = { hour: date.getHours(), minute: date.getMinutes() };
    switch (type) {
      case 'morning':
        await updateMorningTime(time);
        break;
      case 'evening':
        await updateEveningTime(time);
        break;
      case 'weekly':
        await updateWeeklyTime(time);
        break;
      case 'monthly':
        await updateMonthlyTime(time);
        break;
    }
  };

  const handleTimePickerDone = () => {
    if (editingType) {
      saveTime(editingType, tempTime);
    }
    setShowTimePicker(false);
    setEditingType(null);
  };

  // Toggle handlers
  const handleMorningToggle = async (value: boolean) => {
    const success = await toggleMorningReminder(value);
    if (!success && value) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive reminders.'
      );
    }
  };

  const handleEveningToggle = async (value: boolean) => {
    const success = await toggleEveningReminder(value);
    if (!success && value) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive reminders.'
      );
    }
  };

  const handleWeeklyToggle = async (value: boolean) => {
    const success = await toggleWeeklyCheckIn(value);
    if (!success && value) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive reminders.'
      );
    }
  };

  const handleMonthlyToggle = async (value: boolean) => {
    const success = await toggleMonthlyCheckIn(value);
    if (!success && value) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive reminders.'
      );
    }
  };

  const handleReturnPromptsToggle = async (value: boolean) => {
    const success = await toggleReturnPrompts(value);
    if (!success && value) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive reminders.'
      );
    }
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const renderTimeButton = (type: NotificationType, time: TimeConfig | undefined, enabled: boolean) => {
    if (!enabled) return null;
    const displayTime = time ? formatNotificationTime(time) : '--:--';
    return (
      <Button
        mode="text"
        compact
        onPress={() => openTimePicker(type)}
        disabled={notificationLoading}
      >
        {displayTime}
      </Button>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Data Section */}
        <Text variant="labelLarge" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          Data
        </Text>
        <Card style={styles.card} mode="elevated">
          <List.Item
            title="Export Data"
            description="Export focus areas and sessions as JSON"
            left={() => (
              <Ionicons
                name="cloud-download-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
            right={() =>
              isExporting ? (
                <ActivityIndicator size="small" />
              ) : (
                <Ionicons name="share-outline" size={20} color={theme.colors.onSurfaceVariant} />
              )
            }
            onPress={handleExport}
            disabled={isExporting}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Clear All Data"
            description="Delete all focus areas and sessions"
            left={() => (
              <Ionicons
                name="trash-outline"
                size={24}
                color={theme.colors.error}
                style={styles.listIcon}
              />
            )}
            titleStyle={{ color: theme.colors.error }}
            onPress={handleClearData}
          />
        </Card>

        {/* Notifications Section */}
        <Text variant="labelLarge" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          Notifications
        </Text>

        {permissionDenied && (
          <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer }]} mode="elevated">
            <Card.Content>
              <Text style={{ color: theme.colors.onErrorContainer }}>
                Notification permission was denied. Please enable notifications in your device
                settings to use reminders.
              </Text>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card} mode="elevated">
          {/* Morning Reminder */}
          <List.Item
            title="Morning Intention"
            description="What will you focus on today?"
            left={() => (
              <Ionicons
                name="sunny-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
            right={() => (
              <View style={styles.toggleRow}>
                {renderTimeButton(
                  'morning',
                  preferences?.morningReminderTime,
                  preferences?.morningReminderEnabled || false
                )}
                <Switch
                  value={preferences?.morningReminderEnabled || false}
                  onValueChange={handleMorningToggle}
                  disabled={notificationLoading}
                />
              </View>
            )}
          />
          <Divider style={styles.divider} />

          {/* Evening Reminder */}
          <List.Item
            title="Evening Reflection"
            description="How did today go?"
            left={() => (
              <Ionicons
                name="moon-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
            right={() => (
              <View style={styles.toggleRow}>
                {renderTimeButton(
                  'evening',
                  preferences?.eveningReminderTime,
                  preferences?.eveningReminderEnabled || false
                )}
                <Switch
                  value={preferences?.eveningReminderEnabled || false}
                  onValueChange={handleEveningToggle}
                  disabled={notificationLoading}
                />
              </View>
            )}
          />
          <Divider style={styles.divider} />

          {/* Weekly Check-in */}
          <List.Item
            title="Weekly Review"
            description="Mondays - Close the loop on last week"
            left={() => (
              <Ionicons
                name="calendar-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
            right={() => (
              <View style={styles.toggleRow}>
                {renderTimeButton(
                  'weekly',
                  preferences?.weeklyCheckInTime,
                  preferences?.weeklyCheckInEnabled || false
                )}
                <Switch
                  value={preferences?.weeklyCheckInEnabled || false}
                  onValueChange={handleWeeklyToggle}
                  disabled={notificationLoading}
                />
              </View>
            )}
          />
          <Divider style={styles.divider} />

          {/* Monthly Check-in */}
          <List.Item
            title="Monthly Review"
            description="1st of month - Review your outcomes"
            left={() => (
              <Ionicons
                name="albums-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
            right={() => (
              <View style={styles.toggleRow}>
                {renderTimeButton(
                  'monthly',
                  preferences?.monthlyCheckInTime,
                  preferences?.monthlyCheckInEnabled || false
                )}
                <Switch
                  value={preferences?.monthlyCheckInEnabled || false}
                  onValueChange={handleMonthlyToggle}
                  disabled={notificationLoading}
                />
              </View>
            )}
          />
          <Divider style={styles.divider} />

          {/* Return Prompts */}
          <List.Item
            title="Gentle Return Prompts"
            description="Encouragement when you've been away"
            left={() => (
              <Ionicons
                name="heart-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
            right={() => (
              <Switch
                value={preferences?.returnPromptsEnabled || false}
                onValueChange={handleReturnPromptsToggle}
                disabled={notificationLoading}
              />
            )}
          />
        </Card>

        {/* Appearance Section */}
        <Text variant="labelLarge" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          Appearance
        </Text>
        <Card style={styles.card} mode="elevated">
          <List.Item
            title="Theme"
            description="Follows system settings"
            left={() => (
              <Ionicons
                name="color-palette-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
          />
        </Card>

        {/* About Section */}
        <Text variant="labelLarge" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          About
        </Text>
        <Card style={styles.card} mode="elevated">
          <List.Item
            title="Version"
            description={`${appVersion} (React Native)`}
            left={() => (
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Statistics"
            description={`${stats.focusAreas} focus areas • ${stats.sessions} sessions • ${formatTotalTime(stats.totalMinutes)} tracked`}
            left={() => (
              <Ionicons
                name="stats-chart-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
          />
        </Card>

        {/* Footer */}
        <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>
          Pulse - Track your time, build your life
        </Text>
      </ScrollView>

      {/* Time Picker Modal - iOS */}
      {Platform.OS === 'ios' && (
        <Portal>
          <Modal
            visible={showTimePicker}
            onDismiss={() => setShowTimePicker(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>
              Set Time
            </Text>
            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              style={{ height: 150 }}
            />
            <View style={styles.modalActions}>
              <Button onPress={() => setShowTimePicker(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleTimePickerDone}>
                Done
              </Button>
            </View>
          </Modal>
        </Portal>
      )}

      {/* Time Picker - Android (inline) */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
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
  sectionHeader: {
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    marginBottom: 24,
  },
  divider: {
    marginLeft: 56,
  },
  listIcon: {
    marginLeft: 8,
    alignSelf: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
