import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, useTheme, TextInput, Button, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { dailyLogQueries } from '../src/db/queries';

const FEELING_VALUES = ['1', '2', '3', '4', '5'];

type Mode = 'morning' | 'evening';

export default function DailyLogScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = params.mode === 'evening' ? 'evening' : 'morning';

  const [_isLoading, setIsLoading] = useState(true);

  // Form state
  const [morningIntention, setMorningIntention] = useState('');
  const [proofCommitment, setProofCommitment] = useState('');
  const [eveningReflection, setEveningReflection] = useState('');
  const [feelingRating, setFeelingRating] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const loadLog = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const existing = await dailyLogQueries.getForDate(today);

      // Populate form
      setMorningIntention(existing?.morningIntention || '');
      setProofCommitment(existing?.proofCommitment || '');
      setEveningReflection(existing?.eveningReflection || '');
      setFeelingRating(existing?.feelingRating?.toString() || '');
    } catch (error) {
      console.error('Error loading daily log:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLog();
    }, [loadLog])
  );

  // Check if form has content based on mode
  const hasContent =
    mode === 'morning' ? morningIntention.trim().length > 0 : eveningReflection.trim().length > 0;

  const handleSave = async () => {
    if (!hasContent) return;

    setIsSaving(true);
    try {
      const today = new Date();
      await dailyLogQueries.upsert({
        date: format(today, 'yyyy-MM-dd'),
        morningIntention: morningIntention.trim() || null,
        proofCommitment: proofCommitment.trim() || null,
        eveningReflection: eveningReflection.trim() || null,
        feelingRating: feelingRating ? parseInt(feelingRating, 10) : null,
      });
      // Navigate back after saving
      router.back();
    } catch (error) {
      console.error('Error saving daily log:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mode === 'morning' ? (
          /* Morning Section */
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Ionicons name="sunny-outline" size={24} color={theme.colors.primary} />
                <Text variant="titleMedium" style={{ marginLeft: 8 }}>
                  Morning Check-in
                </Text>
              </View>

              <TextInput
                label="What's your intention for today?"
                value={morningIntention}
                onChangeText={setMorningIntention}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="What do you want to accomplish or focus on?"
                autoFocus
              />

              <TextInput
                label="Proof of commitment (optional)"
                value={proofCommitment}
                onChangeText={setProofCommitment}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.input}
                placeholder="How will you know you committed to this?"
              />
            </Card.Content>
          </Card>
        ) : (
          /* Evening Section */
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Ionicons name="moon-outline" size={24} color={theme.colors.secondary} />
                <Text variant="titleMedium" style={{ marginLeft: 8 }}>
                  Evening Reflection
                </Text>
              </View>

              <TextInput
                label="How did today go?"
                value={eveningReflection}
                onChangeText={setEveningReflection}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="What went well? What could improve?"
                autoFocus
              />

              <Text variant="labelMedium" style={styles.ratingLabel}>
                How are you feeling? (1-5)
              </Text>
              <View
                style={[
                  styles.segmentedControl,
                  { borderColor: theme.colors.outline, backgroundColor: 'transparent' },
                ]}
              >
                {FEELING_VALUES.map((value, index) => {
                  const isSelected = feelingRating === value;
                  const isFirst = index === 0;
                  const isLast = index === FEELING_VALUES.length - 1;
                  return (
                    <TouchableRipple
                      key={value}
                      onPress={() => setFeelingRating(value)}
                      style={[
                        styles.segmentButton,
                        {
                          backgroundColor: isSelected ? theme.colors.secondary : 'transparent',
                          borderLeftWidth: isFirst ? 0 : 1,
                          borderColor: theme.colors.outline,
                          borderTopLeftRadius: isFirst ? 20 : 0,
                          borderBottomLeftRadius: isFirst ? 20 : 0,
                          borderTopRightRadius: isLast ? 20 : 0,
                          borderBottomRightRadius: isLast ? 20 : 0,
                        },
                      ]}
                    >
                      <Text
                        variant="labelLarge"
                        style={{
                          color: isSelected
                            ? theme.colors.onSecondary
                            : theme.colors.onSurfaceVariant,
                          fontWeight: isSelected ? '600' : '400',
                        }}
                      >
                        {value}
                      </Text>
                    </TouchableRipple>
                  );
                })}
              </View>
              <View style={styles.ratingHints}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Struggling
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Thriving
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || !hasContent}
          style={styles.saveButton}
        >
          Save
        </Button>

        {/* Cancel Button */}
        <Button mode="text" onPress={() => router.back()} style={styles.cancelButton}>
          Cancel
        </Button>
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
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  ratingLabel: {
    marginTop: 8,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  saveButton: {
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
});
