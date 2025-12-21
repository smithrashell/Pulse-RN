import { sessionQueries } from '../db/queries';
import { format, differenceInDays, subDays } from 'date-fns';

export type EngagementLevel = 'ACTIVE' | 'SLIPPING' | 'DORMANT' | 'RESET';

export interface EngagementState {
  lastActiveDate: string | null; // YYYY-MM-DD format
  currentStreak: number;
  gapDays: number;
  level: EngagementLevel;
}

// Engagement level thresholds (in days since last activity)
const ENGAGEMENT_THRESHOLDS = {
  ACTIVE: 1, // 0-1 days: Active
  SLIPPING: 3, // 2-3 days: Slipping
  DORMANT: 5, // 4-5 days: Dormant
  // 6+ days: Reset
};

// Messages for each engagement level
export const ENGAGEMENT_MESSAGES: Record<EngagementLevel, { title: string; message: string }> = {
  ACTIVE: {
    title: "You're on track!",
    message: 'Keep the momentum going.',
  },
  SLIPPING: {
    title: 'Welcome back!',
    message: 'Life gets busy. Ready to pick up where you left off?',
  },
  DORMANT: {
    title: 'Hey there',
    message: "It's been a few days. No judgment. Want to start small?",
  },
  RESET: {
    title: "Let's simplify",
    message: 'Life happened. No judgment. Pick just one thing to focus on today.',
  },
};

export const engagementService = {
  // Calculate engagement level based on gap days
  calculateLevel(gapDays: number): EngagementLevel {
    if (gapDays <= ENGAGEMENT_THRESHOLDS.ACTIVE) return 'ACTIVE';
    if (gapDays <= ENGAGEMENT_THRESHOLDS.SLIPPING) return 'SLIPPING';
    if (gapDays <= ENGAGEMENT_THRESHOLDS.DORMANT) return 'DORMANT';
    return 'RESET';
  },

  // Calculate streak from session history
  async calculateStreak(): Promise<number> {
    const uniqueDays = await sessionQueries.getUniqueDaysWithSessions();

    if (uniqueDays.length === 0) return 0;

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Check if the most recent session is today or yesterday
    const mostRecent = uniqueDays[0];
    if (mostRecent !== today && mostRecent !== yesterday) {
      return 0; // Streak broken
    }

    // Count consecutive days
    let streak = 0;
    let expectedDate = mostRecent === today ? new Date() : subDays(new Date(), 1);

    for (const dateStr of uniqueDays) {
      const expected = format(expectedDate, 'yyyy-MM-dd');

      if (dateStr === expected) {
        streak++;
        expectedDate = subDays(expectedDate, 1);
      } else {
        break; // Gap found, streak ends
      }
    }

    return streak;
  },

  // Get full engagement state
  async getEngagementState(): Promise<EngagementState> {
    const lastActiveDate = await sessionQueries.getLastActiveDate();
    const today = new Date();

    if (!lastActiveDate) {
      return {
        lastActiveDate: null,
        currentStreak: 0,
        gapDays: 999, // Large number for never used
        level: 'RESET',
      };
    }

    const lastActiveDateStr = format(lastActiveDate, 'yyyy-MM-dd');
    const gapDays = differenceInDays(today, lastActiveDate);
    const currentStreak = await this.calculateStreak();
    const level = this.calculateLevel(gapDays);

    return {
      lastActiveDate: lastActiveDateStr,
      currentStreak,
      gapDays,
      level,
    };
  },

  // Check if we should show the adaptive prompt
  shouldShowPrompt(level: EngagementLevel): boolean {
    return level !== 'ACTIVE';
  },

  // Get message for current engagement level
  getMessage(level: EngagementLevel): { title: string; message: string } {
    return ENGAGEMENT_MESSAGES[level];
  },

  // Get color for engagement level (for UI theming)
  getColor(level: EngagementLevel): 'primary' | 'secondary' | 'tertiary' | 'error' {
    switch (level) {
      case 'ACTIVE':
        return 'primary';
      case 'SLIPPING':
        return 'secondary';
      case 'DORMANT':
        return 'tertiary';
      case 'RESET':
        return 'error';
    }
  },
};

export default engagementService;
