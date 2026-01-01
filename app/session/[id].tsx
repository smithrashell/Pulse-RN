import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import {
    Text,
    TextInput,
    Button,
    useTheme,
    ActivityIndicator,
    Card,
    HelperText,
    IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addMinutes, subMinutes, setHours, setMinutes, parse } from 'date-fns';

import { sessionQueries } from '../../src/db/queries';
import { useFocusArea } from '../../src/hooks';
import { Session } from '../../src/db/schema';
import { formatMinutes } from '../../src/utils/time';

export default function SessionDetailScreen() {
    const theme = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const sessionId = parseInt(id || '0', 10);

    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<Date>(new Date());
    const [note, setNote] = useState('');
    const [qualityRating, setQualityRating] = useState<number | null>(null);

    // Text input state for time
    const [startTimeText, setStartTimeText] = useState('');
    const [endTimeText, setEndTimeText] = useState('');

    // Update text fields when Date objects change
    useEffect(() => {
        setStartTimeText(format(startTime, 'h:mm a'));
    }, [startTime]);

    useEffect(() => {
        setEndTimeText(format(endTime, 'h:mm a'));
    }, [endTime]);

    // Load session data
    useFocusEffect(
        useCallback(() => {
            const loadSession = async () => {
                if (!sessionId) return;
                setIsLoading(true);
                try {
                    const loadedSession = await sessionQueries.getById(sessionId);
                    if (loadedSession) {
                        setSession(loadedSession);
                        setStartTime(new Date(loadedSession.startTime));
                        setEndTime(
                            loadedSession.endTime ? new Date(loadedSession.endTime) : new Date()
                        );
                        setNote(loadedSession.note || '');
                        setQualityRating(loadedSession.qualityRating || null);
                    }
                } catch (error) {
                    console.error('Error loading session:', error);
                    Alert.alert('Error', 'Failed to load session details');
                } finally {
                    setIsLoading(false);
                }
            };

            loadSession();
        }, [sessionId])
    );

    // Fetch focus area details if attached
    const { focusArea } = useFocusArea(session?.focusAreaId || 0);

    // Calculate duration based on form state
    const durationMinutes = Math.max(
        0,
        Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    );

    // Helper to nudge time
    const nudgeTime = (type: 'start' | 'end', direction: 'up' | 'down') => {
        if (type === 'start') {
            const newTime = direction === 'up' ? addMinutes(startTime, 5) : subMinutes(startTime, 5);
            setStartTime(newTime);
            // If start moves past end, push end forward too to maintain at least 5 min duration
            if (newTime >= endTime) {
                setEndTime(addMinutes(newTime, 5));
            }
        } else {
            const newTime = direction === 'up' ? addMinutes(endTime, 5) : subMinutes(endTime, 5);
            // Prevent end before start
            if (newTime <= startTime) return;
            setEndTime(newTime);
        }
    };

    // Helper to parse manual text input
    const handleTimeBlur = (type: 'start' | 'end') => {
        const text = type === 'start' ? startTimeText : endTimeText;
        const originalDate = type === 'start' ? startTime : endTime;

        // Try to parse flexible inputs: "9:30", "9:30a", "9:30am", "9:30 pm"
        let parsedDate: Date | null = null;

        // Normalize text: remove spaces around am/pm, lowercase
        const normalized = text.toLowerCase().trim().replace(/\s+([ap]m)/, '$1');

        const formatsToTry = ['h:mm a', 'h:mma', 'H:mm'];

        for (const fmt of formatsToTry) {
            const d = parse(normalized, fmt, originalDate);
            if (!isNaN(d.getTime())) {
                parsedDate = d;
                break;
            }
        }

        if (!parsedDate) {
            // Revert to original if invalid
            if (type === 'start') setStartTimeText(format(startTime, 'h:mm a'));
            else setEndTimeText(format(endTime, 'h:mm a'));
            return;
        }

        if (type === 'start') {
            setStartTime(parsedDate);
            if (parsedDate >= endTime) {
                setEndTime(addMinutes(parsedDate, 5));
            }
        } else {
            if (parsedDate <= startTime) {
                // If user entered PM time effectively but it's technically before start (e.g. 1pm vs 9am same day calc issues?), 
                // we mostly trust 'parse' which uses the reference date. 
                // But if they explicitly type a time before start, warn them.
                Alert.alert('Invalid Time', 'End time cannot be before start time');
                setEndTimeText(format(endTime, 'h:mm a')); // Revert
                return;
            }
            setEndTime(parsedDate);
        }
    };

    const handleSave = async () => {
        if (!session) return;
        setIsSaving(true);

        try {
            await sessionQueries.update(session.id, {
                startTime,
                endTime,
                durationMinutes,
                note: note.trim() || null,
                qualityRating,
            });
            router.back();
        } catch (error) {
            console.error('Error saving session:', error);
            Alert.alert('Error', 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Session',
            'Are you sure you want to delete this session? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (session) {
                                await sessionQueries.delete(session.id);
                                router.back();
                            }
                        } catch (error) {
                            console.error('Error deleting session:', error);
                            Alert.alert('Error', 'Failed to delete session');
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    if (!session) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text>Session not found</Text>
                    <Button onPress={() => router.back()} style={{ marginTop: 16 }}>
                        Go Back
                    </Button>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header Info */}
                <View style={styles.header}>
                    <View>
                        <Text variant="headlineSmall">
                            {focusArea ? focusArea.name : 'Quick Session'}
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            {format(startTime, 'EEEE, MMM d, yyyy')}
                        </Text>
                    </View>
                    {focusArea && <Text style={{ fontSize: 32 }}>{focusArea.icon}</Text>}
                </View>

                <Card style={styles.card} mode="elevated">
                    <Card.Content>
                        {/* Time Editing */}
                        <View style={styles.timeSection}>

                            {/* Start Time Row */}
                            <View style={styles.timeRow}>
                                <Text variant="labelLarge" style={{ width: 50, color: theme.colors.onSurfaceVariant }}>Start</Text>

                                <View style={[styles.inputGroup, { backgroundColor: theme.colors.surfaceVariant }]}>
                                    <IconButton
                                        icon="minus"
                                        size={16}
                                        onPress={() => nudgeTime('start', 'down')}
                                        style={styles.nudgeBtn}
                                    />
                                    <TextInput
                                        value={startTimeText}
                                        onChangeText={setStartTimeText}
                                        onBlur={() => handleTimeBlur('start')}
                                        keyboardType="default"
                                        style={[styles.timeInput, { color: theme.colors.onSurface }]}
                                        // dense
                                        underlineColor="transparent"
                                        activeUnderlineColor="transparent"
                                    />
                                    <IconButton
                                        icon="plus"
                                        size={16}
                                        onPress={() => nudgeTime('start', 'up')}
                                        style={styles.nudgeBtn}
                                    />
                                </View>
                            </View>

                            {/* End Time Row */}
                            <View style={styles.timeRow}>
                                <Text variant="labelLarge" style={{ width: 50, color: theme.colors.onSurfaceVariant }}>End</Text>

                                <View style={[styles.inputGroup, { backgroundColor: theme.colors.surfaceVariant }]}>
                                    <IconButton
                                        icon="minus"
                                        size={16}
                                        onPress={() => nudgeTime('end', 'down')}
                                        style={styles.nudgeBtn}
                                    />
                                    <TextInput
                                        value={endTimeText}
                                        onChangeText={setEndTimeText}
                                        onBlur={() => handleTimeBlur('end')}
                                        keyboardType="default"
                                        style={[styles.timeInput, { color: theme.colors.onSurface }]}
                                        // dense
                                        underlineColor="transparent"
                                        activeUnderlineColor="transparent"
                                    />
                                    <IconButton
                                        icon="plus"
                                        size={16}
                                        onPress={() => nudgeTime('end', 'up')}
                                        style={styles.nudgeBtn}
                                    />
                                </View>
                            </View>

                        </View>

                        {/* Duration Display */}
                        <View style={styles.durationContainer}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                Duration:
                            </Text>
                            <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold', marginLeft: 8 }}>
                                {formatMinutes(durationMinutes)}
                            </Text>
                        </View>

                        {/* Note Input */}
                        <TextInput
                            label="Note"
                            value={note}
                            onChangeText={setNote}
                            mode="outlined"
                            multiline
                            numberOfLines={3}
                            style={styles.input}
                            placeholder="What did you work on?"
                        />

                        {/* Quality Rating */}
                        <Text variant="labelLarge" style={styles.label}>
                            Quality Rating
                        </Text>
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((rating) => (
                                <IconButton
                                    key={rating}
                                    icon={rating <= (qualityRating || 0) ? 'star' : 'star-outline'}
                                    iconColor={rating <= (qualityRating || 0) ? theme.colors.primary : theme.colors.outline}
                                    size={32}
                                    onPress={() => setQualityRating(rating)}
                                    style={styles.starButton}
                                />
                            ))}
                        </View>
                        <HelperText type="info" visible={true} style={{ textAlign: 'center' }}>
                            How focused were you?
                        </HelperText>

                    </Card.Content>
                </Card>

                {/* Buttons */}
                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={isSaving}
                    disabled={isSaving}
                    style={styles.saveButton}
                >
                    Save Changes
                </Button>

                <Button
                    mode="outlined"
                    onPress={handleDelete}
                    textColor={theme.colors.error}
                    style={styles.deleteButton}
                >
                    Delete Session
                </Button>

                <Button
                    mode="text"
                    onPress={() => router.back()}
                    style={styles.cancelButton}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    card: {
        marginBottom: 16,
    },
    timeSection: {
        marginBottom: 16,
        gap: 12,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inputGroup: {
        flex: 1, // Fill the available column width
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        height: 48,
        paddingHorizontal: 0,
    },
    nudgeBtn: {
        margin: 0,
    },
    timeInput: {
        flex: 1,
        textAlign: 'center',
        backgroundColor: 'transparent',
        fontSize: 16, // Slightly smaller font for AM/PM to fit
        height: 48,
    },
    durationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 12,
        borderRadius: 8,
    },
    input: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        textAlign: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    starButton: {
        margin: 0,
        marginHorizontal: -4,
    },
    saveButton: {
        marginTop: 8,
        marginBottom: 12,
    },
    deleteButton: {
        marginBottom: 12,
        borderColor: 'transparent',
    },
    cancelButton: {
        marginBottom: 24,
    },
});
