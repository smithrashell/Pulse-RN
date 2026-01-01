import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Session, FocusArea } from '../../db/schema';
import { formatMinutes, formatTime } from '../../utils/time';

interface SessionCardProps {
  session: Session;
  focusArea?: FocusArea | null;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function SessionCard({ session, focusArea, onDelete, onEdit }: SessionCardProps) {
  const theme = useTheme();

  const startTime = formatTime(session.startTime);

  const endTime = session.endTime ? formatTime(session.endTime) : 'In progress';
  const duration = session.durationMinutes ? formatMinutes(session.durationMinutes) : '--';

  return (
    <Card style={styles.card} mode="outlined" onPress={onEdit}>
      <Card.Content style={styles.content}>
        <View style={styles.leftSection}>
          {/* Icon and name */}
          <View style={styles.header}>
            {focusArea ? (
              <>
                <Text style={styles.icon}>{focusArea.icon}</Text>
                <Text
                  variant="titleSmall"
                  style={{ color: theme.colors.onSurface }}
                  numberOfLines={1}
                >
                  {focusArea.name}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="timer-outline" size={18} color={theme.colors.primary} />
                <Text
                  variant="titleSmall"
                  style={[styles.quickTimerLabel, { color: theme.colors.primary }]}
                >
                  Quick Timer
                </Text>
              </>
            )}
          </View>

          {/* Time range */}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {startTime} - {endTime}
          </Text>

          {/* Note if present */}
          {session.note && (
            <Text
              variant="bodySmall"
              style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={2}
            >
              {session.note}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          {/* Duration */}
          <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {duration}
          </Text>

          {/* Quality rating */}
          {session.qualityRating && (
            <View style={styles.rating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= session.qualityRating! ? 'star' : 'star-outline'}
                  size={12}
                  color={
                    star <= session.qualityRating! ? theme.colors.primary : theme.colors.outline
                  }
                />
              ))}
            </View>
          )}

          {/* Actions */}
          {(onDelete || onEdit) && (
            <View style={styles.actions}>
              {onEdit && (
                <IconButton
                  icon={() => (
                    <Ionicons name="pencil" size={16} color={theme.colors.onSurfaceVariant} />
                  )}
                  size={20}
                  onPress={onEdit}
                />
              )}
              {onDelete && (
                <IconButton
                  icon={() => <Ionicons name="trash" size={16} color={theme.colors.error} />}
                  size={20}
                  onPress={onDelete}
                />
              )}
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  leftSection: {
    flex: 1,
    marginRight: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  icon: {
    fontSize: 18,
  },
  quickTimerLabel: {
    marginLeft: 4,
  },
  note: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  rating: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 1,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 4,
  },
});

export default SessionCard;
