import { db } from '../client';
import { lifeGoals, lifeGoalCheckIns } from '../schema';
import type { NewLifeGoal, LifeGoal, NewLifeGoalCheckIn, LifeGoalCheckIn, LifeGoalStatus, TimeWindow } from '../schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export const lifeGoalQueries = {
    // Get all life goals
    async getAll(): Promise<LifeGoal[]> {
        return db.select().from(lifeGoals).orderBy(asc(lifeGoals.sortOrder));
    },

    // Get life goals by status
    async getByStatus(status: LifeGoalStatus): Promise<LifeGoal[]> {
        return db
            .select()
            .from(lifeGoals)
            .where(eq(lifeGoals.status, status))
            .orderBy(asc(lifeGoals.sortOrder));
    },

    // Get life goals by time window
    async getByTimeWindow(timeWindow: TimeWindow): Promise<LifeGoal[]> {
        return db
            .select()
            .from(lifeGoals)
            .where(eq(lifeGoals.timeWindow, timeWindow))
            .orderBy(asc(lifeGoals.sortOrder));
    },

    // Get life goals by category
    async getByCategory(category: string): Promise<LifeGoal[]> {
        return db
            .select()
            .from(lifeGoals)
            .where(eq(lifeGoals.category, category))
            .orderBy(asc(lifeGoals.sortOrder));
    },

    // Get life goals by category AND time window
    async getByCategoryAndTimeWindow(category: string, timeWindow: TimeWindow): Promise<LifeGoal[]> {
        return db
            .select()
            .from(lifeGoals)
            .where(and(eq(lifeGoals.category, category), eq(lifeGoals.timeWindow, timeWindow)))
            .orderBy(asc(lifeGoals.sortOrder));
    },

    // Get stretch goals only
    async getStretchGoals(): Promise<LifeGoal[]> {
        return db
            .select()
            .from(lifeGoals)
            .where(eq(lifeGoals.isStretchGoal, true))
            .orderBy(asc(lifeGoals.sortOrder));
    },

    // Get single life goal by ID
    async getById(id: number): Promise<LifeGoal | null> {
        const results = await db.select().from(lifeGoals).where(eq(lifeGoals.id, id)).limit(1);
        return results[0] || null;
    },

    // Create a new life goal
    async create(goal: NewLifeGoal): Promise<LifeGoal> {
        const now = Date.now();
        const result = await db
            .insert(lifeGoals)
            .values({
                ...goal,
                createdAt: now,
                updatedAt: now,
            })
            .returning();
        return result[0];
    },

    // Create multiple life goals (for import)
    async createMany(goals: Omit<NewLifeGoal, 'createdAt' | 'updatedAt'>[]): Promise<number> {
        if (goals.length === 0) return 0;

        const now = new Date();
        const goalsWithTimestamps = goals.map(goal => ({
            ...goal,
            createdAt: now,
            updatedAt: now,
        }));

        await db.insert(lifeGoals).values(goalsWithTimestamps);
        return goals.length;
    },

    // Update a life goal
    async update(id: number, updates: Partial<NewLifeGoal>): Promise<LifeGoal> {
        const result = await db
            .update(lifeGoals)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(lifeGoals.id, id))
            .returning();
        return result[0];
    },

    // Update goal status (with optional reflection)
    async updateStatus(
        id: number,
        status: LifeGoalStatus,
        reflection?: string
    ): Promise<LifeGoal> {
        const updates: Partial<NewLifeGoal> = { status };

        if (status === 'ACHIEVED') {
            // @ts-ignore - achievedAt exists on schema
            updates.achievedAt = new Date();
            if (reflection) {
                // @ts-ignore - achievementReflection exists on schema
                updates.achievementReflection = reflection;
            }
        }

        return this.update(id, updates);
    },

    // Delete a life goal
    async delete(id: number): Promise<void> {
        await db.delete(lifeGoals).where(eq(lifeGoals.id, id));
    },

    // Get count of goals
    async getCount(): Promise<number> {
        const result = await db.select().from(lifeGoals);
        return result.length;
    },

    // Get count by status
    async getCountByStatus(status: LifeGoalStatus): Promise<number> {
        const result = await db.select().from(lifeGoals).where(eq(lifeGoals.status, status));
        return result.length;
    },

    // Delete all life goals
    async deleteAll(): Promise<number> {
        const count = await this.getCount();
        await db.delete(lifeGoals);
        return count;
    },

    // Get all unique categories
    async getCategories(): Promise<string[]> {
        const results = await db.select({ category: lifeGoals.category }).from(lifeGoals);
        const categories = results.map(r => r.category);
        return Array.from(new Set(categories)).sort();
    },
};

export const lifeGoalCheckInQueries = {
    // Get all check-ins
    async getAll(): Promise<LifeGoalCheckIn[]> {
        return db.select().from(lifeGoalCheckIns).orderBy(desc(lifeGoalCheckIns.month));
    },

    // Get check-in for a specific month
    async getForMonth(month: string): Promise<LifeGoalCheckIn | null> {
        const results = await db
            .select()
            .from(lifeGoalCheckIns)
            .where(eq(lifeGoalCheckIns.month, month))
            .limit(1);
        return results[0] || null;
    },

    // Get most recent check-in
    async getMostRecent(): Promise<LifeGoalCheckIn | null> {
        const results = await db
            .select()
            .from(lifeGoalCheckIns)
            .orderBy(desc(lifeGoalCheckIns.month))
            .limit(1);
        return results[0] || null;
    },

    // Create a new check-in
    async create(checkIn: NewLifeGoalCheckIn): Promise<LifeGoalCheckIn> {
        const now = Date.now();
        const result = await db
            .insert(lifeGoalCheckIns)
            .values({
                ...checkIn,
                completedAt: now,
                createdAt: now,
            })
            .returning();
        return result[0];
    },

    // Update a check-in
    async update(id: number, updates: Partial<NewLifeGoalCheckIn>): Promise<LifeGoalCheckIn> {
        const result = await db
            .update(lifeGoalCheckIns)
            .set(updates)
            .where(eq(lifeGoalCheckIns.id, id))
            .returning();
        return result[0];
    },

    // Delete a check-in
    async delete(id: number): Promise<void> {
        await db.delete(lifeGoalCheckIns).where(eq(lifeGoalCheckIns.id, id));
    },
};
