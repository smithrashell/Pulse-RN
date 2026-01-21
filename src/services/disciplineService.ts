import {
  format,
  subDays,
  isToday,
  isYesterday,
  parseISO,
  getDay,
  eachDayOfInterval,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';
import {
  Discipline,
  DisciplineCheck,
  DisciplineFrequency,
} from '../db/schema';
import { disciplineQueries, disciplineCheckQueries } from '../db/queries';
import { getQuarterDates } from '../utils/quarter';

// Day mapping for specific days
const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export interface DisciplineStats {
  streak: number;
  quarterConsistency: number; // 0-100 percentage
  totalChecks: number;
  nailitCount: number;
  closeCount: number;
  missedCount: number;
}

export interface TodayDiscipline {
  discipline: Discipline;
  isApplicableToday: boolean;
  todayCheck: DisciplineCheck | null;
  streak: number;
  nextApplicableDay: string | null; // For non-applicable days
}

export const disciplineService = {
  /**
   * Check if a discipline is applicable on a given date
   */
  isApplicableOnDate(discipline: Discipline, date: Date): boolean {
    const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday

    switch (discipline.frequency) {
      case 'DAILY':
        return true;

      case 'WEEKDAYS':
        return dayOfWeek >= 1 && dayOfWeek <= 5;

      case 'WEEKENDS':
        return dayOfWeek === 0 || dayOfWeek === 6;

      case 'SPECIFIC_DAYS':
        if (!discipline.specificDays) return false;
        try {
          const days: string[] = JSON.parse(discipline.specificDays);
          return days.some((d) => DAY_MAP[d.toLowerCase()] === dayOfWeek);
        } catch {
          return false;
        }

      case 'ALWAYS':
        return true;

      default:
        return true;
    }
  },

  /**
   * Get the next applicable day for a discipline (for showing "Next: Thursday")
   */
  getNextApplicableDay(discipline: Discipline, fromDate: Date = new Date()): Date | null {
    if (this.isApplicableOnDate(discipline, fromDate)) {
      return fromDate;
    }

    // Check next 7 days
    for (let i = 1; i <= 7; i++) {
      const nextDate = subDays(fromDate, -i);
      if (this.isApplicableOnDate(discipline, nextDate)) {
        return nextDate;
      }
    }
    return null;
  },

  /**
   * Calculate current streak for a discipline
   */
  calculateStreak(discipline: Discipline, checks: DisciplineCheck[]): number {
    if (checks.length === 0) return 0;

    // Sort checks by date descending
    const sortedChecks = [...checks]
      .filter((c) => c.rating !== 'MISSED')
      .sort((a, b) => b.date.localeCompare(a.date));

    if (sortedChecks.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();

    // If today is not applicable, start from the last applicable day
    while (!this.isApplicableOnDate(discipline, currentDate)) {
      currentDate = subDays(currentDate, 1);
    }

    // Check if the most recent applicable day was missed
    const todayStr = format(currentDate, 'yyyy-MM-dd');
    const hasCheckForToday = sortedChecks.some((c) => c.date === todayStr);

    // If today is applicable but no check yet, check from yesterday
    if (!hasCheckForToday && this.isApplicableOnDate(discipline, currentDate)) {
      // If it's still early in the day, don't break the streak
      // But for simplicity, we'll just check from the most recent check
    }

    // Build streak from checks
    for (const check of sortedChecks) {
      const checkDate = parseISO(check.date);

      // Skip future dates
      if (isAfter(startOfDay(checkDate), startOfDay(new Date()))) {
        continue;
      }

      // Find expected date (going backwards through applicable days)
      while (!this.isApplicableOnDate(discipline, currentDate) && isBefore(currentDate, new Date())) {
        currentDate = subDays(currentDate, 1);
      }

      const expectedDateStr = format(currentDate, 'yyyy-MM-dd');

      if (check.date === expectedDateStr) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else if (check.date < expectedDateStr) {
        // Missed a day, streak is broken
        break;
      }
    }

    return streak;
  },

  /**
   * Get all applicable days in a quarter for a discipline
   */
  getApplicableDaysInQuarter(discipline: Discipline, quarter: string): number {
    const { start, end } = getQuarterDates(quarter);
    const today = new Date();
    const endDate = isBefore(end, today) ? end : today;

    // Don't count days before discipline was started
    const startDate = discipline.startedAt && isAfter(discipline.startedAt, start)
      ? discipline.startedAt
      : start;

    if (isAfter(startDate, endDate)) return 0;

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.filter((d) => this.isApplicableOnDate(discipline, d)).length;
  },

  /**
   * Calculate quarter consistency percentage
   */
  calculateQuarterConsistency(
    discipline: Discipline,
    checks: DisciplineCheck[],
    quarter: string
  ): number {
    const applicableDays = this.getApplicableDaysInQuarter(discipline, quarter);
    if (applicableDays === 0) return 0;

    const { start, end } = getQuarterDates(quarter);
    const successfulChecks = checks.filter(
      (c) =>
        c.rating !== 'MISSED' &&
        c.date >= format(start, 'yyyy-MM-dd') &&
        c.date <= format(end, 'yyyy-MM-dd')
    ).length;

    return Math.round((successfulChecks / applicableDays) * 100);
  },

  /**
   * Get full stats for a discipline
   */
  async getStats(discipline: Discipline, quarter?: string): Promise<DisciplineStats> {
    const checks = await disciplineCheckQueries.getForDiscipline(discipline.id);

    const streak = this.calculateStreak(discipline, checks);
    const quarterConsistency = quarter
      ? this.calculateQuarterConsistency(discipline, checks, quarter)
      : 0;

    const nailitCount = checks.filter((c) => c.rating === 'NAILED_IT').length;
    const closeCount = checks.filter((c) => c.rating === 'CLOSE').length;
    const missedCount = checks.filter((c) => c.rating === 'MISSED').length;

    return {
      streak,
      quarterConsistency,
      totalChecks: checks.length,
      nailitCount,
      closeCount,
      missedCount,
    };
  },

  /**
   * Get today's disciplines with their status
   */
  async getTodayDisciplines(): Promise<TodayDiscipline[]> {
    const activeDisciplines = await disciplineQueries.getActive();
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const results: TodayDiscipline[] = [];

    for (const discipline of activeDisciplines) {
      const isApplicableToday = this.isApplicableOnDate(discipline, today);
      const todayCheck = await disciplineCheckQueries.getForDate(discipline.id, todayStr);
      const recentChecks = await disciplineCheckQueries.getRecent(discipline.id, 90);
      const streak = this.calculateStreak(discipline, recentChecks);

      let nextApplicableDay: string | null = null;
      if (!isApplicableToday) {
        const nextDate = this.getNextApplicableDay(discipline, subDays(today, -1));
        nextApplicableDay = nextDate ? format(nextDate, 'EEEE') : null;
      }

      results.push({
        discipline,
        isApplicableToday,
        todayCheck: todayCheck || null,
        streak,
        nextApplicableDay,
      });
    }

    // Sort: applicable today first, then by creation date
    return results.sort((a, b) => {
      if (a.isApplicableToday && !b.isApplicableToday) return -1;
      if (!a.isApplicableToday && b.isApplicableToday) return 1;
      return a.discipline.createdAt.getTime() - b.discipline.createdAt.getTime();
    });
  },

  /**
   * Check in for a discipline today
   */
  async checkIn(
    disciplineId: number,
    rating: 'NAILED_IT' | 'CLOSE' | 'MISSED',
    actualTime?: string,
    note?: string
  ): Promise<DisciplineCheck> {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    return disciplineCheckQueries.upsert({
      disciplineId,
      date: todayStr,
      rating,
      actualTime,
      note,
    });
  },

  /**
   * Get frequency display label
   */
  getFrequencyLabel(discipline: Discipline): string {
    switch (discipline.frequency) {
      case 'DAILY':
        return 'Daily';
      case 'WEEKDAYS':
        return 'Weekdays';
      case 'WEEKENDS':
        return 'Weekends';
      case 'SPECIFIC_DAYS':
        if (discipline.specificDays) {
          try {
            const days: string[] = JSON.parse(discipline.specificDays);
            return days.map((d) => d.slice(0, 3)).join('/');
          } catch {
            return 'Specific days';
          }
        }
        return 'Specific days';
      case 'ALWAYS':
        return 'Always';
      default:
        return discipline.frequency;
    }
  },

  /**
   * Soft limit check - warn if adding more than 3 active disciplines
   */
  async shouldWarnAboutLimit(): Promise<boolean> {
    const activeCount = await disciplineQueries.getActiveCount();
    return activeCount >= 3;
  },
};

export default disciplineService;
