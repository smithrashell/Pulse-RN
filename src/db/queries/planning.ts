import { eq, and, desc } from 'drizzle-orm';
import { db } from '../client';
import {
  monthlyOutcomes,
  weeklyIntentions,
  MonthlyOutcome,
  NewMonthlyOutcome,
  WeeklyIntention,
  NewWeeklyIntention,
  OutcomeStatus,
} from '../schema';
import { format, getISOWeek, getYear } from 'date-fns';

// Helper to format month as YYYY-MM
const formatMonth = (date: Date): string => format(date, 'yyyy-MM');

// Helper to format week as YYYY-Www
const formatWeek = (date: Date): string => {
  const year = getYear(date);
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

export const monthlyOutcomeQueries = {
  // Get outcomes for a specific month
  async getForMonth(date: Date): Promise<MonthlyOutcome[]> {
    const monthStr = formatMonth(date);
    return db
      .select()
      .from(monthlyOutcomes)
      .where(eq(monthlyOutcomes.month, monthStr))
      .orderBy(monthlyOutcomes.createdAt);
  },

  // Get outcome by ID
  async getById(id: number): Promise<MonthlyOutcome | undefined> {
    const results = await db
      .select()
      .from(monthlyOutcomes)
      .where(eq(monthlyOutcomes.id, id))
      .limit(1);
    return results[0];
  },

  // Get all outcomes
  async getAll(): Promise<MonthlyOutcome[]> {
    return db.select().from(monthlyOutcomes).orderBy(desc(monthlyOutcomes.month));
  },

  // Get outcomes for a focus area
  async getByFocusAreaId(focusAreaId: number): Promise<MonthlyOutcome[]> {
    return db
      .select()
      .from(monthlyOutcomes)
      .where(eq(monthlyOutcomes.focusAreaId, focusAreaId))
      .orderBy(desc(monthlyOutcomes.month));
  },

  // Get non-completed outcomes (for linking to intentions)
  async getNonCompleted(): Promise<MonthlyOutcome[]> {
    return db
      .select()
      .from(monthlyOutcomes)
      .where(and(eq(monthlyOutcomes.status, 'NOT_STARTED')))
      .orderBy(desc(monthlyOutcomes.month));
  },

  // Get completed count for month
  async getCompletedCountForMonth(date: Date): Promise<number> {
    const monthStr = formatMonth(date);
    const results = await db
      .select()
      .from(monthlyOutcomes)
      .where(and(eq(monthlyOutcomes.month, monthStr), eq(monthlyOutcomes.status, 'COMPLETED')));
    return results.length;
  },

  // Get outcomes linked to a quarterly goal
  async getByQuarterlyGoalId(quarterlyGoalId: number): Promise<MonthlyOutcome[]> {
    return db
      .select()
      .from(monthlyOutcomes)
      .where(eq(monthlyOutcomes.quarterlyGoalId, quarterlyGoalId))
      .orderBy(desc(monthlyOutcomes.month));
  },

  // ============ CRUD OPERATIONS ============

  async create(data: Omit<NewMonthlyOutcome, 'createdAt' | 'updatedAt'>): Promise<MonthlyOutcome> {
    const now = new Date();
    const results = await db
      .insert(monthlyOutcomes)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return results[0];
  },

  async update(id: number, data: Partial<NewMonthlyOutcome>): Promise<MonthlyOutcome> {
    const results = await db
      .update(monthlyOutcomes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(monthlyOutcomes.id, id))
      .returning();
    return results[0];
  },

  async updateStatus(id: number, status: OutcomeStatus): Promise<MonthlyOutcome> {
    return this.update(id, { status });
  },

  async delete(id: number): Promise<void> {
    await db.delete(monthlyOutcomes).where(eq(monthlyOutcomes.id, id));
  },
};

export const weeklyIntentionQueries = {
  // Get intentions for a specific week
  async getForWeek(date: Date): Promise<WeeklyIntention[]> {
    const weekStr = formatWeek(date);
    return db
      .select()
      .from(weeklyIntentions)
      .where(eq(weeklyIntentions.week, weekStr))
      .orderBy(weeklyIntentions.createdAt);
  },

  // Get intention by ID
  async getById(id: number): Promise<WeeklyIntention | undefined> {
    const results = await db
      .select()
      .from(weeklyIntentions)
      .where(eq(weeklyIntentions.id, id))
      .limit(1);
    return results[0];
  },

  // Get all intentions
  async getAll(): Promise<WeeklyIntention[]> {
    return db.select().from(weeklyIntentions).orderBy(desc(weeklyIntentions.week));
  },

  // Get intentions for a monthly outcome
  async getByMonthlyOutcomeId(monthlyOutcomeId: number): Promise<WeeklyIntention[]> {
    return db
      .select()
      .from(weeklyIntentions)
      .where(eq(weeklyIntentions.monthlyOutcomeId, monthlyOutcomeId))
      .orderBy(desc(weeklyIntentions.week));
  },

  // Get completed count for week
  async getCompletedCountForWeek(date: Date): Promise<number> {
    const weekStr = formatWeek(date);
    const results = await db
      .select()
      .from(weeklyIntentions)
      .where(and(eq(weeklyIntentions.week, weekStr), eq(weeklyIntentions.isCompleted, true)));
    return results.length;
  },

  // Get incomplete intentions from last week (for carry-forward)
  async getIncompleteFromLastWeek(currentDate: Date): Promise<WeeklyIntention[]> {
    const lastWeek = new Date(currentDate);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weekStr = formatWeek(lastWeek);

    return db
      .select()
      .from(weeklyIntentions)
      .where(and(eq(weeklyIntentions.week, weekStr), eq(weeklyIntentions.isCompleted, false)));
  },

  // ============ CRUD OPERATIONS ============

  async create(
    data: Omit<NewWeeklyIntention, 'createdAt' | 'updatedAt'>
  ): Promise<WeeklyIntention> {
    const now = new Date();
    const results = await db
      .insert(weeklyIntentions)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return results[0];
  },

  async update(id: number, data: Partial<NewWeeklyIntention>): Promise<WeeklyIntention> {
    const results = await db
      .update(weeklyIntentions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(weeklyIntentions.id, id))
      .returning();
    return results[0];
  },

  async toggleCompletion(id: number): Promise<WeeklyIntention> {
    const intention = await this.getById(id);
    if (!intention) throw new Error('Intention not found');

    return this.update(id, { isCompleted: !intention.isCompleted });
  },

  async delete(id: number): Promise<void> {
    await db.delete(weeklyIntentions).where(eq(weeklyIntentions.id, id));
  },
};

// Export utility functions
export const planningUtils = {
  formatMonth,
  formatWeek,
  getCurrentMonth: () => formatMonth(new Date()),
  getCurrentWeek: () => formatWeek(new Date()),
};

export default {
  monthlyOutcomes: monthlyOutcomeQueries,
  weeklyIntentions: weeklyIntentionQueries,
  utils: planningUtils,
};
