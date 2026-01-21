import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme, Chip, TouchableRipple, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TodayDiscipline, disciplineService } from '../../services';
import { DisciplineRating } from '../../db/schema';

interface TodayDisciplinesCardProps {
  disciplines: TodayDiscipline[];
  onCheckIn: (
    disciplineId: number,
    rating: DisciplineRating,
    actualTime?: string
  ) => Promise<void>;
  showTitle?: boolean;
  compact?: boolean;
}

const RATING_OPTIONS: { value: DisciplineRating; label: string; icon: string }[] = [
  { value: 'NAILED_IT', label: 'Nailed it', icon: 'checkmark-circle' },
  { value: 'CLOSE', label: 'Close', icon: 'checkmark-circle-outline' },
  { value: 'MISSED', label: 'Missed', icon: 'close-circle-outline' },
];

export function TodayDisciplinesCard({
  disciplines,
  onCheckIn,
  showTitle = true,
  compact = false,
}: TodayDisciplinesCardProps) {
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (disciplines.length === 0) {
    return null;
  }

  const getRatingColor = (rating: DisciplineRating) => {
    switch (rating) {
      case 'NAILED_IT':
        return theme.colors.tertiary;
      case 'CLOSE':
        return theme.colors.primary;
      case 'MISSED':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  const handleRatingPress = async (disciplineId: number, rating: DisciplineRating) => {
    await onCheckIn(disciplineId, rating);
    setExpandedId(null);
  };

  // Calculate summary stats
  const applicableToday = disciplines.filter((d) => d.isApplicableToday);
  const checkedIn = applicableToday.filter((d) => d.todayCheck);
  const pending = applicableToday.filter((d) => !d.todayCheck);

  // Compact mode - minimal card for side-by-side layout
  if (compact) {
    return (
      <Card style={styles.compactCard} mode="elevated">
        <TouchableRipple onPress={() => router.push('/disciplines')} style={styles.compactContent}>
          <View>
            {/* Header */}
            <View style={styles.compactHeader}>
              <Ionicons name="flash-outline" size={18} color={theme.colors.primary} />
              <Text variant="titleSmall" style={styles.compactTitle} numberOfLines={1}>
                Disciplines
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
            </View>

            {/* Status */}
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {checkedIn.length}/{applicableToday.length} today
            </Text>

            {/* First pending discipline as preview */}
            {pending.length > 0 && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                {pending[0].discipline.title}
              </Text>
            )}
            {pending.length === 0 && applicableToday.length > 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.tertiary }}>
                All done!
              </Text>
            )}
          </View>
        </TouchableRipple>
      </Card>
    );
  }

  return (
    <Card style={styles.card} mode="elevated">
      {showTitle && (
        <TouchableRipple onPress={() => router.push('/disciplines')}>
          <Card.Title
            title="Today's Disciplines"
            right={(props) => (
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.onSurfaceVariant}
                style={{ marginRight: 16 }}
              />
            )}
          />
        </TouchableRipple>
      )}
      <Card.Content>
        {disciplines.map((item, index) => {
          const { discipline, isApplicableToday, todayCheck, streak, nextApplicableDay } = item;
          const isExpanded = expandedId === discipline.id;
          const isCheckedIn = !!todayCheck;

          return (
            <View key={discipline.id}>
              {index > 0 && <Divider style={styles.divider} />}

              <TouchableRipple
                onPress={() => {
                  if (isApplicableToday && !isCheckedIn) {
                    setExpandedId(isExpanded ? null : discipline.id);
                  } else {
                    router.push(`/disciplines/${discipline.id}`);
                  }
                }}
                style={styles.disciplineRow}
              >
                <View>
                  <View style={styles.disciplineHeader}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                        {discipline.title}
                      </Text>
                      {discipline.targetTime && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {discipline.targetTime}
                          {discipline.flexibilityMinutes &&
                            ` (±${discipline.flexibilityMinutes}min)`}
                        </Text>
                      )}
                    </View>

                    {!isApplicableToday ? (
                      <View style={styles.notTodayBadge}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Next: {nextApplicableDay}
                        </Text>
                      </View>
                    ) : isCheckedIn ? (
                      <View style={styles.checkedBadge}>
                        <Ionicons
                          name={
                            todayCheck.rating === 'NAILED_IT'
                              ? 'checkmark-circle'
                              : todayCheck.rating === 'CLOSE'
                                ? 'checkmark-circle-outline'
                                : 'close-circle-outline'
                          }
                          size={20}
                          color={getRatingColor(todayCheck.rating)}
                        />
                        <Text
                          variant="bodySmall"
                          style={{ marginLeft: 4, color: getRatingColor(todayCheck.rating) }}
                        >
                          {todayCheck.rating.replace('_', ' ')}
                        </Text>
                      </View>
                    ) : (
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </View>

                  {streak > 0 && (
                    <View style={styles.streakRow}>
                      <Ionicons name="flame" size={14} color={theme.colors.primary} />
                      <Text
                        variant="bodySmall"
                        style={{ marginLeft: 4, color: theme.colors.primary }}
                      >
                        {streak} day streak
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableRipple>

              {/* Expanded rating selection */}
              {isExpanded && isApplicableToday && !isCheckedIn && (
                <View style={styles.ratingSection}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    How'd it go?
                  </Text>
                  <View style={styles.ratingButtons}>
                    {RATING_OPTIONS.map((option) => (
                      <Chip
                        key={option.value}
                        mode="outlined"
                        onPress={() => handleRatingPress(discipline.id, option.value)}
                        icon={() => (
                          <Ionicons
                            name={option.icon as keyof typeof Ionicons.glyphMap}
                            size={16}
                            color={getRatingColor(option.value)}
                          />
                        )}
                        style={styles.ratingChip}
                        compact
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  compactCard: {
    flex: 1,
  },
  compactContent: {
    padding: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTitle: {
    flex: 1,
    marginLeft: 6,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
  },
  disciplineRow: {
    paddingVertical: 8,
  },
  disciplineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notTodayBadge: {
    opacity: 0.6,
  },
  checkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingChip: {
    marginRight: 0,
  },
});

export default TodayDisciplinesCard;
