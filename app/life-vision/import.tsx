import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import {
    Text,
    TextInput,
    Button,
    useTheme,
    Card,
    List,
} from 'react-native-paper';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lifeGoalQueries } from '../../src/db/queries';
import { parseCSV, getValidGoalsForImport, type ParseResult, type ParsedGoal } from '../../src/utils/lifeGoalsImport';

const EXAMPLE_CSV = `title,category,timeWindow,description
Launch my own SaaS product,Entrepreneurship,MID_TERM,Build and scale a B2B product
Run a marathon,Health & Fitness,SHORT_TERM,Complete under 4 hours
Learn Spanish fluently,Education,MID_TERM,Conversational fluency`;

export default function ImportLifeGoalsScreen() {
    const theme = useTheme();
    const [csvInput, setCsvInput] = useState('');
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [importing, setImporting] = useState(false);

    const handlePreview = () => {
        if (!csvInput.trim()) {
            Alert.alert('Required', 'Please paste CSV data to import');
            return;
        }
        const result = parseCSV(csvInput);
        setParseResult(result);
    };

    const handleImport = async () => {
        if (!parseResult || parseResult.validCount === 0) {
            Alert.alert('No Valid Goals', 'Please fix the errors and try again');
            return;
        }

        setImporting(true);
        try {
            const existingCount = await lifeGoalQueries.getCount();
            const goalsToImport = getValidGoalsForImport(parseResult, existingCount);

            const imported = await lifeGoalQueries.createMany(goalsToImport);

            Alert.alert(
                'Import Complete',
                `Successfully imported ${imported} goals.`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('Error importing goals:', error);
            Alert.alert('Error', 'Failed to import goals');
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setParseResult(null);
        setCsvInput('');
    };

    const renderGoalPreview = (goal: ParsedGoal, index: number) => (
        <Card
            key={index}
            style={[styles.previewCard, !goal.isValid && { borderColor: theme.colors.error }]}
            mode="outlined"
        >
            <Card.Content>
                <View style={styles.previewRow}>
                    <Ionicons
                        name={goal.isValid ? 'checkmark-circle' : 'alert-circle'}
                        size={20}
                        color={goal.isValid ? theme.colors.tertiary : theme.colors.error}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                            {goal.title || '(No title)'}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {goal.category} | {goal.timeWindow}
                        </Text>
                        {!goal.isValid && goal.errors.length > 0 && (
                            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4 }}>
                                {goal.errors.join(', ')}
                            </Text>
                        )}
                    </View>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text variant="headlineSmall" style={styles.header}>
                    Import Goals
                </Text>

                {!parseResult ? (
                    <>
                        <Card style={styles.instructionsCard} mode="outlined">
                            <Card.Content>
                                <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8 }}>
                                    CSV Format
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Paste CSV data with columns: title, category, timeWindow, description{'\n\n'}
                                    <Text style={{ fontWeight: '600' }}>Categories:</Text> Career, Education, Entrepreneurship, Personal Brand, Financial, Health & Fitness, Relationships, Family, Lifestyle, Travel, Impact & Legacy, Mentorship & Network, Creative, Spiritual, Other{'\n\n'}
                                    <Text style={{ fontWeight: '600' }}>Time Windows:</Text> SHORT_TERM (1-2y), MID_TERM (3-5y), MID_LATE_TERM (6-9y), LONG_TERM (10-20y)
                                </Text>
                            </Card.Content>
                        </Card>

                        <List.Accordion
                            title="See Example"
                            left={props => <List.Icon {...props} icon="code-tags" />}
                            style={[styles.accordion, { backgroundColor: theme.colors.surfaceVariant }]}
                        >
                            <Card style={styles.exampleCard}>
                                <Card.Content>
                                    <Text variant="bodySmall" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                                        {EXAMPLE_CSV}
                                    </Text>
                                </Card.Content>
                            </Card>
                        </List.Accordion>

                        <TextInput
                            mode="outlined"
                            label="Paste CSV Data"
                            placeholder="title,category,timeWindow,description..."
                            value={csvInput}
                            onChangeText={setCsvInput}
                            multiline
                            numberOfLines={10}
                            style={styles.input}
                        />

                        <View style={styles.actions}>
                            <Button mode="outlined" onPress={() => router.back()} style={styles.button}>
                                Cancel
                            </Button>
                            <Button mode="contained" onPress={handlePreview} style={styles.button}>
                                Preview
                            </Button>
                        </View>
                    </>
                ) : (
                    <>
                        <Card style={styles.summaryCard} mode="elevated">
                            <Card.Content>
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryItem}>
                                        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.tertiary }}>
                                            {parseResult.validCount}
                                        </Text>
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                            Valid
                                        </Text>
                                    </View>
                                    {parseResult.invalidCount > 0 && (
                                        <View style={styles.summaryItem}>
                                            <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.error }}>
                                                {parseResult.invalidCount}
                                            </Text>
                                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                                Invalid
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </Card.Content>
                        </Card>

                        <Text variant="titleSmall" style={styles.previewLabel}>
                            Preview ({parseResult.goals.length} rows)
                        </Text>

                        {parseResult.goals.map((goal, index) => renderGoalPreview(goal, index))}

                        <View style={styles.actions}>
                            <Button mode="outlined" onPress={handleReset} style={styles.button} disabled={importing}>
                                Back
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleImport}
                                style={styles.button}
                                loading={importing}
                                disabled={importing || parseResult.validCount === 0}
                            >
                                Import {parseResult.validCount} Goals
                            </Button>
                        </View>
                    </>
                )}
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
    instructionsCard: {
        marginBottom: 16,
    },
    accordion: {
        marginBottom: 16,
        borderRadius: 8,
    },
    exampleCard: {
        marginHorizontal: 8,
        marginBottom: 8,
    },
    input: {
        marginBottom: 24,
    },
    summaryCard: {
        marginBottom: 24,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 48,
    },
    summaryItem: {
        alignItems: 'center',
    },
    previewLabel: {
        fontWeight: '600',
        marginBottom: 12,
    },
    previewCard: {
        marginBottom: 8,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    button: {
        flex: 1,
    },
});
