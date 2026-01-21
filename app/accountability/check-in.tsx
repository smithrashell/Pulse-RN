import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { accountabilityService, type AccountabilityState } from '../../src/services';
import { PartnerCheckIn } from '../../src/db/schema';

export default function AccountabilityCheckInScreen() {
  const theme = useTheme();
  const [state, setState] = useState<AccountabilityState | null>(null);
  const [checkIn, setCheckIn] = useState<PartnerCheckIn | null>(null);
  const [topicsDiscussed, setTopicsDiscussed] = useState('');
  const [partnerFeedback, setPartnerFeedback] = useState('');
  const [commitmentMade, setCommitmentMade] = useState('');
  const [rating, setRating] = useState<string>('3');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    const accountabilityState = await accountabilityService.getState();
    setState(accountabilityState);

    if (accountabilityState.partner) {
      const thisWeekCheckIn = await accountabilityService.getOrCreateThisWeekCheckIn(
        accountabilityState.partner.id
      );
      setCheckIn(thisWeekCheckIn);

      // Pre-fill if already has data
      if (thisWeekCheckIn.topicsDiscussed) setTopicsDiscussed(thisWeekCheckIn.topicsDiscussed);
      if (thisWeekCheckIn.partnerFeedback) setPartnerFeedback(thisWeekCheckIn.partnerFeedback);
      if (thisWeekCheckIn.commitmentMade) setCommitmentMade(thisWeekCheckIn.commitmentMade);
      if (thisWeekCheckIn.feltProductiveRating) setRating(String(thisWeekCheckIn.feltProductiveRating));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleComplete = async () => {
    if (!checkIn) return;

    setIsSaving(true);
    try {
      await accountabilityService.completeCheckIn(checkIn.id, {
        topicsDiscussed: topicsDiscussed.trim() || undefined,
        partnerFeedback: partnerFeedback.trim() || undefined,
        commitmentMade: commitmentMade.trim() || undefined,
        feltProductiveRating: parseInt(rating, 10),
      });
      router.back();
    } catch (error) {
      console.error('Error completing check-in:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!state?.partner) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <Text variant="titleLarge" style={styles.headerTitle}>
            Check-In
          </Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            No accountability partner set up yet.
          </Text>
          <Button mode="contained" onPress={() => router.push('/accountability/setup')} style={{ marginTop: 16 }}>
            Set Up Partner
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const weekLabel = checkIn ? `Week ${checkIn.week.split('-W')[1]}` : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <View>
            <Text variant="titleLarge" style={styles.headerTitle}>
              Check-In with {state.partner.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {weekLabel}
            </Text>
          </View>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Topics Discussed */}
          <Text variant="labelLarge" style={styles.label}>
            What did you discuss?
          </Text>
          <TextInput
            mode="outlined"
            value={topicsDiscussed}
            onChangeText={setTopicsDiscussed}
            placeholder="e.g., Reviewed Q1 goals, talked about launching Pulse..."
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          {/* Partner Feedback */}
          <Text variant="labelLarge" style={[styles.label, { marginTop: 20 }]}>
            Any feedback from {state.partner.name}?
          </Text>
          <TextInput
            mode="outlined"
            value={partnerFeedback}
            onChangeText={setPartnerFeedback}
            placeholder="e.g., &quot;You're playing too small with the revenue goal - double it&quot;"
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          {/* Commitment Made */}
          <Text variant="labelLarge" style={[styles.label, { marginTop: 20 }]}>
            What did you commit to?
          </Text>
          <TextInput
            mode="outlined"
            value={commitmentMade}
            onChangeText={setCommitmentMade}
            placeholder="e.g., Launch by Jan 31, update revenue goal to $10K"
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          {/* Productivity Rating */}
          <Text variant="labelLarge" style={[styles.label, { marginTop: 20 }]}>
            How productive was this check-in?
          </Text>
          <SegmentedButtons
            value={rating}
            onValueChange={setRating}
            buttons={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
            ]}
            style={styles.ratingButtons}
          />
          <View style={styles.ratingLabels}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Not productive
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Very productive
            </Text>
          </View>

          {/* Complete Button */}
          <Button
            mode="contained"
            onPress={handleComplete}
            loading={isSaving}
            disabled={isSaving}
            style={styles.completeButton}
          >
            Complete Check-In
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  headerTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
  ratingButtons: {
    marginTop: 8,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  completeButton: {
    marginTop: 32,
  },
});
