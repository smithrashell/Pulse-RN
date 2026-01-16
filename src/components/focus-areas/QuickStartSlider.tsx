import React, { useState } from 'react';
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

  // Separate Areas from regular focus areas
  const areas = focusAreas.filter((fa) => fa.type === 'AREA');
  const standalones = focusAreas.filter((fa) => fa.type !== 'AREA');

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

  const handlePress = (focusArea: FocusArea) => {
    if (focusArea.type === 'AREA') {
      toggleArea(focusArea.id);
    } else {
      onStartSession(focusArea);
    }
  };

  // Get the expanded area name
  const expandedArea = areas.find((a) => a.id === expandedAreaId);

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

      {/* Main row: Quick Timer + standalones + areas */}
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

        {/* Standalone focus areas - tap to start */}
        {standalones.map((fa) => (
          <Button
            key={fa.id}
            mode="contained-tonal"
            onPress={() => handlePress(fa)}
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

        {/* Areas - tap to expand/collapse */}
        {areas.map((area) => (
          <Button
            key={area.id}
            mode="contained-tonal"
            onPress={() => handlePress(area)}
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
                  color={theme.colors.onSecondaryContainer}
                />
              )
            }
          >
            {area.name}
          </Button>
        ))}
      </ScrollView>

      {/* Expanded area children row */}
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
