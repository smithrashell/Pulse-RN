import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, ProgressBar, useTheme, TouchableRipple } from 'react-native-paper';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { LifeGoalStats } from '../../services';

interface NorthStarCardProps {
    stats: LifeGoalStats;
    onPress?: () => void;
}

export function NorthStarCard({ stats, onPress }: NorthStarCardProps) {
    const theme = useTheme();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            router.push('/life-vision');
        }
    };

    return (
        <Card style={styles.card} mode="elevated">
            <TouchableRipple onPress={handlePress}>
                <Card.Content>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.titleRow}>
                                <Ionicons name="star" size={20} color={theme.colors.primary} />
                                <Text variant="titleMedium" style={styles.title}>
                                    North Star
                                </Text>
                            </View>
                            <View style={styles.statsRow}>
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {stats.inMotion} in motion
                                </Text>
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                    •
                                </Text>
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {stats.achievedThisYear} achieved this year
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
                    </View>

                    <View style={styles.progressSection}>
                        <ProgressBar
                            progress={stats.total / 100}
                            style={styles.progressBar}
                            color={theme.colors.primary}
                        />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                            {stats.total}/100 goals
                        </Text>
                    </View>
                </Card.Content>
            </TouchableRipple>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        marginLeft: 8,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    progressSection: {
        marginTop: 12,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
    },
});
