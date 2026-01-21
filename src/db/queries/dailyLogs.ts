import { eq, gte, lte, desc, and } from 'drizzle-orm';
import { db } from '../client';
import { dailyLogs, DailyLog, NewDailyLog } from '../schema';
import { format } from 'date-fns';

// Helper to format date as YYYY-MM-DD
const formatDate = (date: Date): string => format(date, 'yyyy-MM-dd');

export const dailyLogQueries = {
  // Get all logs
  async getAll(): Promise<DailyLog[]> {
    return db.select().from(dailyLogs).orderBy(desc(dailyLogs.date));
  },

  // Get log for a specific date
  async getForDate(date: Date): Promise<DailyLog | undefined> {
    const dateStr = formatDate(date);
    const results = await db.select().from(dailyLogs).where(eq(dailyLogs.date, dateStr)).limit(1);
    return results[0];
  },

  // Get recent logs
  async getRecent(limit: number = 7): Promise<DailyLog[]> {
    return db.select().from(dailyLogs).orderBy(desc(dailyLogs.date)).limit(limit);
  },

  // Get logs in a date range
  async getInRange(startDate: Date, endDate: Date): Promise<DailyLog[]> {
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    return db
      .select()
      .from(dailyLogs)
      .where(and(gte(dailyLogs.date, startStr), lte(dailyLogs.date, endStr)))
      .orderBy(desc(dailyLogs.date));
  },

  // Get last active date (most recent log)
  async getLastActiveDate(): Promise<string | null> {
    const results = await db
      .select({ date: dailyLogs.date })
      .from(dailyLogs)
      .orderBy(desc(dailyLogs.date))
      .limit(1);
    return results[0]?.date || null;
  },

  // ============ CRUD OPERATIONS ============

  // Create or update a daily log
  async upsert(data: NewDailyLog): Promise<DailyLog> {
    // Check using the date string directly to avoid timezone issues with new Date()
    const results = await db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.date, data.date))
      .limit(1);

    const existing = results[0];

    if (existing) {
      const results = await db
        .update(dailyLogs)
        .set(data)
        .where(eq(dailyLogs.date, data.date))
        .returning();
      return results[0];
    } else {
      const results = await db.insert(dailyLogs).values(data).returning();
      return results[0];
    }
  },

  // Update morning intention
  async updateMorningIntention(
    date: Date,
    intention: string,
    commitment?: string
  ): Promise<DailyLog> {
    const dateStr = formatDate(date);
    return this.upsert({
      date: dateStr,
      morningIntention: intention,
      proofCommitment: commitment,
    });
  },

  // Update evening reflection
  async updateEveningReflection(
    date: Date,
    reflection: string,
    feelingRating?: number
  ): Promise<DailyLog> {
    const dateStr = formatDate(date);
    const existing = await this.getForDate(date);

    return this.upsert({
      date: dateStr,
      morningIntention: existing?.morningIntention,
      proofCommitment: existing?.proofCommitment,
      eveningReflection: reflection,
      feelingRating,
    });
  },

  // Delete a log
  async delete(date: Date): Promise<void> {
    const dateStr = formatDate(date);
    await db.delete(dailyLogs).where(eq(dailyLogs.date, dateStr));
  },
};

export default dailyLogQueries;
