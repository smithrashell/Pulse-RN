import { create } from 'zustand';
import { FocusArea, Session, DailyLog } from '../db/schema';
import { focusAreaQueries, sessionQueries, dailyLogQueries } from '../db/queries';
import { engagementService, EngagementState } from '../services/engagementService';
import { checkInService, CheckInState } from '../services/checkInService';
import { notificationService } from '../services/notificationService';
import { format, addDays, startOfWeek } from 'date-fns';

export interface AggregatedSession {
  focusAreaId: number | null;
  focusAreaName: string;
  focusAreaIcon: string;
  totalMinutes: number;
  sessionCount: number;
}

export interface WeekDayInfo {
  date: Date;
  dayOfWeek: number;
  totalMinutes: number;
  isToday: boolean;
  isSelected: boolean;
}

interface TodayState {
  // Data
  rootFocusAreas: FocusArea[]; // Root-level items for Quick Start
  areaChildren: Map<number, FocusArea[]>; // Area ID -> children
  focusAreasById: Map<number, FocusArea>; // All focus areas for lookup
  todaySessions: Session[];
  aggregatedSessions: AggregatedSession[];
  todayLog: DailyLog | null;
  totalMinutesToday: number;
  unassignedSessionCount: number;

  // Engagement
  engagementState: EngagementState | null;
  checkInState: CheckInState | null;

  // UI State
  selectedDate: Date;
  weekDays: WeekDayInfo[];
  isViewingPastDay: boolean;
  isLoading: boolean;

  // Expanded areas in Quick Start
  expandedAreaIds: Set<number>;

  // Actions
  loadData: () => Promise<void>;
  selectDate: (date: Date) => Promise<void>;
  selectToday: () => Promise<void>;
  toggleAreaExpanded: (areaId: number) => void;
  loadAreaChildren: (areaId: number) => Promise<void>;

  // Session actions
  deleteSession: (sessionId: number) => Promise<void>;
  assignSession: (sessionId: number, focusAreaId: number) => Promise<void>;

  // Daily log actions
  saveMorningIntention: (intention: string, commitment?: string) => Promise<void>;
  saveEveningReflection: (reflection: string, feeling?: number) => Promise<void>;

  // Check-in actions
  dismissWeeklyCheckIn: () => Promise<void>;
  dismissMonthlyCheckIn: () => Promise<void>;
  completeWeeklyCheckIn: () => Promise<void>;
  completeMonthlyCheckIn: () => Promise<void>;
}

