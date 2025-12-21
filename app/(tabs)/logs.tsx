import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, useTheme, List, Chip, FAB, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { focusAreaQueries } from '../../src/db/queries';
import { FocusArea, FocusAreaStatus } from '../../src/db/schema';

export default function LogsScreen() {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [archivedAreas, setArchivedAreas] = useState<FocusArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all active focus areas
      const active = await focusAreaQueries.getAll();
      const nonArchived = active.filter((fa) => !fa.archived);
      const archived = active.filter((fa) => fa.archived);

      // Sort: Areas first, then by name
      const sorted = nonArchived.sort((a, b) => {
        if (a.type === 'AREA' && b.type !== 'AREA') return -1;
        if (a.type !== 'AREA' && b.type === 'AREA') return 1;
        return a.name.localeCompare(b.name);
      });

      setFocusAreas(sorted);
      setArchivedAreas(archived);
    } catch (error) {
      console.error('Error loading focus areas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getStatusColor = (status: FocusAreaStatus) => {
    switch (status) {
      case 'ACTIVE':
        return theme.colors.primaryContainer;
      case 'PAUSED':
        return theme.colors.surfaceVariant;
      case 'COMPLETED':
        return theme.colors.tertiaryContainer;
      case 'ABANDONED':
        return theme.colors.errorContainer;
      default:
        return theme.colors.surfaceVariant;
    }
  };

  // Group focus areas by their parent
  const areas = focusAreas.filter((fa) => fa.type === 'AREA');
  const standalones = focusAreas.filter((fa) => !fa.parentFocusAreaId && fa.type !== 'AREA');

  const getChildrenForArea = (areaId: number) =>
    focusAreas.filter((fa) => fa.parentFocusAreaId === areaId);

  if (isLoading) {
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
        {focusAreas.length === 0 ? (
          <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.emptyContent}>
              <Ionicons name="folder-open-outline" size={64} color={theme.colors.outline} />
              <Text
                variant="headlineSmall"
                style={{ color: theme.colors.onSurface, textAlign: 'center', marginTop: 16 }}
              >
                No Focus Areas Yet
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
              >
                Create focus areas to track your time and progress across different life areas.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            {/* Standalone focus areas */}
            {standalones.length > 0 && (
              <>
                <Text
                  variant="labelMedium"
                  style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  FOCUS AREAS
                </Text>
                {standalones.map((fa) => (
                  <Card
                    key={fa.id}
                    style={styles.card}
                    mode="elevated"
                    onPress={() => router.push(`/focus-area/${fa.id}`)}
                  >
                    <Card.Content style={styles.cardContent}>
                      <Text style={styles.icon}>{fa.icon}</Text>
                      <View style={styles.cardTextContent}>
                        <Text variant="bodyLarge" style={{ fontWeight: '500' }}>
                          {fa.name}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {fa.type.charAt(0) + fa.type.slice(1).toLowerCase()} •{' '}
                          {fa.status.charAt(0) + fa.status.slice(1).toLowerCase()}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Card.Content>
                  </Card>
                ))}
              </>
            )}

            {/* Areas with their children */}
            {areas.map((area) => {
              const children = getChildrenForArea(area.id);
              return (
                <View key={area.id}>
                  <Text
                    variant="labelMedium"
                    style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {area.icon} {area.name.toUpperCase()}
                  </Text>
                  {/* Area card */}
                  <Card
                    style={[styles.card, { backgroundColor: theme.colors.secondaryContainer }]}
                    mode="elevated"
                    onPress={() => router.push(`/focus-area/${area.id}`)}
                  >
                    <Card.Content style={styles.cardContent}>
                      <Text style={styles.icon}>{area.icon}</Text>
                      <View style={styles.cardTextContent}>
                        <Text
                          variant="bodyLarge"
                          style={{ fontWeight: '500', color: theme.colors.onSecondaryContainer }}
                        >
                          {area.name}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSecondaryContainer, opacity: 0.8 }}
                        >
                          Area • {children.length} focus areas
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.colors.onSecondaryContainer}
                      />
                    </Card.Content>
                  </Card>
                  {/* Child focus area cards */}
                  {children.map((child) => (
                    <Card
                      key={child.id}
                      style={styles.card}
                      mode="elevated"
                      onPress={() => router.push(`/focus-area/${child.id}`)}
                    >
                      <Card.Content style={styles.cardContent}>
                        <Text style={styles.icon}>{child.icon}</Text>
                        <View style={styles.cardTextContent}>
                          <Text variant="bodyLarge" style={{ fontWeight: '500' }}>
                            {child.name}
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {child.type.charAt(0) + child.type.slice(1).toLowerCase()}
                          </Text>
                        </View>
                        <Chip
                          compact
                          style={[
                            styles.statusChip,
                            { backgroundColor: getStatusColor(child.status) },
                          ]}
                        >
                          {child.status.charAt(0) + child.status.slice(1).toLowerCase()}
                        </Chip>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={theme.colors.onSurfaceVariant}
                          style={{ marginLeft: 8 }}
                        />
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              );
            })}

            {/* Archived Section */}
            {archivedAreas.length > 0 && (
              <>
                <List.Accordion
                  title={`Archived (${archivedAreas.length})`}
                  left={(props) => <List.Icon {...props} icon="archive" />}
                  expanded={showArchived}
                  onPress={() => setShowArchived(!showArchived)}
                >
                  <Card style={styles.card} mode="outlined">
                    {archivedAreas.map((fa, index) => (
                      <View key={fa.id}>
                        {index > 0 && <View style={styles.divider} />}
                        <List.Item
                          title={fa.name}
                          description={`${fa.type.charAt(0)}${fa.type.slice(1).toLowerCase()} • Archived`}
                          left={() => (
                            <Text style={[styles.icon, { opacity: 0.5 }]}>{fa.icon}</Text>
                          )}
                          right={() => (
                            <Ionicons
                              name="chevron-forward"
                              size={20}
                              color={theme.colors.onSurfaceVariant}
                            />
                          )}
                          onPress={() => router.push(`/focus-area/${fa.id}`)}
                          style={styles.listItem}
                          titleStyle={{ color: theme.colors.onSurfaceVariant }}
                        />
                      </View>
                    ))}
                  </Card>
                </List.Accordion>
              </>
            )}
          </>
        )}
      </ScrollView>

      {isFocused && (
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            {
              icon: 'target',
              label: 'Create Focus Area',
              onPress: () => router.push('/focus-area/create'),
            },
            {
              icon: 'folder-outline',
              label: 'Create Area',
              onPress: () => router.push('/focus-area/create-area'),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          fabStyle={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          style={styles.fabGroup}
        />
      )}
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
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTextContent: {
    flex: 1,
    marginLeft: 8,
  },
  emptyContent: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  sectionLabel: {
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  listItem: {
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 56,
  },
  icon: {
    fontSize: 24,
  },
  statusChip: {
    height: 24,
  },
  fab: {
    backgroundColor: undefined,
  },
  fabGroup: {
    paddingBottom: 30,
  },
});
