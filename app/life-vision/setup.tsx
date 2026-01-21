import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, ProgressBar, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { lifeGoalQueries } from '../../src/db/queries';
import { LIFE_GOAL_CATEGORIES, TIME_WINDOWS } from '../../src/utils/lifeGoals';
import type { NewLifeGoal } from '../../src/db/schema';

const GOALS_PER_PAGE = 10;
const TOTAL_GOALS = 100;
const TOTAL_PAGES = TOTAL_GOALS / GOALS_PER_PAGE; // 10 pages

export default function SetupWizardScreen() {
    const theme = useTheme();
    const [currentPage, setCurrentPage] = useState(0);
    const [goals, setGoals] = useState<Array<Partial<NewLifeGoal>>>([]);
    const [saving, setSaving] = useState(false);

    // Load existing goals on mount
    useEffect(() => {
        loadExistingGoals();
    }, []);

    const loadExistingGoals = async () => {
        const existing = await lifeGoalQueries.getAll();
        if (existing.length > 0) {
            setGoals(existing);
            // Calculate which page to show based on existing goals
            const page = Math.floor(existing.length / GOALS_PER_PAGE);
            setCurrentPage(Math.min(page, TOTAL_PAGES - 1));
        } else {
            // Initialize empty goals
            setGoals(Array(TOTAL_GOALS).fill(null).map(() => ({
                title: '',
                description: '',
                category: LIFE_GOAL_CATEGORIES[0],
                timeWindow: 'SHORT_TERM',
                isStretchGoal: false,
                sortOrder: 0,
            })));
        }
    };

    const startIndex = currentPage * GOALS_PER_PAGE;
    const endIndex = startIndex + GOALS_PER_PAGE;
    const currentGoals = goals.slice(startIndex, endIndex);
    const completedGoals = goals.filter(g => g.title && g.title.trim().length > 0).length;
    const progress = completedGoals / TOTAL_GOALS;

    // Check if it's stretch goal territory (goals 51-100)
    const isStretchGoalPage = startIndex >= 50;

    const updateGoal = (index: number, field: keyof NewLifeGoal, value: any) => {
        const globalIndex = startIndex + index;
        const newGoals = [...goals];
        newGoals[globalIndex] = {
            ...newGoals[globalIndex],
            [field]: value,
            sortOrder: globalIndex,
        };

        // Automatically mark goals 51-100 as stretch goals
        if (globalIndex >= 50) {
            newGoals[globalIndex].isStretchGoal = true;
        }

        setGoals(newGoals);
    };

    const saveProgress = async () => {
        setSaving(true);
        try {
            // Save only goals with titles
            const goalsToSave = goals.filter(g => g.title && g.title.trim().length > 0);

            for (const goal of goalsToSave) {
                if (goal.title) {
                    // Check if goal exists
                    const existing = await lifeGoalQueries.getAll();
                    const existingGoal = existing.find(e => e.sortOrder === goal.sortOrder);

                    if (existingGoal) {
                        await lifeGoalQueries.update(existingGoal.id, goal as Partial<NewLifeGoal>);
                    } else {
                        await lifeGoalQueries.create(goal as NewLifeGoal);
                    }
                }
            }
        } catch (error) {
            console.error('Error saving goals:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleNext = async () => {
        await saveProgress();
        if (currentPage < TOTAL_PAGES - 1) {
            setCurrentPage(currentPage + 1);
        } else {
            // Finished!
            router.replace('/life-vision');
        }
    };

    const handleBack = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleSaveAndExit = async () => {
        await saveProgress();
        router.back();
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
                        Your Life Vision
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        {isStretchGoalPage
                            ? 'Goals 51-100: Dream bigger! Stretch goals.'
                            : 'Goals 1-50: Be realistic and specific.'}
                    </Text>
                </View>

                {/* Progress */}
                <Card style={styles.progressCard} mode="contained">
                    <Card.Content>
                        <View style={styles.progressRow}>
                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                                Progress: {completedGoals}/100
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                Page {currentPage + 1} of {TOTAL_PAGES}
                            </Text>
                        </View>
                        <ProgressBar progress={progress} style={styles.progressBar} />
                    </Card.Content>
                </Card>

                {/* Goal Inputs */}
                {currentGoals.map((goal, index) => {
                    const goalNumber = startIndex + index + 1;
                    return (
                        <View key={goalNumber} style={styles.goalRow}>
                            <Text variant="bodySmall" style={styles.goalNumber}>
                                #{goalNumber}
                            </Text>
                            <TextInput
                                mode="outlined"
                                placeholder={`Life goal ${goalNumber}`}
                                value={goal.title || ''}
                                onChangeText={(text) => updateGoal(index, 'title', text)}
                                style={styles.input}
                            />
                        </View>
                    );
                })}

                {/* Navigation Buttons */}
                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={handleSaveAndExit}
                        style={styles.button}
                        disabled={saving}
                    >
                        Save & Exit
                    </Button>

                    <View style={styles.navButtons}>
                        {currentPage > 0 && (
                            <Button
                                mode="outlined"
                                onPress={handleBack}
                                style={[styles.button, styles.navButton]}
                                disabled={saving}
                            >
                                Back
                            </Button>
                        )}

                        <Button
                            mode="contained"
                            onPress={handleNext}
                            style={[styles.button, styles.navButton]}
                            loading={saving}
                            disabled={saving}
                        >
                            {currentPage === TOTAL_PAGES - 1 ? 'Finish' : 'Next 10'}
                        </Button>
                    </View>
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
        marginBottom: 16,
    },
    progressCard: {
        marginBottom: 24,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    },
    goalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    goalNumber: {
        width: 32,
        opacity: 0.6,
    },
    input: {
        flex: 1,
    },
    actions: {
        marginTop: 24,
        gap: 12,
    },
    navButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
    },
    navButton: {
        flex: 1,
    },
});