export const useTodayStore = create<TodayState>((set, get) => ({
  // Initial state
  rootFocusAreas: [],
  areaChildren: new Map(),
  focusAreasById: new Map(),
  todaySessions: [],
  aggregatedSessions: [],
  todayLog: null,
  totalMinutesToday: 0,
  unassignedSessionCount: 0,
  engagementState: null,
  checkInState: null,
  selectedDate: new Date(),
  weekDays: [],
  isViewingPastDay: false,
  isLoading: true,
  expandedAreaIds: new Set(),

  loadData: async () => {
    set({ isLoading: true });

    try {
      const { selectedDate } = get();
      const today = new Date();
      const isToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

      // Load root focus areas (for Quick Start slider)
      const rootFocusAreasUnsorted = await focusAreaQueries.getRootActive();

      // Sort focus areas by most recent use (including child sessions for Areas)
      const recentFocusAreaIds = await sessionQueries.getFocusAreaIdsByRecentUse();
      const recentOrderMap = new Map<number, number>();

      // Build order map, also mapping child activity to parent Areas
      for (let i = 0; i < recentFocusAreaIds.length; i++) {
        const focusAreaId = recentFocusAreaIds[i];

        // Add the focus area itself
        if (!recentOrderMap.has(focusAreaId)) {
          recentOrderMap.set(focusAreaId, i);
        }

        // Check if this focus area has a parent (is child of an Area)
        const focusArea = await focusAreaQueries.getById(focusAreaId);
        if (focusArea?.parentId) {
          // Add parent Area with the same order (child's recency counts for parent)
          if (!recentOrderMap.has(focusArea.parentId)) {
            recentOrderMap.set(focusArea.parentId, i);
          }
        }
      }

      const rootFocusAreas = [...rootFocusAreasUnsorted].sort((a, b) => {
        const aOrder = recentOrderMap.get(a.id);
        const bOrder = recentOrderMap.get(b.id);

        // If both have been used, sort by recency
        if (aOrder !== undefined && bOrder !== undefined) {
          return aOrder - bOrder;
        }
        // If only one has been used, put it first
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;
        // If neither has been used, keep original order
        return 0;
      });

      // Load sessions for selected date
      const todaySessions = await sessionQueries.getCompletedForDay(selectedDate);

      // Aggregate sessions by focus area
      const aggregated = await sessionQueries.getAggregatedForDay(selectedDate);

      // Build a map of focus areas by ID for efficient lookup
      const focusAreasById = new Map<number, FocusArea>();

      const aggregatedSessions: AggregatedSession[] = await Promise.all(
        aggregated.map(async (agg) => {
          let name = 'Quick Timer';
          let icon = '⏱️';

          if (agg.focusAreaId) {
            const fa = await focusAreaQueries.getById(agg.focusAreaId);
            if (fa) {
              name = fa.name;
              icon = fa.icon;
              focusAreasById.set(fa.id, fa);
            }
          }

          return {
            focusAreaId: agg.focusAreaId,
            focusAreaName: name,
            focusAreaIcon: icon,
            totalMinutes: agg.totalMinutes,
            sessionCount: agg.sessionCount,
          };
        })
      );

      // Load daily log
      const todayLog = await dailyLogQueries.getForDate(selectedDate);

      // Calculate total minutes
      const totalMinutesToday = await sessionQueries.getTotalMinutesForDay(selectedDate);

      // Get unassigned session count
      const unassignedSessionCount = await sessionQueries.getUnassignedCount();

      // Load engagement state (only for today)
      let engagementState = null;
      let checkInState = null;
      if (isToday) {
        engagementState = await engagementService.getEngagementState();
        checkInState = await checkInService.getCheckInState();

        // Schedule return prompt based on engagement level
        if (engagementState) {
          const notificationPrefs = await notificationService.getPreferences();
          if (notificationPrefs.returnPromptsEnabled && notificationPrefs.permissionStatus === 'granted') {
            await notificationService.scheduleReturnPrompt(engagementState.level);
          }
        }
      }

      // Build week days for selector
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekDays: WeekDayInfo[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i);
        const minutes = await sessionQueries.getTotalMinutesForDay(date);
        weekDays.push({
          date,
          dayOfWeek: i,
          totalMinutes: minutes,
          isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
          isSelected: format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'),
        });
      }

      set({
        rootFocusAreas,
        focusAreasById,
        todaySessions,
        aggregatedSessions,
        todayLog,
        totalMinutesToday,
        unassignedSessionCount,
        engagementState,
        checkInState,
        weekDays,
        isViewingPastDay: !isToday,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading today data:', error);
      set({ isLoading: false });
    }
  },

  selectDate: async (date) => {
    set({ selectedDate: date });
    await get().loadData();
  },

  selectToday: async () => {
    await get().selectDate(new Date());
  },

  toggleAreaExpanded: (areaId) => {
    const { expandedAreaIds } = get();
    const newSet = new Set(expandedAreaIds);

    if (newSet.has(areaId)) {
      newSet.delete(areaId);
    } else {
      newSet.add(areaId);
      // Load children if not already loaded
      get().loadAreaChildren(areaId);
    }

    set({ expandedAreaIds: newSet });
  },

  loadAreaChildren: async (areaId) => {
    const children = await focusAreaQueries.getActiveChildren(areaId);
    const { areaChildren } = get();
    const newMap = new Map(areaChildren);
    newMap.set(areaId, children);
    set({ areaChildren: newMap });
  },

  deleteSession: async (sessionId) => {
    await sessionQueries.delete(sessionId);
    await get().loadData();
  },

  assignSession: async (sessionId, focusAreaId) => {
    await sessionQueries.assignToFocusArea(sessionId, focusAreaId);
    await get().loadData();
  },

  saveMorningIntention: async (intention, commitment) => {
    const { selectedDate } = get();
    await dailyLogQueries.updateMorningIntention(selectedDate, intention, commitment);
    await get().loadData();
  },

  saveEveningReflection: async (reflection, feeling) => {
    const { selectedDate } = get();
    await dailyLogQueries.updateEveningReflection(selectedDate, reflection, feeling);
    await get().loadData();
  },

  dismissWeeklyCheckIn: async () => {
    await checkInService.dismissWeeklyPrompt();
    const checkInState = await checkInService.getCheckInState();
    set({ checkInState });
  },

  dismissMonthlyCheckIn: async () => {
    await checkInService.dismissMonthlyPrompt();
    const checkInState = await checkInService.getCheckInState();
    set({ checkInState });
  },

  completeWeeklyCheckIn: async () => {
    await checkInService.completeWeeklyCheckIn();
    const checkInState = await checkInService.getCheckInState();
    set({ checkInState });
  },

  completeMonthlyCheckIn: async () => {
    await checkInService.completeMonthlyCheckIn();
    const checkInState = await checkInService.getCheckInState();
    set({ checkInState });
  },
}));

export default useTodayStore;
