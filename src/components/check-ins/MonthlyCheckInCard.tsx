import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface MonthlyCheckInCardProps {
  monthName: string;
  onDismiss: () => void;
  onComplete: () => void;
}

export function MonthlyCheckInCard({ monthName, onDismiss, onComplete }: MonthlyCheckInCardProps) {
  const theme = useTheme();

  const handleSetOutcomes = () => {
    onComplete();
    router.push('/monthly-outcomes');
  };

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.secondaryContainer }]}
      mode="contained"
    >
      <Card.Content>
        <View style={styles.header}>
          <Ionicons name="flag-outline" size={24} color={theme.colors.onSecondaryContainer} />
          <Text
            variant="titleMedium"
            style={[styles.title, { color: theme.colors.onSecondaryContainer }]}
          >
            Welcome to {monthName}
          </Text>
        </View>

        <Text
          variant="bodyMedium"
          style={[styles.message, { color: theme.colors.onSecondaryContainer }]}
        >
          A fresh month is a great time to set new outcomes. What do you want to achieve?
        </Text>

        <View style={styles.actions}>
          <Button
            mode="text"
            onPress={onDismiss}
            textColor={theme.colors.onSecondaryContainer}
            compact
          >
            Later
          </Button>
          <Button
            mode="contained"
            onPress={handleSetOutcomes}
            buttonColor={theme.colors.secondary}
            textColor={theme.colors.onSecondary}
          >
            Set Outcomes
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});

export default MonthlyCheckInCard;
