import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  useTheme,
  List,
  FAB,
  ActivityIndicator,
  TouchableRipple,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { focusAreaQueries } from '../../src/db/queries';
import { FocusArea } from '../../src/db/schema';

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
        {/* Header */}
        <Text
          variant="headlineMedium"
          style={{ fontWeight: 'bold', color: theme.colors.onBackground, marginBottom: 16 }}
        >
          Review
        </Text>

        {/* Review Navigation Cards */}
        <View style={styles.reviewNav}>
          <Card
            style={[styles.reviewCard, { backgroundColor: theme.colors.tertiaryContainer }]}
            onPress={() => router.push('/review/weekly')}
          >
            <Card.Content style={styles.reviewCardContent}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.onTertiaryContainer}
              />
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onTertiaryContainer, fontWeight: '600' }}
              >
                Weekly
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onTertiaryContainer, opacity: 0.8 }}
              >
                Reflect & learn
              </Text>
            </Card.Content>
          </Card>
          <Card
            style={[styles.reviewCard, { backgroundColor: theme.colors.tertiaryContainer }]}
            onPress={() => router.push('/review/monthly')}
          >
            <Card.Content style={styles.reviewCardContent}>
              <Ionicons
                name="analytics-outline"
                size={20}
                color={theme.colors.onTertiaryContainer}
              />
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onTertiaryContainer, fontWeight: '600' }}
              >
                Monthly
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onTertiaryContainer, opacity: 0.8 }}
              >
                Celebrate wins
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Month View Button */}
        <TouchableRipple
          onPress={() => router.push('/month-view')}
          style={[styles.monthViewButton, { backgroundColor: theme.colors.secondaryContainer }]}
        >
          <View style={styles.monthViewContent}>
            <View style={styles.monthViewLeft}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.onSecondaryContainer}
              />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSecondaryContainer, marginLeft: 8 }}
              >
                View Month Calendar
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSecondaryContainer} />
          </View>
        </TouchableRipple>

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
                  {/* Tappable section header - navigates to Area detail */}
                  <TouchableRipple
                    onPress={() => router.push(`/focus-area/${area.id}`)}
                    style={styles.areaSectionHeader}
                  >
                    <View style={styles.areaSectionContent}>
                      <Text
                        variant="labelMedium"
                        style={[
                          styles.sectionLabel,
                          { color: theme.colors.onSurfaceVariant, marginBottom: 0 },
                        ]}
                      >
                        {area.icon} {area.name.toUpperCase()}
                      </Text>
                      <View style={styles.areaSectionRight}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {children.length} items
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </View>
                    </View>
                  </TouchableRipple>
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
                            {child.type.charAt(0) + child.type.slice(1).toLowerCase()} •{' '}
                            {child.status.charAt(0) + child.status.slice(1).toLowerCase()}
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
  reviewNav: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  reviewCard: {
    flex: 1,
  },
  reviewCardContent: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  monthViewButton: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  monthViewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  monthViewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  areaSectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  areaSectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  areaSectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listItem: {
    paddingVertical: 12,
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
  fab: {
    backgroundColor: undefined,
  },
  fabGroup: {
    paddingBottom: 30,
  },
});
