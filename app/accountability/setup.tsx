import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  SegmentedButtons,
  Card,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { accountabilityPartnerQueries } from '../../src/db/queries';
import { AccountabilityPartner, DayOfWeek } from '../../src/db/schema';

const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: 'Monday', label: 'Mon' },
  { value: 'Tuesday', label: 'Tue' },
  { value: 'Wednesday', label: 'Wed' },
  { value: 'Thursday', label: 'Thu' },
  { value: 'Friday', label: 'Fri' },
  { value: 'Saturday', label: 'Sat' },
  { value: 'Sunday', label: 'Sun' },
];

export default function AccountabilitySetupScreen() {
  const theme = useTheme();
  const [partner, setPartner] = useState<AccountabilityPartner | null>(null);
  const [name, setName] = useState('');
  const [checkInDay, setCheckInDay] = useState<DayOfWeek>('Monday');
  const [contactMethod, setContactMethod] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadPartner = useCallback(async () => {
    const existing = await accountabilityPartnerQueries.getActive();
    if (existing) {
      setPartner(existing);
      setName(existing.name);
      setCheckInDay(existing.checkInDay);
      setContactMethod(existing.contactMethod || '');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPartner();
    }, [loadPartner])
  );

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (partner) {
        await accountabilityPartnerQueries.update(partner.id, {
          name: name.trim(),
          checkInDay,
          contactMethod: contactMethod.trim() || null,
        });
      } else {
        await accountabilityPartnerQueries.create({
          name: name.trim(),
          checkInDay,
          contactMethod: contactMethod.trim() || null,
          isActive: true,
        });
      }
      router.back();
    } catch (error) {
      console.error('Error saving partner:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!partner) return;

    setIsSaving(true);
    try {
      await accountabilityPartnerQueries.deactivate(partner.id);
      router.back();
    } catch (error) {
      console.error('Error removing partner:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <Text variant="titleLarge" style={styles.headerTitle}>
            {partner ? 'Edit Partner' : 'Accountability Partner'}
          </Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Info Card */}
          {!partner && (
            <Card style={styles.infoCard} mode="elevated">
              <Card.Content>
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
                  <View style={styles.infoText}>
                    <Text variant="bodyMedium">
                      Research shows people are 65% more likely to achieve goals when they commit to
                      someone else.
                    </Text>
                  </View>
                </View>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
                >
                  Think of someone who: you respect, will be honest with you, and has their own goals
                  to share.
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Partner Name */}
          <Text variant="labelLarge" style={styles.label}>
            Partner Name
          </Text>
          <TextInput
            mode="outlined"
            value={name}
            onChangeText={setName}
            placeholder="e.g., Sarah"
            style={styles.input}
          />

          {/* Check-in Day */}
          <Text variant="labelLarge" style={[styles.label, { marginTop: 24 }]}>
            Check-in Day
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Which day do you usually connect?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SegmentedButtons
              value={checkInDay}
              onValueChange={(value) => setCheckInDay(value as DayOfWeek)}
              buttons={DAYS_OF_WEEK.map((d) => ({
                value: d.value,
                label: d.label,
              }))}
              style={styles.segmentedButtons}
            />
          </ScrollView>

          {/* Contact Method */}
          <Text variant="labelLarge" style={[styles.label, { marginTop: 24 }]}>
            How do you usually connect? (optional)
          </Text>
          <TextInput
            mode="outlined"
            value={contactMethod}
            onChangeText={setContactMethod}
            placeholder="e.g., Weekly coffee at Blue Bottle, Video call"
            style={styles.input}
            multiline
          />

          {/* Save Button */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            disabled={!name.trim() || isSaving}
            style={styles.saveButton}
          >
            {partner ? 'Save Changes' : 'Save Partner'}
          </Button>

          {/* Remove Button */}
          {partner && (
            <Button
              mode="text"
              onPress={handleRemove}
              textColor={theme.colors.error}
              style={styles.removeButton}
              disabled={isSaving}
            >
              Remove Partner
            </Button>
          )}
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
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 32,
  },
  removeButton: {
    marginTop: 16,
  },
});
