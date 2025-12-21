import { useEffect, useRef } from 'react';
import { useTimerStore } from '../stores';
import { formatElapsedTime } from '../utils/time';

/**
 * Hook for timer functionality with real-time updates
 */
export function useTimer() {
  const {
    activeSession,
    activeFocusArea,
    elapsedMs,
    isRunning,
    startSession,
    startQuickSession,
    stopSession,
    updateElapsed,
    loadActiveSession,
  } = useTimerStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession]);

  // Update elapsed time every second when running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        updateElapsed();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, updateElapsed]);

  return {
    activeSession,
    activeFocusArea,
    elapsedMs,
    isRunning,
    formattedTime: formatElapsedTime(elapsedMs),
    startSession,
    startQuickSession,
    stopSession,
  };
}

export default useTimer;
