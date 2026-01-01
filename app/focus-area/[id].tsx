import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  Chip,
  Menu,
  IconButton,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useFocusArea, useFocusAreaMutations } from '../../src/hooks';
import { sessionQueries } from '../../src/db/queries';
import { Session, FocusAreaStatus } from '../../src/db/schema';
import { formatMinutes } from '../../src/utils/time';
import { SessionCard } from '../../src/components/sessions/SessionCard';
import { startOfWeek, endOfWeek } from 'date-fns';

export default function FocusAreaDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const focusAreaId = parseInt(id || '0', 10);

  const { focusArea, children, parent, isLoading, refresh } = useFocusArea(focusAreaId);
  const { updateStatus, archive, remove } = useFocusAreaMutations();

  const [menuVisible, setMenuVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [reflectionModalVisible, setReflectionModalVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<FocusAreaStatus | null>(null);
  const [reflection, setReflection] = useState('');

  // Stats
  const [allTimeMinutes, setAllTimeMinutes] = useState(0);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);

  // Load stats
  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        if (!focusAreaId) return;

        // Get all sessions for this focus area
        const sessions = await sessionQueries.getByFocusAreaId(focusAreaId);
        setSessionCount(sessions.filter((s) => s.endTime).length);
        setRecentSessions(sessions.slice(0, 5)); // Show last 5 sessions

        // Calculate all time minutes
        const totalMinutes = sessions
          .filter((s) => s.durationMinutes)
          .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        setAllTimeMinutes(totalMinutes);

        // Calculate this week's minutes
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const weekTotal = await sessionQueries.getTotalMinutesForFocusAreaInRange(
          focusAreaId,
          weekStart,
          weekEnd
        );
        setWeekMinutes(weekTotal);
      };

      loadStats();
      refresh();
    }, [focusAreaId, refresh])
  );

  const handleStatusChange = (newStatus: FocusAreaStatus) => {
    setMenuVisible(false);
    if (newStatus === 'COMPLETED' || newStatus === 'ABANDONED') {
      setPendingStatus(newStatus);
      setReflectionModalVisible(true);
    } else {
      setStatusModalVisible(false);
      confirmStatusChange(newStatus);
    }
  };

  const confirmStatusChange = async (status: FocusAreaStatus, reflectionText?: string) => {
    if (!focusArea) return;

    const reflectionData =
      status === 'COMPLETED'
        ? { completion: reflectionText }
        : status === 'ABANDONED'
          ? { abandonment: reflectionText }
          : undefined;

    await updateStatus(focusArea.id, status, reflectionData);
    refresh();
    setReflectionModalVisible(false);
    setPendingStatus(null);
    setReflection('');
  };

  const handleArchive = () => {
    setMenuVisible(false);
    Alert.alert(
      'Archive Focus Area',
      'Are you sure you want to archive this focus area? It will be hidden from your lists but can be restored later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            if (focusArea) {
              await archive(focusArea.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Focus Area',
      'Are you sure you want to permanently delete this focus area? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (focusArea) {
              await remove(focusArea.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setMenuVisible(false);
    if (focusArea?.type === 'AREA') {
      router.push(`/focus-area/create-area?edit=${focusAreaId}`);
    } else {
      router.push(`/focus-area/create?edit=${focusAreaId}`);
    }
  };

  const handleDeleteSession = async (session: Session) => {
    await sessionQueries.delete(session.id);
    // Refresh stats
    const sessions = await sessionQueries.getByFocusAreaId(focusAreaId);
    setRecentSessions(sessions.slice(0, 5));
    setSessionCount(sessions.filter((s) => s.endTime).length);
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

  if (!focusArea) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text>Focus area not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = {
    ACTIVE: theme.colors.primaryContainer,
    ON_HOLD: theme.colors.surfaceVariant,
    COMPLETED: theme.colors.tertiaryContainer,
    ABANDONED: theme.colors.errorContainer,
  }[focusArea.status];

  const typeLabel = focusArea.type.charAt(0) + focusArea.type.slice(1).toLowerCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Focus Area Info */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={styles.icon}>{focusArea.icon}</Text>
              <View style={styles.headerText}>
                <Text variant="headlineSmall">{focusArea.name}</Text>
                <View style={styles.badges}>
                  <Chip compact style={styles.badge}>
                    {typeLabel}
                  </Chip>
                  <Chip compact style={[styles.badge, { backgroundColor: statusColor }]}>
                    {focusArea.status === 'ON_HOLD' ? 'On Hold' : focusArea.status.charAt(0) + focusArea.status.slice(1).toLowerCase()}
                  </Chip>
                </View>
              </View>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
              >
                <Menu.Item onPress={handleEdit} title="Edit" leadingIcon="pencil" />
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    setStatusModalVisible(true);
                  }}
                  title="Change Status"
                  leadingIcon="swap-horizontal"
                />
                <Divider />
                <Menu.Item onPress={handleArchive} title="Archive" leadingIcon="archive" />
                <Menu.Item
                  onPress={handleDelete}
                  title="Delete"
                  leadingIcon="delete"
                  titleStyle={{ color: theme.colors.error }}
                />
              </Menu>
            </View>

            {/* Parent reference */}
            {parent && (
              <Chip
                style={styles.parentChip}
                icon={() => <Text>{parent.icon}</Text>}
                onPress={() => router.push(`/focus-area/${parent.id}`)}
              >
                In: {parent.name}
              </Chip>
            )}

            {focusArea.description && (
              <Text
                variant="bodyMedium"
                style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
              >
                {focusArea.description}
              </Text>
            )}

            {focusArea.targetOutcome && (
              <View style={styles.targetSection}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                  Target Outcome
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {focusArea.targetOutcome}
                </Text>
              </View>
            )}

            {focusArea.identityStatement && (
              <View style={styles.targetSection}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                  Identity
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface, fontStyle: 'italic' }}
                >
                  "{focusArea.identityStatement}"
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Children (for Areas) */}
        {focusArea.type === 'AREA' && children.length > 0 && (
          <Card style={styles.card} mode="elevated">
            <Card.Title title="Focus Areas in this Area" />
            <Card.Content>
              {children.map((child) => (
                <Chip
                  key={child.id}
                  style={styles.childChip}
                  icon={() => <Text>{child.icon}</Text>}
                  onPress={() => router.push(`/focus-area/${child.id}`)}
                >
                  {child.name}
                </Chip>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Progress Card (only for trackable types) */}
        {focusArea.type !== 'AREA' && (
          <Card style={styles.card} mode="elevated">
            <Card.Title title="Progress" />
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                    {formatMinutes(allTimeMinutes)}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    All Time
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                    {formatMinutes(weekMinutes)}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    This Week
                  </Text>
                  {focusArea.targetTimeWeeklyMinutes && (
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                      / {formatMinutes(focusArea.targetTimeWeeklyMinutes)} goal
                    </Text>
                  )}
                </View>
                <View style={styles.stat}>
                  <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                    {sessionCount}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Sessions
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Session History (only for trackable types) */}
        {focusArea.type !== 'AREA' && (
          <Card style={styles.card} mode="elevated">
            <Card.Title title="Recent Sessions" />
            <Card.Content>
              {recentSessions.length === 0 ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No sessions recorded yet.
                </Text>
              ) : (
                recentSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    focusArea={focusArea}
                    onDelete={() => handleDeleteSession(session)}
                    onEdit={() => router.push(`/session/${session.id}`)}
                  />
                ))
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Status Change Modal */}
      <Portal>
        <Modal
          visible={statusModalVisible}
          onDismiss={() => setStatusModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={{ marginBottom: 16 }}>
            Change Status
          </Text>
          {(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ABANDONED'] as FocusAreaStatus[]).map((status) => (
            <Button
              key={status}
              mode={focusArea.status === status ? 'contained' : 'outlined'}
              onPress={() => handleStatusChange(status)}
              style={styles.statusButton}
              disabled={focusArea.status === status}
            >
              {status === 'ON_HOLD' ? 'On Hold' : status.charAt(0) + status.slice(1).toLowerCase()}
            </Button>
          ))}
          <Button onPress={() => setStatusModalVisible(false)} style={{ marginTop: 8 }}>
            Cancel
          </Button>
        </Modal>
      </Portal>

      {/* Reflection Modal (for completed/abandoned) */}
      <Portal>
        <Modal
          visible={reflectionModalVisible}
          onDismiss={() => {
            setReflectionModalVisible(false);
            setPendingStatus(null);
            setReflection('');
          }}
          contentContainerStyle={[styles.reflectionModal, { backgroundColor: theme.colors.surface }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.reflectionModalContent}
            >
              <Text variant="titleLarge" style={{ marginBottom: 8 }}>
                {pendingStatus === 'COMPLETED'
                  ? 'Completion Reflection'
                  : 'Why are you abandoning this?'}
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
              >
                {pendingStatus === 'COMPLETED'
                  ? 'What did you learn? What are you proud of?'
                  : 'This helps you understand patterns and make better decisions.'}
              </Text>
              <TextInput
                mode="outlined"
                label="Reflection"
                value={reflection}
                onChangeText={setReflection}
                multiline
                numberOfLines={4}
                style={{ marginBottom: 16 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <Button
                  onPress={() => {
                    setReflectionModalVisible(false);
                    setPendingStatus(null);
                    setReflection('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => pendingStatus && confirmStatusChange(pendingStatus, reflection)}
                >
                  {pendingStatus === 'COMPLETED' ? 'Complete' : 'Abandon'}
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
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
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 40,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  badges: {
    maxHeight: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  badge: {
    height: 30,
  },
  parentChip: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  childChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  description: {
    marginTop: 16,
  },
  targetSection: {
    marginTop: 16,
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  reflectionModal: {
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  reflectionModalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusButton: {
    marginBottom: 8,
  },
});
