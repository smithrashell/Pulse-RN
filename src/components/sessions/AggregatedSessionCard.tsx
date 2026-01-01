import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme, TouchableRipple, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Session, FocusArea } from '../../db/schema';
import { formatMinutes } from '../../utils/time';
import { SessionCard } from './SessionCard';

interface AggregatedSessionCardProps {
  focusArea: FocusArea | null;
  sessions: Session[];
  totalMinutes: number;
  onDeleteSession?: (session: Session) => void;
  onStartSession?: () => void;
  onEditSession?: (session: Session) => void;
}

export function AggregatedSessionCard({
  focusArea,
  sessions,
  totalMinutes,
  onDeleteSession,
  onStartSession,
  onEditSession,
}: AggregatedSessionCardProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const sessionCount = sessions.length;
  const formattedDuration = formatMinutes(totalMinutes);

  const handlePress = () => {
    if (onStartSession) {
      onStartSession();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleLongPress = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card style={styles.card} mode="elevated">
      <TouchableRipple onPress={handlePress} onLongPress={handleLongPress}>
        <Card.Content style={styles.content}>
          <View style={styles.leftSection}>
            {/* Icon and name */}
            <View style={styles.header}>
              {focusArea ? (
                <>
                  <Text style={styles.icon}>{focusArea.icon}</Text>
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurface, fontWeight: '500' }}
                    numberOfLines={1}
                  >
                    {focusArea.name}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="timer-outline" size={20} color={theme.colors.tertiary} />
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.quickTimerLabel,
                      { color: theme.colors.tertiary, fontWeight: '500' },
                    ]}
                  >
                    Quick Timer
                  </Text>
                </>
              )}
            </View>

            {/* Session count (with "Tap to continue" only when can start) */}
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {sessionCount} session{sessionCount !== 1 ? 's' : ''}
              {onStartSession ? ' • Tap to continue' : ''}
            </Text>
          </View>

          <View style={styles.rightSection}>
            {/* Total duration */}
            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {formattedDuration}
            </Text>

            {/* Play icon (only when can start) */}
            {onStartSession && <Ionicons name="play" size={20} color={theme.colors.primary} />}
          </View>
        </Card.Content>
      </TouchableRipple>

      {/* Expanded session list */}
      {isExpanded && sessions.length > 0 && (
        <View>
          <Divider />
          <View style={styles.expandedContent}>
            {sessions.map((session) => (
              <SessionCard
                key={`session-${session.id}`}
                session={session}
                focusArea={focusArea}
                onDelete={onDeleteSession ? () => onDeleteSession(session) : undefined}
                onEdit={onEditSession ? () => onEditSession(session) : undefined}
              />
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  leftSection: {
    flex: 1,
    marginRight: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  icon: {
    fontSize: 22,
  },
  quickTimerLabel: {
    marginLeft: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedContent: {
    padding: 12,
    paddingTop: 8,
  },
});

export default AggregatedSessionCard;
