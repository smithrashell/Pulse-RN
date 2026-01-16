import { create } from 'zustand';
import { Session, FocusArea } from '../db/schema';
import { sessionQueries } from '../db/queries';
import { startOfDay } from 'date-fns';

// Maximum session duration before considering it stale (8 hours)
const MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

interface TimerState {
  // Active session
  activeSession: Session | null;
  activeFocusArea: FocusArea | null;

  // Timer display
  elapsedMs: number;
  isRunning: boolean;

  // Live note (editable while timer runs)
  liveNote: string;

  // Actions
  startSession: (focusArea?: FocusArea) => Promise<void>;
  startQuickSession: () => Promise<void>;
  stopSession: (note?: string, qualityRating?: number) => Promise<Session | null>;
  updateLiveNote: (note: string) => void;

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
  liveNote: '',

  setActiveSession: (session, focusArea = null) => {
    set({
      activeSession: session,
      activeFocusArea: focusArea,
      isRunning: session !== null,
      elapsedMs: session ? Date.now() - session.startTime.getTime() : 0,
      liveNote: session?.note || '',
    });
  },

  updateLiveNote: (note: string) => {
    set({ liveNote: note });
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
      const now = new Date();
      const elapsed = now.getTime() - session.startTime.getTime();
      const sessionStartDay = startOfDay(session.startTime);
      const today = startOfDay(now);

      // Check if session is stale (too long or spans multiple days)
      const isStale = elapsed > MAX_SESSION_DURATION_MS;
      const spansDays = sessionStartDay.getTime() !== today.getTime();

      if (isStale || spansDays) {
        // Auto-stop stale session - cap at end of start day or max duration
        const maxEndTime = new Date(
          Math.min(
            session.startTime.getTime() + MAX_SESSION_DURATION_MS,
            sessionStartDay.getTime() + 24 * 60 * 60 * 1000 - 1 // End of start day
          )
        );
        const durationMinutes = Math.round(
          (maxEndTime.getTime() - session.startTime.getTime()) / 60000
        );

        await sessionQueries.update(session.id, {
          endTime: maxEndTime,
          durationMinutes,
          note: session.note
            ? `${session.note} (auto-stopped - timer was left running)`
            : '(auto-stopped - timer was left running)',
        });

        console.warn(
          `Auto-stopped stale session ${session.id}: started ${session.startTime}, capped at ${durationMinutes} minutes`
        );
        return;
      }

      // Session is valid, restore it
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

    set({ liveNote: '' });
    const session = await sessionQueries.start(focusArea?.id);
    get().setActiveSession(session, focusArea || null);
  },

  startQuickSession: async () => {
    const { activeSession } = get();
    if (activeSession) {
      await get().stopSession();
    }

    set({ liveNote: '' });
    const session = await sessionQueries.startQuick();
    get().setActiveSession(session, null);
  },

  stopSession: async (note, qualityRating) => {
    const { activeSession, liveNote } = get();
    if (!activeSession) return null;

    // Use provided note, or fall back to live note
    const finalNote = note || liveNote || undefined;
    const stoppedSession = await sessionQueries.stop(activeSession.id, finalNote, qualityRating);

    set({
      activeSession: null,
      activeFocusArea: null,
      isRunning: false,
      elapsedMs: 0,
      liveNote: '',
    });

    return stoppedSession;
  },
}));

export default useTimerStore;
