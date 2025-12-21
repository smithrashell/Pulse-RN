import { eq, and, isNull, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '../client';
import { sessions, Session, NewSession } from '../schema';
import { startOfDay, endOfDay } from 'date-fns';

export const sessionQueries = {
  // Get all sessions
  async getAll(): Promise<Session[]> {
    return db.select().from(sessions).orderBy(desc(sessions.startTime));
  },

  // Get session by ID
  async getById(id: number): Promise<Session | undefined> {
    const results = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return results[0];
  },

  // Get active session (endTime is null)
  async getActive(): Promise<Session | undefined> {
    const results = await db.select().from(sessions).where(isNull(sessions.endTime)).limit(1);
    return results[0];
  },

  // Get sessions for a focus area
  async getByFocusAreaId(focusAreaId: number): Promise<Session[]> {
    return db
      .select()
      .from(sessions)
      .where(eq(sessions.focusAreaId, focusAreaId))
      .orderBy(desc(sessions.startTime));
  },

  // Get sessions for a specific day
  async getForDay(date: Date): Promise<Session[]> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return db
      .select()
      .from(sessions)
      .where(and(gte(sessions.startTime, dayStart), lte(sessions.startTime, dayEnd)))
      .orderBy(desc(sessions.startTime));
  },

  // Get completed sessions for a day (for aggregation)
  async getCompletedForDay(date: Date): Promise<Session[]> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return db
      .select()
      .from(sessions)
      .where(
        and(
          gte(sessions.startTime, dayStart),
          lte(sessions.startTime, dayEnd),
          sql`${sessions.endTime} IS NOT NULL`
        )
      )
      .orderBy(desc(sessions.startTime));
  },

  // Get sessions for a focus area in a time range
  async getByFocusAreaInRange(
    focusAreaId: number,
    startTime: Date,
    endTime: Date
  ): Promise<Session[]> {
    return db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.focusAreaId, focusAreaId),
          gte(sessions.startTime, startTime),
          lte(sessions.startTime, endTime)
        )
      )
      .orderBy(desc(sessions.startTime));
  },

  // Get total minutes for a focus area in a time range
  async getTotalMinutesForFocusAreaInRange(
    focusAreaId: number,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${sessions.durationMinutes}), 0)`,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.focusAreaId, focusAreaId),
          gte(sessions.startTime, startTime),
          lte(sessions.startTime, endTime),
          sql`${sessions.endTime} IS NOT NULL`
        )
      );
    return result[0]?.total || 0;
  },

  // Get total minutes for a day
  async getTotalMinutesForDay(date: Date): Promise<number> {
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

  // Get unassigned sessions (quick timer sessions)
  async getUnassigned(): Promise<Session[]> {
    return db
      .select()
      .from(sessions)
      .where(isNull(sessions.focusAreaId))
      .orderBy(desc(sessions.startTime));
  },

  // Get unassigned session count
  async getUnassignedCount(): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(and(isNull(sessions.focusAreaId), sql`${sessions.endTime} IS NOT NULL`));
    return result[0]?.count || 0;
  },

  // ============ CRUD OPERATIONS ============

  // Start a new session
  async start(focusAreaId?: number): Promise<Session> {
    const results = await db
      .insert(sessions)
      .values({
        focusAreaId: focusAreaId || null,
        startTime: new Date(),
      })
      .returning();
    return results[0];
  },

  // Start a quick session (no focus area)
  async startQuick(): Promise<Session> {
    return this.start(undefined);
  },

  // Stop a session
  async stop(sessionId: number, note?: string, qualityRating?: number): Promise<Session> {
    const session = await this.getById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.endTime) throw new Error('Session already stopped');

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - session.startTime.getTime()) / 60000);

    const results = await db
      .update(sessions)
      .set({
        endTime,
        durationMinutes,
        note,
        qualityRating,
      })
      .where(eq(sessions.id, sessionId))
      .returning();
    return results[0];
  },

  // Assign a session to a focus area
  async assignToFocusArea(sessionId: number, focusAreaId: number): Promise<Session> {
    const results = await db
      .update(sessions)
      .set({ focusAreaId })
      .where(eq(sessions.id, sessionId))
      .returning();
    return results[0];
  },

  // Update a session
  async update(id: number, data: Partial<NewSession>): Promise<Session> {
    const results = await db.update(sessions).set(data).where(eq(sessions.id, id)).returning();
    return results[0];
  },

  // Delete a session
  async delete(id: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  },

  // Delete all sessions for a focus area
  async deleteByFocusAreaId(focusAreaId: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.focusAreaId, focusAreaId));
  },

  // ============ AGGREGATION QUERIES ============

  // Get sessions aggregated by focus area for a day
  async getAggregatedForDay(date: Date): Promise<
    {
      focusAreaId: number | null;
      totalMinutes: number;
      sessionCount: number;
    }[]
  > {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return db
      .select({
        focusAreaId: sessions.focusAreaId,
        totalMinutes: sql<number>`COALESCE(SUM(${sessions.durationMinutes}), 0)`,
        sessionCount: sql<number>`COUNT(*)`,
      })
      .from(sessions)
      .where(
        and(
          gte(sessions.startTime, dayStart),
          lte(sessions.startTime, dayEnd),
          sql`${sessions.endTime} IS NOT NULL`
        )
      )
      .groupBy(sessions.focusAreaId);
  },

  // Get unique days with sessions (for streak calculation)
  async getUniqueDaysWithSessions(): Promise<string[]> {
    const result = await db
      .select({
        date: sql<string>`DATE(${sessions.startTime} / 1000, 'unixepoch')`,
      })
      .from(sessions)
      .where(sql`${sessions.endTime} IS NOT NULL`)
      .groupBy(sql`DATE(${sessions.startTime} / 1000, 'unixepoch')`)
      .orderBy(desc(sql`DATE(${sessions.startTime} / 1000, 'unixepoch')`));

    return result.map((r) => r.date);
  },

  // Get last active date
  async getLastActiveDate(): Promise<Date | null> {
    const result = await db
      .select({
        lastDate: sql<number>`MAX(${sessions.startTime})`,
      })
      .from(sessions)
      .where(sql`${sessions.endTime} IS NOT NULL`);

    if (result[0]?.lastDate) {
      return new Date(result[0].lastDate);
    }
    return null;
  },
};

export default sessionQueries;
