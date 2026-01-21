import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
    Text,
    Card,
    Button,
    useTheme,
    ActivityIndicator,
    IconButton,
    Chip,
    Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lifeGoalQueries } from '../../src/db/queries';
import { lifeGoalService } from '../../src/services';
import type { LifeGoal } from '../../src/db/schema';
import { getTimeWindowLabel } from '../../src/utils/lifeGoals';
import { format } from 'date-fns';

export default function LifeGoalDetailScreen() {
    const theme = useTheme();
    const params = useLocalSearchParams();
    const goalId = Number(params.id);

    const [goal, setGoal] = useState<LifeGoal | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadGoal();
        }, [goalId])
    );

    const loadGoal = async () => {
        setIsLoading(true);
        try {
            const data = await lifeGoalQueries.getById(goalId);
            setGoal(data);
        } catch (error) {
            console.error('Error loading goal:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAchieved = () => {
        Alert.alert(
            'Mark as Achieved',
            'Congratulations! Add a reflection about achieving this goal?',
            [
                { text: 'Skip', onPress: () => updateStatus('ACHIEVED') },
                { text: 'Add Reflection', onPress: () => showReflectionPrompt() },
            ]
        );
    };

    const showReflectionPrompt = () => {
        Alert.prompt(
            'Achievement Reflection',
            'What did achieving this goal enable? How has it changed you?',
            async (reflection) => {
                if (reflection) {
                    await lifeGoalService.markAsAchieved(goalId, reflection);
                    loadGoal();
                }
            }
        );
    };

    const updateStatus = async (status: 'ACTIVE' | 'IN_MOTION' | 'ACHIEVED' | 'DEFERRED' | 'RELEASED') => {
        try {
            switch (status) {
                case 'ACHIEVED':
                    await lifeGoalService.markAsAchieved(goalId);
                    break;
                case 'IN_MOTION':
                    await lifeGoalService.markAsInMotion(goalId);
                    break;
                case 'DEFERRED':
                    await lifeGoalService.markAsDeferred(goalId);
                    break;
                case 'RELEASED':
                    await lifeGoalService.markAsReleased(goalId);
                    break;
                case 'ACTIVE':
                    await lifeGoalService.reactivate(goalId);
                    break;
            }
            loadGoal();
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Error', 'Failed to update goal status');
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Goal',
            'Are you sure you want to delete this life goal?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await lifeGoalQueries.delete(goalId);
                        router.back();
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    if (!goal) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loading}>
                    <Text>Goal not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const statusColor = goal.status === 'ACHIEVED' ? theme.colors.tertiary :
        goal.status === 'IN_MOTION' ? theme.colors.primary :
            theme.colors.onSurfaceVariant;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
                        Life Goal
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {goal.category} • {getTimeWindowLabel(goal.timeWindow)}
                    </Text>
                </View>

                {/* Goal Title */}
                <Card style={styles.titleCard} mode="elevated">
                    <Card.Content>
                        <View style={styles.titleRow}>
                            <Text variant="headlineSmall" style={{ flex: 1, fontWeight: 'bold' }}>
                                {goal.title}
                            </Text>
                            {goal.isStretchGoal && <Text style={styles.stretchBadge}>🔥</Text>}
                        </View>
                        {goal.description && (
                            <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                                {goal.description}
                            </Text>
                        )}
                    </Card.Content>
                </Card>

                {/* Status Chip */}
                <View style={styles.statusChipRow}>
                    <Chip
                        icon={() => (
                            <Ionicons
                                name={goal.status === 'ACHIEVED' ? 'checkmark-circle' :
                                    goal.status === 'IN_MOTION' ? 'radio-button-on' : 'radio-button-off-outline'}
                                size={16}
                                color={statusColor}
                            />
                        )}
                    >
                        {goal.status.replace('_', ' ')}
                    </Chip>
                    <IconButton
                        icon="pencil"
                        onPress={() => router.push(`/life-vision/create?id=${goalId}`)}
                        style={{ marginLeft: 'auto' }}
                    />
                </View>

                {/* Achievement Reflection */}
                {goal.status === 'ACHIEVED' && goal.achievementReflection && (
                    <Card style={[styles.card, { backgroundColor: theme.colors.tertiaryContainer }]} mode="contained">
                        <Card.Content>
                            <View style={styles.achievementHeader}>
                                <Ionicons name="trophy" size={24} color={theme.colors.tertiary} />
                                <Text variant="titleSmall" style={{ marginLeft: 8, fontWeight: '600' }}>
                                    Achievement Reflection
                                </Text>
                            </View>
                            <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                                {goal.achievementReflection}
                            </Text>
                            {goal.achievedAt && (
                                <Text variant="bodySmall" style={{ marginTop: 8, opacity: 0.7 }}>
                                    Achieved {format(new Date(goal.achievedAt), 'MMM d, yyyy')}
                                </Text>
                            )}
                        </Card.Content>
                    </Card>
                )}

                {/* Status Actions */}
                <Card style={styles.card} mode="outlined">
                    <Card.Content>
                        <Text variant="titleSmall" style={styles.sectionTitle}>
                            Update Status
                        </Text>
                        <View style={styles.statusActions}>
                            {goal.status !== 'ACHIEVED' && (
                                <Button
                                    mode="contained"
                                    icon="checkmark-circle"
                                    onPress={handleMarkAchieved}
                                    style={styles.statusButton}
                                >
                                    Achieved
                                </Button>
                            )}
                            {goal.status !== 'IN_MOTION' && goal.status !== 'ACHIEVED' && (
                                <Button
                                    mode="outlined"
                                    icon="play-circle"
                                    onPress={() => updateStatus('IN_MOTION')}
                                    style={styles.statusButton}
                                >
                                    In Motion
                                </Button>
                            )}
                            {goal.status !== 'ACTIVE' && goal.status !== 'ACHIEVED' && (
                                <Button
                                    mode="outlined"
                                    icon="refresh"
                                    onPress={() => updateStatus('ACTIVE')}
                                    style={styles.statusButton}
                                >
                                    Reactivate
                                </Button>
                            )}
                            {goal.status !== 'DEFERRED' && goal.status !== 'ACHIEVED' && (
                                <Button
                                    mode="text"
                                    icon="pause"
                                    onPress={() => updateStatus('DEFERRED')}
                                    style={styles.statusButton}
                                >
                                    Defer
                                </Button>
                            )}
                            {goal.status !== 'RELEASED' && goal.status !== 'ACHIEVED' && (
                                <Button
                                    mode="text"
                                    icon="close-circle"
                                    onPress={() => updateStatus('RELEASED')}
                                    style={styles.statusButton}
                                    textColor={theme.colors.error}
                                >
                                    Release
                                </Button>
                            )}
                        </View>
                    </Card.Content>
                </Card>

                <Divider style={styles.divider} />

                {/* Delete Button */}
                <Button
                    mode="outlined"
                    icon="delete"
                    onPress={handleDelete}
                    textColor={theme.colors.error}
                    style={styles.deleteButton}
                >
                    Delete Goal
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 16,
    },
    titleCard: {
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stretchBadge: {
        fontSize: 24,
        marginLeft: 8,
    },
    statusChipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    metaCard: {
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metaChip: {
        marginRight: 0,
    },
    card: {
        marginBottom: 16,
    },
    sectionTitle: {
        marginBottom: 12,
        fontWeight: '600',
    },
    achievementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusActions: {
        gap: 8,
    },
    statusButton: {
        marginBottom: 8,
    },
    divider: {
        marginVertical: 16,
    },
    deleteButton: {
        borderColor: 'transparent',
    },
});
