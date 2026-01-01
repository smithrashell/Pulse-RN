import { and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../client';
import { sessions } from '../schema';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  subMonths,
  startOfDay,
  endOfDay,
} from 'date-fns';

export interface DayActivity {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  sessionCount: number;
}

export interface MonthActivityData {
  month: string; // YYYY-MM
  days: DayActivity[];
  totalMinutes: number;
  activeDays: number;
  comparison: {
    previousMonth: number;
    percentChange: number | null; // null if previous month had 0 minutes
  };
}

export const historyQueries = {
  /**
   * Get activity data for each day in a month
   */
  async getDailyActivityForMonth(month: Date): Promise<DayActivity[]> {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    // Get all days in the month
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Query sessions grouped by day
    const result = await db
      .select({
        date: sql<string>`DATE(${sessions.startTime} / 1000, 'unixepoch')`,
        totalMinutes: sql<number>`COALESCE(SUM(${sessions.durationMinutes}), 0)`,
        sessionCount: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(
        and(
          gte(sessions.startTime, monthStart),
          lte(sessions.startTime, monthEnd),
          sql`${sessions.endTime} IS NOT NULL`
        )
      )
      .groupBy(sql`DATE(${sessions.startTime} / 1000, 'unixepoch')`);

    // Create a map for quick lookup
    const activityMap = new Map<string, DayActivity>();
    for (const row of result) {
      activityMap.set(row.date, {
        date: row.date,
        totalMinutes: row.totalMinutes,
        sessionCount: row.sessionCount,
      });
    }

    // Return all days with activity data (0 for days without sessions)
    return daysInMonth.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return (
        activityMap.get(dateStr) || {
          date: dateStr,
          totalMinutes: 0,
          sessionCount: 0,
        }
      );
    });
  },

  /**
   * Get total minutes for a month
   */
  async getTotalMinutesForMonth(month: Date): Promise<number> {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${sessions.durationMinutes}), 0)`,
      })
      .from(sessions)
      .where(
        and(
          gte(sessions.startTime, monthStart),
          lte(sessions.startTime, monthEnd),
          sql`${sessions.endTime} IS NOT NULL`
        )
      );

    return result[0]?.total || 0;
  },

  /**
   * Get count of days with at least one session in a month
   */
  async getActiveDaysForMonth(month: Date): Promise<number> {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const result = await db
      .select({
        count: sql<number>`COUNT(DISTINCT DATE(${sessions.startTime} / 1000, 'unixepoch'))`,
      })
      .from(sessions)
      .where(
        and(
          gte(sessions.startTime, monthStart),
          lte(sessions.startTime, monthEnd),
          sql`${sessions.endTime} IS NOT NULL`
        )
      );

    return result[0]?.count || 0;
  },

  /**
   * Get complete month activity data including comparison with previous month
   */
  async getMonthActivityData(month: Date): Promise<MonthActivityData> {
    const [days, totalMinutes, activeDays, previousMonthMinutes] = await Promise.all([
      this.getDailyActivityForMonth(month),
      this.getTotalMinutesForMonth(month),
      this.getActiveDaysForMonth(month),
      this.getTotalMinutesForMonth(subMonths(month, 1)),
    ]);

    const percentChange =
      previousMonthMinutes > 0
        ? Math.round(((totalMinutes - previousMonthMinutes) / previousMonthMinutes) * 100)
        : null;

    return {
      month: format(month, 'yyyy-MM'),
      days,
      totalMinutes,
      activeDays,
      comparison: {
        previousMonth: previousMonthMinutes,
        percentChange,
      },
    };
  },

  /**
   * Get minutes for a specific day
   */
  async getMinutesForDay(date: Date): Promise<number> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${sessions.durationMinutes}), 0)`,
      })
      .from(sessions)
      .where(
        and(
          gte(sessions.startTime, dayStart),
          lte(sessions.startTime, dayEnd),
          sql`${sessions.endTime} IS NOT NULL`
        )
      );

    return result[0]?.total || 0;
  },
};

export default historyQueries;
