import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { EngagementLevel, ENGAGEMENT_MESSAGES } from '../../services/engagementService';

interface AdaptivePromptCardProps {
  level: EngagementLevel;
  streak: number;
  onDismiss?: () => void;
}

export function AdaptivePromptCard({ level, streak, onDismiss }: AdaptivePromptCardProps) {
  const theme = useTheme();

  // Don't show for ACTIVE users with ongoing activity
  if (level === 'ACTIVE' && streak > 0) {
    return null;
  }

  const message = ENGAGEMENT_MESSAGES[level];

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (level) {
      case 'ACTIVE':
        return 'rocket-outline';
      case 'SLIPPING':
        return 'hand-left-outline';
      case 'DORMANT':
        return 'heart-outline';
      case 'RESET':
        return 'refresh-outline';
    }
  };

  const getBackgroundColor = () => {
    switch (level) {
      case 'ACTIVE':
        return theme.colors.primaryContainer;
      case 'SLIPPING':
        return theme.colors.secondaryContainer;
      case 'DORMANT':
        return theme.colors.tertiaryContainer;
      case 'RESET':
        return theme.colors.errorContainer;
    }
  };

  const getTextColor = () => {
    switch (level) {
      case 'ACTIVE':
        return theme.colors.onPrimaryContainer;
      case 'SLIPPING':
        return theme.colors.onSecondaryContainer;
      case 'DORMANT':
        return theme.colors.onTertiaryContainer;
      case 'RESET':
        return theme.colors.onErrorContainer;
    }
  };

  return (
    <Card style={[styles.card, { backgroundColor: getBackgroundColor() }]} mode="contained">
      <Card.Content>
        <View style={styles.header}>
          <Ionicons name={getIconName()} size={24} color={getTextColor()} />
          <Text variant="titleMedium" style={[styles.title, { color: getTextColor() }]}>
            {message.title}
          </Text>
        </View>
        <Text variant="bodyMedium" style={[styles.message, { color: getTextColor() }]}>
          {message.message}
        </Text>
        {onDismiss && (
          <Button
            mode="text"
            onPress={onDismiss}
            textColor={getTextColor()}
            compact
            style={styles.dismissButton}
          >
            Got it
          </Button>
        )}
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
  dismissButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});

export default AdaptivePromptCard;
