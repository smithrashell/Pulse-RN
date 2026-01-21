import { format, startOfWeek, subWeeks, isSameWeek } from 'date-fns';
import {
  accountabilityPartnerQueries,
  partnerCheckInQueries,
} from '../db/queries/accountability';
import { quarterlyGoalQueries, disciplineQueries } from '../db/queries';
import { AccountabilityPartner, PartnerCheckIn, DayOfWeek } from '../db/schema';

/**
 * Get current week in YYYY-Www format (e.g., "2026-W03")
 */
export function getCurrentWeek(): string {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const year = format(weekStart, 'yyyy');
  const weekNum = format(now, 'II'); // ISO week number
  return `${year}-W${weekNum}`;
}

/**
 * Get previous week in YYYY-Www format
 */
export function getPreviousWeek(week: string): string {
  const [yearStr, weekStr] = week.split('-W');
  const weekNum = parseInt(weekStr, 10);
  const year = parseInt(yearStr, 10);

  if (weekNum === 1) {
    // Go to last week of previous year (approximately 52)
    return `${year - 1}-W52`;
  }
  return `${year}-W${String(weekNum - 1).padStart(2, '0')}`;
}

/**
 * Calculate check-in streak (consecutive weeks with completed check-ins)
 */
export function calculatePartnerStreak(checkIns: PartnerCheckIn[]): number {
  // Filter completed check-ins and sort by week descending
  const completed = checkIns
    .filter((c) => c.completedAt)
    .sort((a, b) => b.week.localeCompare(a.week));

  if (completed.length === 0) return 0;

  let streak = 0;
  let expectedWeek = getCurrentWeek();

  // If we haven't checked in this week yet, start from last week
  const thisWeekCheckIn = completed.find((c) => c.week === expectedWeek);
  if (!thisWeekCheckIn) {
    expectedWeek = getPreviousWeek(expectedWeek);
  }

  for (const checkIn of completed) {
    if (checkIn.week === expectedWeek) {
      streak++;
      expectedWeek = getPreviousWeek(expectedWeek);
    } else if (checkIn.week < expectedWeek) {
      // Gap in streak
      break;
    }
  }

  return streak;
}

/**
 * Check if check-in is due today
 */
export function isCheckInDueToday(partner: AccountabilityPartner): boolean {
  const today = new Date();
  const dayName = format(today, 'EEEE') as DayOfWeek;
  return dayName === partner.checkInDay;
}

/**
 * Check if check-in is overdue (not done this week and we're past check-in day)
 */
export async function isCheckInOverdue(partner: AccountabilityPartner): Promise<boolean> {
  const currentWeek = getCurrentWeek();
  const thisWeekCheckIn = await partnerCheckInQueries.getForWeek(partner.id, currentWeek);

  // If already completed this week, not overdue
  if (thisWeekCheckIn?.completedAt) {
    return false;
  }

  // Check if we're past check-in day this week
  const today = new Date();
  const dayName = format(today, 'EEEE') as DayOfWeek;
  const daysOfWeek: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const todayIndex = daysOfWeek.indexOf(dayName);
  const checkInDayIndex = daysOfWeek.indexOf(partner.checkInDay);

  // Overdue if today is after check-in day
  return todayIndex > checkInDayIndex;
}

export interface AccountabilityState {
  partner: AccountabilityPartner | null;
  streak: number;
  isDueToday: boolean;
  isOverdue: boolean;
  lastCheckIn: PartnerCheckIn | null;
}

export const accountabilityService = {
  /**
   * Get the current accountability state
   */
  async getState(): Promise<AccountabilityState> {
    const partner = await accountabilityPartnerQueries.getActive();

    if (!partner) {
      return {
        partner: null,
        streak: 0,
        isDueToday: false,
        isOverdue: false,
        lastCheckIn: null,
      };
    }

    const checkIns = await partnerCheckInQueries.getForPartner(partner.id);
    const streak = calculatePartnerStreak(checkIns);
    const isDueToday = isCheckInDueToday(partner);
    const isOverdue = await isCheckInOverdue(partner);
    const lastCheckIn = checkIns.find((c) => c.completedAt) || null;

    return {
      partner,
      streak,
      isDueToday,
      isOverdue,
      lastCheckIn,
    };
  },

  /**
   * Create or get check-in for current week
   */
  async getOrCreateThisWeekCheckIn(partnerId: number): Promise<PartnerCheckIn> {
    const currentWeek = getCurrentWeek();
    let checkIn = await partnerCheckInQueries.getForWeek(partnerId, currentWeek);

    if (!checkIn) {
      checkIn = await partnerCheckInQueries.create({
        partnerId,
        week: currentWeek,
      });
    }

    return checkIn;
  },

  /**
   * Complete a check-in
   */
  async completeCheckIn(
    checkInId: number,
    data: {
      topicsDiscussed?: string;
      partnerFeedback?: string;
      commitmentMade?: string;
      feltProductiveRating?: number;
    }
  ): Promise<PartnerCheckIn> {
    return partnerCheckInQueries.update(checkInId, {
      ...data,
      completedAt: new Date(),
    });
  },

  /**
   * Generate shareable goals text
   */
  async generateShareText(includeQuarterly = true, includeDisciplines = true): Promise<string> {
    const lines: string[] = [];
    const now = new Date();
    const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

    lines.push(`🎯 ${quarter} GOALS - Accountability Update`);
    lines.push('');

    if (includeDisciplines) {
      const disciplines = await disciplineQueries.getActive();
      if (disciplines.length > 0) {
        lines.push('MY DISCIPLINES:');
        for (const d of disciplines) {
          const freq =
            d.frequency === 'DAILY'
              ? 'Daily'
              : d.frequency === 'WEEKDAYS'
                ? 'Weekdays'
                : d.frequency === 'WEEKENDS'
                  ? 'Weekends'
                  : d.frequency === 'ALWAYS'
                    ? 'Always'
                    : 'Custom';
          lines.push(`• ${d.title} (${freq})`);
        }
        lines.push('');
      }
    }

    if (includeQuarterly) {
      const goals = await quarterlyGoalQueries.getForCurrentQuarter();
      if (goals.length > 0) {
        lines.push(`MY ${goals.length} GOALS:`);
        for (const goal of goals) {
          const status =
            goal.status === 'COMPLETED' ? '✓' : goal.status === 'IN_PROGRESS' ? '◉' : '○';
          lines.push(`${goal.position}. ${status} ${goal.title}`);
        }
        lines.push('');

        const inProgress = goals.filter((g) => g.status === 'IN_PROGRESS').length;
        const completed = goals.filter((g) => g.status === 'COMPLETED').length;
        lines.push(`Progress: ${completed} done | ${inProgress} in progress`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('Generated with Pulse');

    return lines.join('\n');
  },

  getCurrentWeek,
  getPreviousWeek,
  calculatePartnerStreak,
};
