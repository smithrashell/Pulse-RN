import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, Pressable } from 'react-native';
import {
    Text,
    Card,
    FAB,
    Portal,
    useTheme,
    Chip,
    ActivityIndicator,
    IconButton,
    Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lifeGoalQueries, quarterlyGoalQueries } from '../../src/db/queries';
import { lifeGoalService, type LifeGoalStats } from '../../src/services';
import type { LifeGoal, LifeGoalStatus, TimeWindow } from '../../src/db/schema';
import { LIFE_GOAL_CATEGORIES, TIME_WINDOWS, getTimeWindowLabel } from '../../src/utils/lifeGoals';

export default function LifeVisionDashboard() {
    const theme = useTheme();
    const [goals, setGoals] = useState<LifeGoal[]>([]);
    const [stats, setStats] = useState<LifeGoalStats | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [selectedCategory])
    );

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [allGoals, statsData] = await Promise.all([
                selectedCategory
                    ? lifeGoalQueries.getByCategory(selectedCategory)
                    : lifeGoalQueries.getAll(),
                lifeGoalService.getStats(),
            ]);
            setGoals(allGoals);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading life vision data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Goals',
            `Are you sure you want to delete all ${stats?.total || 0} goals? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await lifeGoalQueries.deleteAll();
                            loadData();
                        } catch (error) {
                            console.error('Error clearing goals:', error);
                            Alert.alert('Error', 'Failed to clear goals');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleStatus = async (goal: LifeGoal) => {
        try {
            let newStatus: LifeGoalStatus;
            switch (goal.status) {
                case 'ACTIVE':
                    newStatus = 'IN_MOTION';
                    break;
                case 'IN_MOTION':
                    newStatus = 'ACHIEVED';
                    break;
                case 'ACHIEVED':
                    newStatus = 'ACTIVE';
                    break;
                case 'DEFERRED':
                case 'RELEASED':
                    newStatus = 'ACTIVE';
                    break;
                default:
                    newStatus = 'IN_MOTION';
            }

            // If moving to IN_MOTION, add to quarterly goals
            if (newStatus === 'IN_MOTION') {
                const quarterlyGoal = await quarterlyGoalQueries.createFromLifeGoal(
                    goal.id,
                    goal.title,
                    goal.description || undefined
                );
                if (quarterlyGoal === null) {
                    Alert.alert(
                        'Quarter Full',
                        'This quarter already has 6 goals. The life goal will be marked In Motion but not added to quarterly goals.',
                        [{ text: 'OK' }]
                    );
                }
            }

            await lifeGoalQueries.updateStatus(goal.id, newStatus);
            loadData();
        } catch (error) {
            console.error('Error updating goal status:', error);
        }
    };

    const getStatusIcon = (status: LifeGoalStatus) => {
        switch (status) {
            case 'ACHIEVED':
                return 'checkmark-circle';
            case 'IN_MOTION':
                return 'radio-button-on';
            case 'ACTIVE':
                return 'radio-button-off-outline';
            case 'DEFERRED':
                return 'pause-circle-outline';
            case 'RELEASED':
                return 'close-circle-outline';
            default:
                return 'radio-button-off-outline';
        }
    };

    const getStatusColor = (status: LifeGoalStatus) => {
        switch (status) {
            case 'ACHIEVED':
                return theme.colors.tertiary;
            case 'IN_MOTION':
                return theme.colors.primary;
            case 'ACTIVE':
                return theme.colors.onSurfaceVariant;
            case 'DEFERRED':
                return theme.colors.outline;
            case 'RELEASED':
                return theme.colors.error;
            default:
                return theme.colors.onSurfaceVariant;
        }
    };

    // Group goals by time window, with IN_MOTION goals at the top
    const getStatusOrder = (status: LifeGoalStatus) => {
        switch (status) {
            case 'IN_MOTION': return 0;
            case 'ACTIVE': return 1;
            case 'ACHIEVED': return 2;
            case 'DEFERRED': return 3;
            case 'RELEASED': return 4;
            default: return 5;
        }
    };

    const goalsByTimeWindow = goals.reduce((acc, goal) => {
        if (!acc[goal.timeWindow]) {
            acc[goal.timeWindow] = [];
        }
        acc[goal.timeWindow].push(goal);
        return acc;
    }, {} as Record<TimeWindow, LifeGoal[]>);

    // Sort each time window's goals by status (IN_MOTION first)
    Object.keys(goalsByTimeWindow).forEach((key) => {
        goalsByTimeWindow[key as TimeWindow].sort((a, b) =>
            getStatusOrder(a.status) - getStatusOrder(b.status)
        );
    });

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    // Show setup prompt only if no goals exist
    const needsSetup = stats && stats.total === 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>
                        Life Vision
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Your life goals across all time horizons
                    </Text>
                </View>
                {/* Stats Header */}
                {stats && (
                    <Card style={styles.statsCard} mode="elevated">
                        <Card.Content>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
                                        {stats.total}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        Total Goals
                                    </Text>
                                </View>
                                <Divider style={styles.divider} />
                                <View style={styles.statItem}>
                                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                                        {stats.inMotion}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        In Motion
                                    </Text>
                                </View>
                                <Divider style={styles.divider} />
                                <View style={styles.statItem}>
                                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.tertiary }}>
                                        {stats.achievedThisYear}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        This Year
                                    </Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                )}

                {/* Setup Banner */}
                {needsSetup && (
                    <Card
                        style={[styles.setupBanner, { backgroundColor: theme.colors.primaryContainer }]}
                        onPress={() => router.push('/life-vision/setup')}
                    >
                        <Card.Content>
                            <View style={styles.setupRow}>
                                <View style={{ flex: 1 }}>
                                    <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                                        Start Your Vision
                                    </Text>
                                    <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                                        Add goals or import from CSV
                                    </Text>
                                </View>
                                <IconButton icon="arrow-forward" size={24} onPress={() => router.push('/life-vision/setup')} />
                            </View>
                        </Card.Content>
                    </Card>
                )}

                {/* Category Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                >
                    <Chip
                        mode={!selectedCategory ? 'flat' : 'outlined'}
                        onPress={() => setSelectedCategory(null)}
                        style={styles.filterChip}
                    >
                        All
                    </Chip>
                    {LIFE_GOAL_CATEGORIES.map((category) => (
                        <Chip
                            key={category}
                            mode={selectedCategory === category ? 'flat' : 'outlined'}
                            onPress={() => setSelectedCategory(category)}
                            style={styles.filterChip}
                        >
                            {category}
                        </Chip>
                    ))}
                </ScrollView>

                {/* Goals by Time Window */}
                {TIME_WINDOWS.map((window) => {
                    const windowGoals = goalsByTimeWindow[window.value] || [];
                    if (windowGoals.length === 0) return null;

                    return (
                        <View key={window.value} style={styles.timeWindowSection}>
                            <View style={styles.sectionHeader}>
                                <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                                    {window.label}
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {windowGoals.length} {windowGoals.length === 1 ? 'goal' : 'goals'}
                                </Text>
                            </View>

                            {windowGoals.map((goal) => (
                                <Card
                                    key={goal.id}
                                    style={styles.goalCard}
                                    mode="outlined"
                                    onPress={() => router.push(`/life-vision/${goal.id}`)}
                                >
                                    <Card.Content>
                                        <View style={styles.goalRow}>
                                            <Pressable
                                                onPress={() => handleToggleStatus(goal)}
                                                hitSlop={8}
                                                style={styles.statusButton}
                                            >
                                                <Ionicons
                                                    name={getStatusIcon(goal.status)}
                                                    size={24}
                                                    color={getStatusColor(goal.status)}
                                                />
                                            </Pressable>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <View style={styles.goalTitleRow}>
                                                    <Text variant="bodyMedium" style={{ flex: 1, fontWeight: '500' }}>
                                                        {goal.title}
                                                    </Text>
                                                    {goal.isStretchGoal && (
                                                        <Text style={styles.stretchBadge}>🔥</Text>
                                                    )}
                                                </View>
                                                <Text
                                                    variant="bodySmall"
                                                    style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                                                >
                                                    {goal.category}
                                                </Text>
                                            </View>
                                            <IconButton icon="chevron-right" size={20} style={{ margin: 0 }} />
                                        </View>
                                    </Card.Content>
                                </Card>
                            ))}
                        </View>
                    );
                })}

                {goals.length === 0 && !needsSetup && (
                    <Card style={styles.emptyCard}>
                        <Card.Content style={styles.emptyContent}>
                            <Ionicons name="telescope-outline" size={48} color={theme.colors.onSurfaceVariant} />
                            <Text variant="titleMedium" style={styles.emptyTitle}>
                                No goals in this category
                            </Text>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                Select a different category or add new goals
                            </Text>
                        </Card.Content>
                    </Card>
                )}
            </ScrollView>

            <Portal>
                <FAB.Group
                    open={fabOpen}
                    visible
                    icon={fabOpen ? 'close' : 'plus'}
                    actions={[
                        ...(stats && stats.total > 0
                            ? [
                                {
                                    icon: 'delete-outline' as const,
                                    label: 'Clear All Goals',
                                    onPress: handleClearAll,
                                },
                            ]
                            : []),
                        {
                            icon: 'download',
                            label: 'Import Goals',
                            onPress: () => router.push('/life-vision/import'),
                        },
                        {
                            icon: 'plus',
                            label: 'Add Goal',
                            onPress: () => router.push('/life-vision/create'),
                        },
                    ]}
                    onStateChange={({ open }) => setFabOpen(open)}
                    style={styles.fabGroup}
                />
            </Portal>
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
        paddingBottom: 80,
    },
    header: {
        marginBottom: 16,
    },
    statsCard: {
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    divider: {
        height: 40,
        width: 1,
    },
    setupBanner: {
        marginBottom: 16,
    },
    setupRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterRow: {
        gap: 8,
        marginBottom: 16,
        paddingRight: 16,
    },
    filterChip: {
        marginRight: 0,
    },
    timeWindowSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    goalCard: {
        marginBottom: 8,
    },
    goalRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusButton: {
        padding: 4,
    },
    goalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stretchBadge: {
        fontSize: 16,
        marginLeft: 8,
    },
    emptyCard: {
        marginTop: 32,
    },
    emptyContent: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyTitle: {
        marginTop: 16,
        marginBottom: 8,
    },
    fabGroup: {
        position: 'absolute',
        right: 0,
        bottom: 0,
    },
});
