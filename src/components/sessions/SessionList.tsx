import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Session, FocusArea } from '../../db/schema';
import { AggregatedSessionCard } from './AggregatedSessionCard';

interface AggregatedSession {
  focusAreaId: number | null;
  focusArea: FocusArea | null;
  sessions: Session[];
  totalMinutes: number;
}

interface SessionListProps {
  aggregatedSessions: AggregatedSession[];
  onDeleteSession?: (session: Session) => void;
  onStartSession?: (focusAreaId: number | null) => void;
}

export function SessionList({
  aggregatedSessions,
  onDeleteSession,
  onStartSession,
}: SessionListProps) {
  const theme = useTheme();

  if (aggregatedSessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={48} color={theme.colors.outline} />
        <Text
          variant="bodyLarge"
          style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
        >
          No sessions recorded
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
        >
          Start a timer to begin tracking your time
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {aggregatedSessions.map((agg) => (
        <AggregatedSessionCard
          key={agg.focusAreaId ?? 'quick'}
          focusArea={agg.focusArea}
          sessions={agg.sessions}
          totalMinutes={agg.totalMinutes}
          onDeleteSession={onDeleteSession}
          onStartSession={onStartSession ? () => onStartSession(agg.focusAreaId) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    marginTop: 8,
  },
});

export default SessionList;
