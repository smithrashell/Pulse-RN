import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import {
  weeklyReviews,
  monthlyReviews,
  NewWeeklyReview,
  NewMonthlyReview,
  WeeklyReview,
  MonthlyReview,
} from '../schema';

export const weeklyReviewQueries = {
  getForWeek: async (week: string): Promise<WeeklyReview | undefined> => {
    return await db.query.weeklyReviews.findFirst({
      where: eq(weeklyReviews.week, week),
    });
  },

  getRecent: async (limit: number = 10): Promise<WeeklyReview[]> => {
    return await db.select().from(weeklyReviews).orderBy(desc(weeklyReviews.week)).limit(limit);
  },

  create: async (data: NewWeeklyReview) => {
    return await db.insert(weeklyReviews).values(data).returning();
  },

  update: async (id: number, data: Partial<NewWeeklyReview>) => {
    return await db
      .update(weeklyReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(weeklyReviews.id, id))
      .returning();
  },
};

export const monthlyReviewQueries = {
  getForMonth: async (month: string): Promise<MonthlyReview | undefined> => {
    return await db.query.monthlyReviews.findFirst({
      where: eq(monthlyReviews.month, month),
    });
  },

  getRecent: async (limit: number = 10): Promise<MonthlyReview[]> => {
    return await db.select().from(monthlyReviews).orderBy(desc(monthlyReviews.month)).limit(limit);
  },

  create: async (data: NewMonthlyReview) => {
    return await db.insert(monthlyReviews).values(data).returning();
  },

  update: async (id: number, data: Partial<NewMonthlyReview>) => {
    return await db
      .update(monthlyReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(monthlyReviews.id, id))
      .returning();
  },
};
