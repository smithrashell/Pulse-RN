import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
    Text,
    Card,
    Button,
    useTheme,
    Checkbox,
    TextInput,
    Divider,
} from 'react-native-paper';
import { router } from 'expo-router';
import { lifeGoalService } from '../../src/services';
import type { LifeGoal } from '../../src/db/schema';
import { getCurrentMonth } from '../../src/utils/lifeGoals';
import { format } from 'date-fns';

export default function MonthlyCheckInScreen() {
    const theme = useTheme();
    const [goals, setGoals] = useState<LifeGoal[]>([]);
    const [achievedIds, setAchievedIds] = useState<Set<number>>(new Set());
    const [inMotionIds, setInMotionIds] = useState<Set<number>>(new Set());
    const [newConnections, setNewConnections] = useState('');
    const [generalReflection, setGeneralReflection] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadGoals();
    }, []);

    const loadGoals = async () => {
        const goalsForCheckIn = await lifeGoalService.getGoalsForCheckIn();
        setGoals(goalsForCheckIn);

        // Pre-select goals already in motion
        const inMotion = goalsForCheckIn.filter(g => g.status === 'IN_MOTION');
        setInMotionIds(new Set(inMotion.map(g => g.id)));
    };

    const toggleAchieved = (goalId: number) => {
        const newSet = new Set(achievedIds);
        if (newSet.has(goalId)) {
            newSet.delete(goalId);
        } else {
            newSet.add(goalId);
            // If marked as achieved, remove from in-motion
            const inMotion = new Set(inMotionIds);
            inMotion.delete(goalId);
            setInMotionIds(inMotion);
        }
        setAchievedIds(newSet);
    };

    const toggleInMotion = (goalId: number) => {
        // Can't be in motion if achieved
        if (achievedIds.has(goalId)) return;

        const newSet = new Set(inMotionIds);
        if (newSet.has(goalId)) {
            newSet.delete(goalId);
        } else {
            newSet.add(goalId);
        }
        setInMotionIds(newSet);
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            await lifeGoalService.completeMonthlyCheckIn(
                Array.from(achievedIds),
                Array.from(inMotionIds),
                newConnections.trim() || undefined,
                generalReflection.trim() || undefined
            );
            router.replace('/life-vision');
        } catch (error) {
            console.error('Error completing check-in:', error);
        } finally {
            setSaving(false);
        }
    };

    const activeGoals = goals.filter(g => g.status === 'ACTIVE');
    const inMotionGoals = goals.filter(g => g.status === 'IN_MOTION');

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                        Life Vision Check-In
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        {format(new Date(), 'MMMM yyyy')} • First Monday Ritual
                    </Text>
                </View>

                {/* Achieved Section */}
                <Card style={styles.card} mode="elevated">
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            ✓ Achieved This Month
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                            Tap any goals you completed
                        </Text>

                        {[...activeGoals, ...inMotionGoals].length === 0 ? (
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                                No active or in-motion goals to review
                            </Text>
                        ) : (
                            <>
                                {activeGoals.map((goal) => (
                                    <View key={goal.id} style={styles.goalRow}>
                                        <Checkbox
                                            status={achievedIds.has(goal.id) ? 'checked' : 'unchecked'}
                                            onPress={() => toggleAchieved(goal.id)}
                                        />
                                        <Text
                                            variant="bodyMedium"
                                            style={[
                                                styles.goalTitle,
                                                achievedIds.has(goal.id) && styles.completedGoal,
                                            ]}
                                            onPress={() => toggleAchieved(goal.id)}
                                        >
                                            {goal.title}
                                        </Text>
                                    </View>
                                ))}
                                {inMotionGoals.map((goal) => (
                                    <View key={goal.id} style={styles.goalRow}>
                                        <Checkbox
                                            status={achievedIds.has(goal.id) ? 'checked' : 'unchecked'}
                                            onPress={() => toggleAchieved(goal.id)}
                                        />
                                        <Text
                                            variant="bodyMedium"
                                            style={[
                                                styles.goalTitle,
                                                achievedIds.has(goal.id) && styles.completedGoal,
                                            ]}
                                            onPress={() => toggleAchieved(goal.id)}
                                        >
                                            {goal.title}
                                            <Text style={{ color: theme.colors.primary }}> (in motion)</Text>
                                        </Text>
                                    </View>
                                ))}
                            </>
                        )}
                    </Card.Content>
                </Card>

                {/* In Motion Section */}
                <Card style={styles.card} mode="elevated">
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            ◉ In Motion
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                            Goals with meaningful progress
                        </Text>

                        {activeGoals.length === 0 ? (
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                                No active goals
                            </Text>
                        ) : (
                            activeGoals.map((goal) => (
                                <View key={goal.id} style={styles.goalRow}>
                                    <Checkbox
                                        status={inMotionIds.has(goal.id) ? 'checked' : 'unchecked'}
                                        onPress={() => toggleInMotion(goal.id)}
                                        disabled={achievedIds.has(goal.id)}
                                    />
                                    <Text
                                        variant="bodyMedium"
                                        style={[
                                            styles.goalTitle,
                                            achievedIds.has(goal.id) && { opacity: 0.5 },
                                        ]}
                                        onPress={() => toggleInMotion(goal.id)}
                                    >
                                        {goal.title}
                                    </Text>
                                </View>
                            ))
                        )}
                    </Card.Content>
                </Card>

                <Divider style={styles.divider} />

                {/* New Connections */}
                <TextInput
                    mode="outlined"
                    label="New Connections (optional)"
                    placeholder="Met anyone relevant to your goals?"
                    value={newConnections}
                    onChangeText={setNewConnections}
                    multiline
                    numberOfLines={2}
                    style={styles.input}
                />

                {/* General Reflection */}
                <TextInput
                    mode="outlined"
                    label="General Reflection (optional)"
                    placeholder="Any insights about your life vision?"
                    value={generalReflection}
                    onChangeText={setGeneralReflection}
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                />

                {/* Summary */}
                {(achievedIds.size > 0 || inMotionIds.size > 0) && (
                    <Card style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
                        <Card.Content>
                            <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                                This Month's Progress
                            </Text>
                            {achievedIds.size > 0 && (
                                <Text variant="bodyMedium">
                                    ✓ {achievedIds.size} goal{achievedIds.size > 1 ? 's' : ''} achieved
                                </Text>
                            )}
                            {inMotionIds.size > 0 && (
                                <Text variant="bodyMedium">
                                    ◉ {inMotionIds.size} goal{inMotionIds.size > 1 ? 's' : ''} in motion
                                </Text>
                            )}
                        </Card.Content>
                    </Card>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={() => router.back()}
                        style={styles.button}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleComplete}
                        style={styles.button}
                        loading={saving}
                        disabled={saving}
                    >
                        Complete Check-In
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
    },
    card: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: 8,
    },
    goalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    goalTitle: {
        flex: 1,
        marginLeft: 8,
    },
    completedGoal: {
        textDecorationLine: 'line-through',
        opacity: 0.7,
    },
    divider: {
        marginVertical: 16,
    },
    input: {
        marginBottom: 16,
    },
    summaryCard: {
        marginBottom: 24,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
    },
});
