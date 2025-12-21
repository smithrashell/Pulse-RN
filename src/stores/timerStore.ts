import { create } from 'zustand';
import { Session, FocusArea } from '../db/schema';
import { sessionQueries } from '../db/queries';

interface TimerState {
  // Active session
  activeSession: Session | null;
  activeFocusArea: FocusArea | null;

  // Timer display
  elapsedMs: number;
  isRunning: boolean;

  // Actions
  startSession: (focusArea?: FocusArea) => Promise<void>;
  startQuickSession: () => Promise<void>;
  stopSession: (note?: string, qualityRating?: number) => Promise<Session | null>;

  // Internal
  setActiveSession: (session: Session | null, focusArea?: FocusArea | null) => void;
  updateElapsed: () => void;
  loadActiveSession: () => Promise<void>;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeSession: null,
  activeFocusArea: null,
  elapsedMs: 0,
  isRunning: false,

  setActiveSession: (session, focusArea = null) => {
    set({
      activeSession: session,
      activeFocusArea: focusArea,
      isRunning: session !== null,
      elapsedMs: session ? Date.now() - session.startTime.getTime() : 0,
    });
  },

  updateElapsed: () => {
    const { activeSession } = get();
    if (activeSession) {
      set({ elapsedMs: Date.now() - activeSession.startTime.getTime() });
    }
  },

  loadActiveSession: async () => {
    const session = await sessionQueries.getActive();
    if (session) {
      // TODO: Load focus area if session has focusAreaId
      get().setActiveSession(session, null);
    }
  },

  startSession: async (focusArea) => {
    // Stop any active session first
    const { activeSession } = get();
    if (activeSession) {
      await get().stopSession();
    }

    const session = await sessionQueries.start(focusArea?.id);
    get().setActiveSession(session, focusArea || null);
  },

  startQuickSession: async () => {
    const { activeSession } = get();
    if (activeSession) {
      await get().stopSession();
    }

    const session = await sessionQueries.startQuick();
    get().setActiveSession(session, null);
  },

  stopSession: async (note, qualityRating) => {
    const { activeSession } = get();
    if (!activeSession) return null;

    const stoppedSession = await sessionQueries.stop(activeSession.id, note, qualityRating);

    set({
      activeSession: null,
      activeFocusArea: null,
      isRunning: false,
      elapsedMs: 0,
    });

    return stoppedSession;
  },
}));

export default useTimerStore;
