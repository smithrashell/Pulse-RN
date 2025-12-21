/**
 * Format minutes into a human-readable string
 * 0-59 min: "45m"
 * 60-119 min: "1h 30m"
 * 120+ min: "2h 5m"
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format milliseconds as MM:SS or H:MM:SS
 */
export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Calculate duration in minutes between two timestamps
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
}

/**
 * Format a date as a short time string (e.g., "2:30 PM")
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format a date as relative to today (e.g., "Today", "Yesterday", "Monday")
 */
export function formatRelativeDay(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr = date.toDateString();

  if (dateStr === today.toDateString()) {
    return 'Today';
  }

  if (dateStr === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { weekday: 'long' });
}
