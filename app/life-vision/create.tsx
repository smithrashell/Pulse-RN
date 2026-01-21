import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import {
    Text,
    TextInput,
    Button,
    useTheme,
    SegmentedButtons,
    Chip,
    Switch,
} from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { lifeGoalQueries } from '../../src/db/queries';
import { LIFE_GOAL_CATEGORIES, TIME_WINDOWS } from '../../src/utils/lifeGoals';
import type { LifeGoal, TimeWindow } from '../../src/db/schema';

export default function CreateLifeGoalScreen() {
    const theme = useTheme();
    const params = useLocalSearchParams();
    const goalId = params.id ? Number(params.id) : null;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<typeof LIFE_GOAL_CATEGORIES[number]>(LIFE_GOAL_CATEGORIES[0]);
    const [timeWindow, setTimeWindow] = useState<TimeWindow>('SHORT_TERM');
    const [isStretchGoal, setIsStretchGoal] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (goalId) {
            loadGoal();
        }
    }, [goalId]);

    const loadGoal = async () => {
        if (!goalId) return;
        const goal = await lifeGoalQueries.getById(goalId);
        if (goal) {
            setTitle(goal.title);
            setDescription(goal.description || '');
            setCategory(goal.category as typeof LIFE_GOAL_CATEGORIES[number]);
            setTimeWindow(goal.timeWindow);
            setIsStretchGoal(goal.isStretchGoal);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Required', 'Please enter a goal title');
            return;
        }

        setSaving(true);
        try {
            const goalData: Omit<LifeGoal, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'achievedAt' | 'achievementReflection'> = {
                title: title.trim(),
                description: description.trim() || null,
                category,
                timeWindow,
                isStretchGoal,
                sortOrder: 0, // Will be updated if needed
                focusAreaId: null, // Can be linked later
            };

            if (goalId) {
                await lifeGoalQueries.update(goalId, goalData);
            } else {
                const count = await lifeGoalQueries.getCount();
                await lifeGoalQueries.create({
                    ...goalData,
                    sortOrder: count,
                } as any); // Type cast needed because createdAt/updatedAt are added by query
            }

            router.back();
        } catch (error) {
            console.error('Error saving goal:', error);
            Alert.alert('Error', 'Failed to save goal');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text variant="headlineSmall" style={styles.header}>
                    {goalId ? 'Edit Life Goal' : 'Add Life Goal'}
                </Text>

                <TextInput
                    mode="outlined"
                    label="Goal Title *"
                    placeholder="Buy a home in Hawaii"
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                />

                <TextInput
                    mode="outlined"
                    label="Description (optional)"
                    placeholder="Why this matters to you..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                />

                <Text variant="titleSmall" style={styles.label}>
                    Category
                </Text>
                <View style={styles.chipContainer}>
                    {LIFE_GOAL_CATEGORIES.map((cat) => (
                        <Chip
                            key={cat}
                            mode={category === cat ? 'flat' : 'outlined'}
                            onPress={() => setCategory(cat)}
                            style={styles.chip}
                        >
                            {cat}
                        </Chip>
                    ))}
                </View>

                <Text variant="titleSmall" style={styles.label}>
                    Time Window
                </Text>
                <SegmentedButtons
                    value={timeWindow}
                    onValueChange={(value) => setTimeWindow(value as TimeWindow)}
                    buttons={TIME_WINDOWS.map((tw) => ({
                        value: tw.value,
                        label: tw.label,
                    }))}
                    style={styles.segmented}
                />

                <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                            Stretch Goal 🔥
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            A "fuck you money" dream goal
                        </Text>
                    </View>
                    <Switch value={isStretchGoal} onValueChange={setIsStretchGoal} />
                </View>

                <View style={styles.actions}>
                    <Button mode="outlined" onPress={() => router.back()} style={styles.button} disabled={saving}>
                        Cancel
                    </Button>
                    <Button mode="contained" onPress={handleSave} style={styles.button} loading={saving} disabled={saving}>
                        {goalId ? 'Update' : 'Create'}
                    </Button>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
        fontWeight: 'bold',
    },
    input: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 12,
        fontWeight: '600',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    chip: {
        marginRight: 0,
    },
    segmented: {
        marginBottom: 24,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
    },
});
