import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme, TouchableRipple } from 'react-native-paper';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { QuarterlyGoal, Discipline } from '../../db/schema';
import {
  formatQuarterLabel,
  getWeekOfQuarter,
  getTotalWeeksInQuarter,
  getCurrentQuarter,
} from '../../utils/quarter';

interface QuarterlyFocusCardProps {
  goals: QuarterlyGoal[];
  disciplines: Discipline[];
  quarter?: string;
  onPress?: () => void;
  compact?: boolean;
}

function getStatusIcon(status: string): { name: string; color: string } {
  switch (status) {
    case 'COMPLETED':
      return { name: 'checkmark-circle', color: 'tertiary' };
    case 'IN_PROGRESS':
      return { name: 'radio-button-on', color: 'primary' };
    default:
      return { name: 'radio-button-off', color: 'onSurfaceVariant' };
  }
}

export function QuarterlyFocusCard({
  goals,
  disciplines,
  quarter,
  onPress,
  compact = false,
}: QuarterlyFocusCardProps) {
  const theme = useTheme();
  const currentQuarter = quarter || getCurrentQuarter();
  const weekOfQuarter = getWeekOfQuarter(new Date());
  const totalWeeks = getTotalWeeksInQuarter(currentQuarter);

  const inProgress = goals.filter((g) => g.status === 'IN_PROGRESS').length;
  const completed = goals.filter((g) => g.status === 'COMPLETED').length;
  const activeDisciplines = disciplines.filter((d) => d.status === 'ACTIVE');

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/quarterly-goals');
    }
  };

  // Don't render if no goals and no disciplines
  if (goals.length === 0 && activeDisciplines.length === 0) {
    return null;
  }

  // Compact mode - minimal card for side-by-side layout
  if (compact) {
    return (
      <Card style={styles.compactCard} mode="elevated">
        <TouchableRipple onPress={handlePress} style={styles.compactContent}>
          <View>
            {/* Header */}
            <View style={styles.compactHeader}>
              <Ionicons name="trophy-outline" size={18} color={theme.colors.primary} />
              <Text variant="titleSmall" style={styles.compactTitle} numberOfLines={1}>
                {formatQuarterLabel(currentQuarter)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
            </View>

            {/* Week progress */}
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Week {weekOfQuarter}/{totalWeeks}
            </Text>

            {/* Goals summary */}
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {completed}/{goals.length} goals{completed > 0 ? ' done' : ''}
            </Text>
          </View>
        </TouchableRipple>
      </Card>
    );
  }

  return (
    <Card style={styles.card} mode="elevated">
      <TouchableRipple onPress={handlePress}>
        <Card.Content>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.title}>
                {formatQuarterLabel(currentQuarter)} Focus
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </View>

          {/* Disciplines */}
          {activeDisciplines.length > 0 && (
            <View style={styles.section}>
              <Text
                variant="labelSmall"
                style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                DISCIPLINES
              </Text>
              {activeDisciplines.map((d) => (
                <View key={d.id} style={styles.disciplineRow}>
                  <Ionicons name="flash-outline" size={14} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={styles.disciplineText} numberOfLines={1}>
                    {d.title}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Goals */}
          {goals.length > 0 && (
            <View style={styles.section}>
              <Text
                variant="labelSmall"
                style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                MY {goals.length} GOAL{goals.length !== 1 ? 'S' : ''}
              </Text>
              <View style={styles.goalsGrid}>
                {goals.map((goal, index) => {
                  const statusIcon = getStatusIcon(goal.status);
                  return (
                    <View key={goal.id} style={styles.goalRow}>
                      <Text
                        variant="bodySmall"
                        style={[styles.goalNumber, { color: theme.colors.onSurfaceVariant }]}
                      >
                        {index + 1}.
                      </Text>
                      <Text variant="bodySmall" style={styles.goalText} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <Ionicons
                        name={statusIcon.name as keyof typeof Ionicons.glyphMap}
                        size={16}
                        color={
                          statusIcon.color === 'tertiary'
                            ? theme.colors.tertiary
                            : statusIcon.color === 'primary'
                              ? theme.colors.primary
                              : theme.colors.onSurfaceVariant
                        }
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Week {weekOfQuarter} of {totalWeeks}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {completed > 0 && `${completed} done`}
              {completed > 0 && inProgress > 0 && ' • '}
              {inProgress > 0 && `${inProgress} in progress`}
              {completed === 0 && inProgress === 0 && `${goals.length} goals set`}
            </Text>
          </View>
        </Card.Content>
      </TouchableRipple>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
    fontWeight: '600',
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  disciplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  disciplineText: {
    marginLeft: 6,
    flex: 1,
  },
  goalsGrid: {
    gap: 4,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalNumber: {
    width: 20,
  },
  goalText: {
    flex: 1,
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});
