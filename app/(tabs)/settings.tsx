import { ScrollView, StyleSheet, Alert, Share } from 'react-native';
import { Text, Card, List, Switch, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { focusAreaQueries, sessionQueries } from '../../src/db/queries';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const theme = useTheme();
  const [dailyReminder, setDailyReminder] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [stats, setStats] = useState({ focusAreas: 0, sessions: 0, totalMinutes: 0 });
  const [isExporting, setIsExporting] = useState(false);

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

  const appVersion = Constants.expoConfig?.version || '1.0.0';

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
        <Card style={styles.card} mode="elevated">
          <List.Item
            title="Daily Reminder"
            description="Remind me to track time each day"
            left={() => (
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
            right={() => <Switch value={dailyReminder} onValueChange={setDailyReminder} />}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Weekly Report"
            description="Summary of weekly progress"
            left={() => (
              <Ionicons
                name="bar-chart-outline"
                size={24}
                color={theme.colors.onSurface}
                style={styles.listIcon}
              />
            )}
            right={() => <Switch value={weeklyReport} onValueChange={setWeeklyReport} />}
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
  footer: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
});
