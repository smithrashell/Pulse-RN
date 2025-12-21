import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Chip,
  useTheme,
  HelperText,
  Menu,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusAreaMutations, usePotentialParents, useFocusArea } from '../../src/hooks';
import { FocusAreaType } from '../../src/db/schema';

// Only trackable types - AREA is not a user-selectable type
// Areas should be created through a different flow if needed
const TRACKABLE_TYPES: FocusAreaType[] = ['SKILL', 'HABIT', 'PROJECT', 'MAINTENANCE'];

const typeDescriptions: Record<FocusAreaType, string> = {
  SKILL: 'Track time spent building a skill (time-focused)',
  HABIT: 'Daily/weekly yes-no tracking (behavior-focused)',
  PROJECT: 'Count-based completions (output-focused)',
  MAINTENANCE: 'Recurring tasks/chores (routine)',
  AREA: 'Container to group related focus areas',
};

export default function CreateFocusAreaScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editId = params.edit ? parseInt(params.edit, 10) : null;
  const isEditing = editId !== null;

  // Load existing focus area if editing
  const { focusArea: existingFocusArea, isLoading: isLoadingExisting } = useFocusArea(editId || 0);

  const { create, update } = useFocusAreaMutations();

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<FocusAreaType>('SKILL');
  const [description, setDescription] = useState('');
  const [targetOutcome, setTargetOutcome] = useState('');
  const [targetTimeWeekly, setTargetTimeWeekly] = useState('');
  const [targetFrequency, setTargetFrequency] = useState('');
  const [identityStatement, setIdentityStatement] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [parentMenuVisible, setParentMenuVisible] = useState(false);

  // Load potential parents (only Areas can be parents)
  const { parents: potentialParents, isLoading: _isLoadingParents } = usePotentialParents(
    editId || undefined
  );

  // Populate form when editing
  useEffect(() => {
    if (isEditing && existingFocusArea) {
      setName(existingFocusArea.name);
      setType(existingFocusArea.type);
      setDescription(existingFocusArea.description || '');
      setTargetOutcome(existingFocusArea.targetOutcome || '');
      setTargetTimeWeekly(existingFocusArea.targetTimeWeeklyMinutes?.toString() || '');
      setTargetFrequency(existingFocusArea.targetFrequency?.toString() || '');
      setIdentityStatement(existingFocusArea.identityStatement || '');
      setIcon(existingFocusArea.icon);
      setParentId(existingFocusArea.parentFocusAreaId);
    }
  }, [isEditing, existingFocusArea]);

  const hasError = name.trim().length === 0;

  // Areas cannot have parents
  const canHaveParent = type !== 'AREA';

  const selectedParent = potentialParents.find((p) => p.id === parentId);

  const handleSave = async () => {
    if (hasError) return;

    setIsSaving(true);

    try {
      const focusAreaData = {
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        targetOutcome: targetOutcome.trim() || undefined,
        targetTimeWeeklyMinutes: targetTimeWeekly ? parseInt(targetTimeWeekly, 10) : undefined,
        targetFrequency: targetFrequency ? parseInt(targetFrequency, 10) : undefined,
        identityStatement: identityStatement.trim() || undefined,
        icon: icon.trim() || '', // Allow empty icon
        parentFocusAreaId: canHaveParent ? parentId : null,
      };

      if (isEditing && editId) {
        await update(editId, focusAreaData);
      } else {
        await create({
          ...focusAreaData,
          status: 'ACTIVE',
          startedAt: new Date(),
          createdAt: new Date(),
          archived: false,
          timeRequired: true,
          sortOrder: 0,
        });
      }

      router.back();
    } catch (error) {
      console.error('Error saving focus area:', error);
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Name Input */}
        <TextInput
          label="Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          error={hasError && name.length > 0}
        />
        <HelperText type="error" visible={hasError && name.length > 0}>
          Name is required
        </HelperText>

        {/* Type Selection */}
        <Text variant="labelLarge" style={styles.label}>
          Type
        </Text>
        <View style={styles.chipRow}>
          {TRACKABLE_TYPES.map((t) => (
            <Chip key={t} selected={type === t} onPress={() => setType(t)} style={styles.chip}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </Chip>
          ))}
        </View>
        <Text
          variant="bodySmall"
          style={[styles.typeDescription, { color: theme.colors.onSurfaceVariant }]}
        >
          {typeDescriptions[type]}
        </Text>

        {/* Parent Area Selection (only for non-AREA types) */}
        {canHaveParent && (
          <>
            <Text variant="labelLarge" style={styles.label}>
              Parent Area (Optional)
            </Text>
            <Menu
              visible={parentMenuVisible}
              onDismiss={() => setParentMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setParentMenuVisible(true)}
                  style={styles.parentButton}
                  contentStyle={styles.parentButtonContent}
                  icon={() =>
                    selectedParent ? (
                      <Text style={{ fontSize: 16 }}>{selectedParent.icon}</Text>
                    ) : (
                      <Ionicons name="folder-outline" size={18} color={theme.colors.primary} />
                    )
                  }
                >
                  {selectedParent ? selectedParent.name : 'No parent (standalone)'}
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setParentId(null);
                  setParentMenuVisible(false);
                }}
                title="No parent (standalone)"
                leadingIcon="close"
              />
              {potentialParents.map((parent) => (
                <Menu.Item
                  key={parent.id}
                  onPress={() => {
                    setParentId(parent.id);
                    setParentMenuVisible(false);
                  }}
                  title={parent.name}
                  leadingIcon={() => <Text style={{ fontSize: 16 }}>{parent.icon}</Text>}
                />
              ))}
            </Menu>
            <Text
              variant="bodySmall"
              style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}
            >
              Group this focus area under an Area for better organization
            </Text>
          </>
        )}

        {/* Description */}
        <TextInput
          label="Description (Why)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        {/* Target Outcome */}
        <TextInput
          label="Target Outcome"
          value={targetOutcome}
          onChangeText={setTargetOutcome}
          mode="outlined"
          style={styles.input}
          placeholder="What does success look like?"
        />

        {/* Target Time Weekly (for SKILL type) */}
        {type === 'SKILL' && (
          <TextInput
            label="Target Time Weekly (minutes)"
            value={targetTimeWeekly}
            onChangeText={setTargetTimeWeekly}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            placeholder="e.g., 300 for 5 hours"
          />
        )}

        {/* Target Frequency (for HABIT type) */}
        {type === 'HABIT' && (
          <TextInput
            label="Target Frequency (times per week)"
            value={targetFrequency}
            onChangeText={setTargetFrequency}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            placeholder="e.g., 5 for 5x per week"
          />
        )}

        {/* Identity Statement */}
        <TextInput
          label="Identity Statement"
          value={identityStatement}
          onChangeText={setIdentityStatement}
          mode="outlined"
          style={styles.input}
          placeholder="I am a person who..."
        />

        {/* Icon Input */}
        <TextInput
          label="Icon (optional)"
          value={icon}
          onChangeText={(text) => setIcon(text.slice(0, 2))} // Limit to single emoji
          mode="outlined"
          style={styles.input}
          placeholder="Tap to add an emoji from your keyboard"
        />

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={hasError || isSaving}
          loading={isSaving}
          style={styles.saveButton}
        >
          {isEditing ? 'Save Changes' : 'Create Focus Area'}
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
  input: {
    marginBottom: 4,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  typeDescription: {
    marginTop: 8,
    marginBottom: 8,
  },
  parentButton: {
    marginBottom: 4,
  },
  parentButtonContent: {
    justifyContent: 'flex-start',
  },
  helperText: {
    marginTop: 4,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 16,
  },
  cancelButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});
