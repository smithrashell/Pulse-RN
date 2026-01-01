import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface WeeklyCheckInCardProps {
  incompleteIntentionsCount: number;
  onDismiss: () => void;
  onComplete: () => void;
}

export function WeeklyCheckInCard({
  incompleteIntentionsCount,
  onDismiss,
  onComplete,
}: WeeklyCheckInCardProps) {
  const theme = useTheme();

  const handleStartReview = () => {
    // Navigate to Review first
    router.push('/review/weekly');
    // We don't complete the check-in here; we'll let the user complete it after planning
    // or we can dismiss it manually later.
    // Actually, following the "Loop" concept: Review -> Plan.
  };

  const handlePlanWeek = () => {
    onComplete();
    router.push('/weekly-intentions');
  };

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
      mode="contained"
    >
      <Card.Content>
        <View style={styles.header}>
          <Ionicons name="calendar-outline" size={24} color={theme.colors.onPrimaryContainer} />
          <Text
            variant="titleMedium"
            style={[styles.title, { color: theme.colors.onPrimaryContainer }]}
          >
            Weekly Review
          </Text>
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.message, { color: theme.colors.onPrimaryContainer }]}
        >
          Close the loop on last week to start fresh.
        </Text>

        {incompleteIntentionsCount > 0 && (
          <Text
            variant="bodySmall"
            style={[styles.subMessage, { color: theme.colors.onPrimaryContainer }]}
          >
            {incompleteIntentionsCount} intention{incompleteIntentionsCount > 1 ? 's' : ''} to review.
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            mode="text"
            onPress={onDismiss}
            textColor={theme.colors.onPrimaryContainer}
            compact
          >
            Later
          </Button>
          <Button
            mode="contained"
            onPress={handleStartReview}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
          >
            Start Review
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
    marginBottom: 8,
  },
  title: {
    marginLeft: 8,
    fontWeight: '600',
  },
  message: {
    lineHeight: 20,
  },
  subMessage: {
    marginTop: 4,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});

export default WeeklyCheckInCard;
