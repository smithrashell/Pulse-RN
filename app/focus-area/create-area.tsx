import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusAreaMutations, useFocusArea } from '../../src/hooks';

export default function CreateAreaScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editId = params.edit ? parseInt(params.edit, 10) : null;
  const isEditing = editId !== null;

  // Load existing area if editing
  const { focusArea: existingArea, isLoading: isLoadingExisting } = useFocusArea(editId || 0);

  const { create, update } = useFocusAreaMutations();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && existingArea) {
      setName(existingArea.name);
      setDescription(existingArea.description || '');
      setIcon(existingArea.icon);
    }
  }, [isEditing, existingArea]);

  const hasError = name.trim().length === 0;

  const handleSave = async () => {
    if (hasError) return;

    setIsSaving(true);

    try {
      const areaData = {
        name: name.trim(),
        type: 'AREA' as const,
        description: description.trim() || undefined,
        icon: icon.trim() || '',
        parentFocusAreaId: null, // Areas cannot have parents
      };

      if (isEditing && editId) {
        await update(editId, areaData);
      } else {
        await create({
          ...areaData,
          status: 'ACTIVE',
          startedAt: new Date(),
          createdAt: new Date(),
          archived: false,
          timeRequired: false, // Areas don't track time directly
          sortOrder: 0,
        });
      }

      router.back();
    } catch (error) {
      console.error('Error saving area:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isLoadingExisting) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            Areas are containers that group related focus areas together. For example, "Health"
            could contain habits like "Exercise" and "Meditation".
          </Text>
        </View>

        {/* Name Input */}
        <TextInput
          label="Area Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          error={hasError && name.length > 0}
          placeholder="e.g., Health, Career, Relationships"
        />
        <HelperText type="error" visible={hasError && name.length > 0}>
          Name is required
        </HelperText>

        {/* Description */}
        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          placeholder="What does this area of your life represent?"
        />

        {/* Icon Input */}
        <TextInput
          label="Icon (optional)"
          value={icon}
          onChangeText={(text) => setIcon(text.slice(0, 2))}
          mode="outlined"
          style={styles.input}
          placeholder="Tap to add an emoji from your keyboard"
        />
        <HelperText type="info" visible={true}>
          Use your emoji keyboard to select an icon
        </HelperText>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={hasError || isSaving}
          loading={isSaving}
          style={styles.saveButton}
        >
          {isEditing ? 'Save Changes' : 'Create Area'}
        </Button>

        {/* Cancel Button */}
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.cancelButton}
          disabled={isSaving}
        >
          Cancel
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  input: {
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 24,
  },
  cancelButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});
