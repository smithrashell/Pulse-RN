import React from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { AccountabilityState } from '../../services';

interface PartnerCheckInCardProps {
  state: AccountabilityState;
  onShareGoals: () => void;
  onLogCheckIn: () => void;
}

export function PartnerCheckInCard({ state, onShareGoals, onLogCheckIn }: PartnerCheckInCardProps) {
  const theme = useTheme();

  if (!state.partner) return null;
  if (!state.isDueToday && !state.isOverdue) return null;

  const isOverdue = state.isOverdue && !state.isDueToday;

  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: isOverdue ? theme.colors.errorContainer : theme.colors.secondaryContainer },
      ]}
      mode="contained"
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons
              name="people-outline"
              size={20}
              color={isOverdue ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer}
            />
            <Text
              variant="titleMedium"
              style={[
                styles.title,
                { color: isOverdue ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer },
              ]}
            >
              Accountability Check-In
            </Text>
          </View>
        </View>

        <Text
          variant="bodyMedium"
          style={{
            color: isOverdue ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer,
            marginTop: 4,
          }}
        >
          {isOverdue
            ? `You missed your check-in with ${state.partner.name} this week`
            : `Time to check in with ${state.partner.name}!`}
        </Text>

        <View style={styles.statsRow}>
          {state.streak > 0 && (
            <View style={styles.stat}>
              <Ionicons
                name="flame"
                size={14}
                color={isOverdue ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer}
              />
              <Text
                variant="bodySmall"
                style={{
                  color: isOverdue ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer,
                  marginLeft: 4,
                }}
              >
                {state.streak} week streak
              </Text>
            </View>
          )}
          {state.lastCheckIn && (
            <View style={styles.stat}>
              <Text
                variant="bodySmall"
                style={{
                  color: isOverdue ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer,
                }}
              >
                Last: {format(new Date(state.lastCheckIn.completedAt!), 'MMM d')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onShareGoals}
            style={styles.button}
            textColor={isOverdue ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer}
          >
            Share Goals
          </Button>
          <Button
            mode="contained"
            onPress={onLogCheckIn}
            style={styles.button}
            buttonColor={isOverdue ? theme.colors.error : theme.colors.primary}
          >
            Log Check-In
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
});
