import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, useTheme, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FocusArea } from '../../db/schema';
import { focusAreaQueries, sessionQueries } from '../../db/queries';

interface QuickStartSliderProps {
  focusAreas: FocusArea[];
  onStartSession: (focusArea: FocusArea) => void;
  onStartQuickSession: () => void;
}

export function QuickStartSlider({
  focusAreas,
  onStartSession,
  onStartQuickSession,
}: QuickStartSliderProps) {
  const theme = useTheme();

  // Track which Area is expanded (only one at a time)
  const [expandedAreaId, setExpandedAreaId] = useState<number | null>(null);
  // Cache children for expanded Area
  const [areaChildren, setAreaChildren] = useState<FocusArea[]>([]);
  // Track recent focus areas
  const [recentFocusAreas, setRecentFocusAreas] = useState<FocusArea[]>([]);

  // Separate Areas from regular focus areas
  const areas = focusAreas.filter((fa) => fa.type === 'AREA');
  const standalones = focusAreas.filter((fa) => fa.type !== 'AREA');

  // Get the expanded area
  const expandedArea = areas.find((a) => a.id === expandedAreaId);

  // Load recent focus areas on mount
  useEffect(() => {
    loadRecentFocusAreas();
  }, [focusAreas]);

  const loadRecentFocusAreas = async () => {
    // Get recent focus area IDs
    const recentIds = await sessionQueries.getFocusAreaIdsByRecentUse();

    // Filter to only include standalone focus areas (not Areas)
    const recentStandalones = standalones.filter((fa) => recentIds.includes(fa.id));

    // Sort by recent use, limit to 6-8 most recent
    const recentOrderMap = new Map(recentIds.map((id, index) => [id, index]));
    const sorted = [...recentStandalones].sort((a, b) => {
      const aOrder = recentOrderMap.get(a.id);
      const bOrder = recentOrderMap.get(b.id);
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return 0;
    });

    setRecentFocusAreas(sorted.slice(0, 8));
  };

  const toggleArea = async (areaId: number) => {
    if (expandedAreaId === areaId) {
      // Collapse
      setExpandedAreaId(null);
      setAreaChildren([]);
    } else {
      // Expand and load children, sorted by recent use
      setExpandedAreaId(areaId);
      const children = await focusAreaQueries.getActiveChildren(areaId);

      // Sort children by most recent use
      const recentFocusAreaIds = await sessionQueries.getFocusAreaIdsByRecentUse();
      const recentOrderMap = new Map(recentFocusAreaIds.map((id, index) => [id, index]));

      const sortedChildren = [...children].sort((a, b) => {
        const aOrder = recentOrderMap.get(a.id);
        const bOrder = recentOrderMap.get(b.id);
        if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;
        return 0;
      });

      setAreaChildren(sortedChildren);
    }
  };

  // Empty state
  if (focusAreas.length === 0) {
    return (
      <Card style={styles.emptyCard} mode="elevated">
        <Card.Content style={styles.emptyContent}>
          <Ionicons name="add-circle-outline" size={48} color={theme.colors.primary} />
          <Text
            variant="titleMedium"
            style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
          >
            No focus areas yet
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
          >
            Create focus areas to start tracking your time
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/focus-area/create')}
            style={styles.createButton}
          >
            Create Focus Area
          </Button>
        </Card.Content>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        Start Tracking
      </Text>

      {/* Row 1: Recent Focus Areas */}
      <View style={styles.section}>
        <Text
          variant="labelSmall"
          style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          Recent Focus Areas
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Quick Timer */}
          <Button
            mode="outlined"
            onPress={onStartQuickSession}
            style={styles.button}
            icon={() => <Ionicons name="timer-outline" size={18} color={theme.colors.primary} />}
          >
            Quick Timer
          </Button>

          {/* Recent standalone focus areas - tap to start (limited to 6) */}
          {recentFocusAreas.slice(0, 6).map((fa) => (
            <Button
              key={fa.id}
              mode="contained-tonal"
              onPress={() => onStartSession(fa)}
              style={styles.button}
              icon={() =>
                fa.icon ? (
                  <Text style={{ fontSize: 16 }}>{fa.icon}</Text>
                ) : (
                  <Ionicons name="play" size={16} color={theme.colors.onSecondaryContainer} />
                )
              }
            >
              {fa.name}
            </Button>
          ))}
        </ScrollView>
      </View>

      {/* Row 2: Areas */}
      {areas.length > 0 && (
        <View style={styles.section}>
          <Text
            variant="labelSmall"
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Areas
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Areas - tap to expand/collapse */}
            {areas.map((area) => (
              <Button
                key={area.id}
                mode="contained-tonal"
                onPress={() => toggleArea(area.id)}
                style={[
                  styles.button,
                  expandedAreaId === area.id && { backgroundColor: theme.colors.primaryContainer },
                ]}
                icon={() =>
                  area.icon ? (
                    <Text style={{ fontSize: 16 }}>{area.icon}</Text>
                  ) : (
                    <Ionicons
                      name={expandedAreaId === area.id ? 'chevron-down' : 'folder-outline'}
                      size={16}
                      color={
                        expandedAreaId === area.id
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.onSecondaryContainer
                      }
                    />
                  )
                }
              >
                {area.name}
              </Button>
            ))}
          </ScrollView>

          {/* Expanded area children row (dropdown style) */}
          {expandedAreaId && expandedArea && (
            <View style={styles.childrenSection}>
              <Text
                variant="labelSmall"
                style={[styles.childrenLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                {expandedArea.name} Focus Areas
              </Text>

              {areaChildren.length === 0 ? (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}
                >
                  No focus areas in this area yet
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {areaChildren.map((child) => (
                    <Button
                      key={child.id}
                      mode="contained-tonal"
                      onPress={() => onStartSession(child)}
                      style={[styles.button, { backgroundColor: theme.colors.primaryContainer }]}
                      icon={() =>
                        child.icon ? (
                          <Text style={{ fontSize: 16 }}>{child.icon}</Text>
                        ) : (
                          <Ionicons name="play" size={16} color={theme.colors.onPrimaryContainer} />
                        )
                      }
                    >
                      {child.name}
                    </Button>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: '600',
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    marginBottom: 6,
  },
  scrollContent: {
    gap: 8,
  },
  button: {
    borderRadius: 20,
  },
  childrenSection: {
    marginTop: 8,
  },
  childrenLabel: {
    marginBottom: 4,
  },
  emptyCard: {
    marginBottom: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    marginTop: 12,
    marginBottom: 4,
  },
  createButton: {
    marginTop: 16,
  },
});

export default QuickStartSlider;
