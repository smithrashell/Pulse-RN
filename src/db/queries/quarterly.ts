import { eq, and, desc, max } from 'drizzle-orm';
import { db } from '../client';
import {
  quarterlyGoals,
  quarterlyReviews,
  QuarterlyGoal,
  NewQuarterlyGoal,
  QuarterlyReview,
  NewQuarterlyReview,
  QuarterlyGoalStatus,
} from '../schema';
import { formatQuarter } from '../../utils/quarter';

const MAX_GOALS_PER_QUARTER = 6;

export const quarterlyGoalQueries = {
  // Get goals for a specific quarter
  async getForQuarter(quarterStr: string): Promise<QuarterlyGoal[]> {
    return db
      .select()
      .from(quarterlyGoals)
      .where(eq(quarterlyGoals.quarter, quarterStr))
      .orderBy(quarterlyGoals.position);
  },

  // Get goals for current quarter
  async getForCurrentQuarter(): Promise<QuarterlyGoal[]> {
    return this.getForQuarter(formatQuarter(new Date()));
  },

  // Get goal by ID
  async getById(id: number): Promise<QuarterlyGoal | undefined> {
    const results = await db
      .select()
      .from(quarterlyGoals)
      .where(eq(quarterlyGoals.id, id))
      .limit(1);
    return results[0];
  },

  // Get all goals
  async getAll(): Promise<QuarterlyGoal[]> {
    return db.select().from(quarterlyGoals).orderBy(desc(quarterlyGoals.quarter));
  },

  // Get completed count for quarter
  async getCompletedCountForQuarter(quarterStr: string): Promise<number> {
    const results = await db
      .select()
      .from(quarterlyGoals)
      .where(and(eq(quarterlyGoals.quarter, quarterStr), eq(quarterlyGoals.status, 'COMPLETED')));
    return results.length;
  },

  // Get next available position for a quarter (1-6)
  async getNextPosition(quarterStr: string): Promise<number | null> {
    const goals = await this.getForQuarter(quarterStr);
    if (goals.length >= MAX_GOALS_PER_QUARTER) {
      return null; // No more positions available
    }
    // Find the next available position
    const usedPositions = new Set(goals.map((g) => g.position));
    for (let i = 1; i <= MAX_GOALS_PER_QUARTER; i++) {
      if (!usedPositions.has(i)) {
        return i;
      }
    }
    return null;
  },

  // Check if quarter has reached goal limit
  async isQuarterFull(quarterStr: string): Promise<boolean> {
    const goals = await this.getForQuarter(quarterStr);
    return goals.length >= MAX_GOALS_PER_QUARTER;
  },

  // Check if a life goal already has a quarterly goal for a specific quarter
  async getByLifeGoalAndQuarter(lifeGoalId: number, quarterStr: string): Promise<QuarterlyGoal | undefined> {
    const results = await db
      .select()
      .from(quarterlyGoals)
      .where(and(eq(quarterlyGoals.lifeGoalId, lifeGoalId), eq(quarterlyGoals.quarter, quarterStr)))
      .limit(1);
    return results[0];
  },

  // Create a quarterly goal from a life goal
  async createFromLifeGoal(
    lifeGoalId: number,
    title: string,
    description: string | undefined,
    quarterStr?: string
  ): Promise<QuarterlyGoal | null> {
    const quarter = quarterStr || formatQuarter(new Date());

    // Check if already exists
    const existing = await this.getByLifeGoalAndQuarter(lifeGoalId, quarter);
    if (existing) {
      return existing; // Already linked
    }

    // Check if quarter is full
    const position = await this.getNextPosition(quarter);
    if (position === null) {
      return null; // Quarter is full
    }

    const now = new Date();
    const results = await db
      .insert(quarterlyGoals)
      .values({
        quarter,
        title,
        description,
        position,
        lifeGoalId,
        status: 'IN_PROGRESS',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return results[0];
  },

  // ============ CRUD OPERATIONS ============

  async create(
    data: Omit<NewQuarterlyGoal, 'createdAt' | 'updatedAt' | 'position'>
  ): Promise<QuarterlyGoal> {
    const position = await this.getNextPosition(data.quarter);
    if (position === null) {
      throw new Error('Quarter has reached maximum number of goals (6)');
    }

    const now = new Date();
    const results = await db
      .insert(quarterlyGoals)
      .values({
        ...data,
        position,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return results[0];
  },

  async update(id: number, data: Partial<NewQuarterlyGoal>): Promise<QuarterlyGoal> {
    const results = await db
      .update(quarterlyGoals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(quarterlyGoals.id, id))
      .returning();
    return results[0];
  },

  async updateStatus(id: number, status: QuarterlyGoalStatus): Promise<QuarterlyGoal> {
    return this.update(id, { status });
  },

  async delete(id: number): Promise<void> {
    await db.delete(quarterlyGoals).where(eq(quarterlyGoals.id, id));
  },
};

export const quarterlyReviewQueries = {
  // Get review for a specific quarter
  async getForQuarter(quarterStr: string): Promise<QuarterlyReview | undefined> {
    return db.query.quarterlyReviews.findFirst({
      where: eq(quarterlyReviews.quarter, quarterStr),
    });
  },

  // Get recent reviews
  async getRecent(limit: number = 10): Promise<QuarterlyReview[]> {
    return db
      .select()
      .from(quarterlyReviews)
      .orderBy(desc(quarterlyReviews.quarter))
      .limit(limit);
  },

  // ============ CRUD OPERATIONS ============

  async create(data: Omit<NewQuarterlyReview, 'createdAt' | 'updatedAt'>): Promise<QuarterlyReview> {
    const now = new Date();
    const results = await db
      .insert(quarterlyReviews)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return results[0];
  },

  async update(id: number, data: Partial<NewQuarterlyReview>): Promise<QuarterlyReview> {
    const results = await db
      .update(quarterlyReviews)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(quarterlyReviews.id, id))
      .returning();
    return results[0];
  },
};

export default {
  quarterlyGoals: quarterlyGoalQueries,
  quarterlyReviews: quarterlyReviewQueries,
};
