import { lifeGoalQueries, lifeGoalCheckInQueries } from '../db/queries';
import type { LifeGoal, LifeGoalStatus, TimeWindow } from '../db/schema';
import { getCurrentMonth, isFirstMondayOfMonth } from '../utils/lifeGoals';

// Statistics interface
export interface LifeGoalStats {
    total: number;
    achieved: number;
    inMotion: number;
    active: number;
    deferred: number;
    released: number;
    achievedThisYear: number;
    completionPercentage: number;
}

// Service functions
export const lifeGoalService = {
    /**
     * Get comprehensive statistics about life goals
     */
    async getStats(): Promise<LifeGoalStats> {
        const allGoals = await lifeGoalQueries.getAll();
        const currentYear = new Date().getFullYear();

        const achieved = allGoals.filter(g => g.status === 'ACHIEVED');
        const achievedThisYear = achieved.filter(g => {
            if (!g.achievedAt) return false;
            const achievedDate = new Date(g.achievedAt);
            return achievedDate.getFullYear() === currentYear;
        });

        return {
            total: allGoals.length,
            achieved: achieved.length,
            inMotion: allGoals.filter(g => g.status === 'IN_MOTION').length,
            active: allGoals.filter(g => g.status === 'ACTIVE').length,
            deferred: allGoals.filter(g => g.status === 'DEFERRED').length,
            released: allGoals.filter(g => g.status === 'RELEASED').length,
            achievedThisYear: achievedThisYear.length,
            completionPercentage: allGoals.length > 0 ? Math.round((achieved.length / allGoals.length) * 100) : 0,
        };
    },

    /**
     * Get goals organized by time window
     */
    async getGoalsByTimeWindows(): Promise<Record<TimeWindow, LifeGoal[]>> {
        const allGoals = await lifeGoalQueries.getAll();

        return {
            SHORT_TERM: allGoals.filter(g => g.timeWindow === 'SHORT_TERM'),
            MID_TERM: allGoals.filter(g => g.timeWindow === 'MID_TERM'),
            MID_LATE_TERM: allGoals.filter(g => g.timeWindow === 'MID_LATE_TERM'),
            LONG_TERM: allGoals.filter(g => g.timeWindow === 'LONG_TERM'),
        };
    },

    /**
     * Get goals organized by category
     */
    async getGoalsByCategories(): Promise<Record<string, LifeGoal[]>> {
        const allGoals = await lifeGoalQueries.getAll();
        const categories = await lifeGoalQueries.getCategories();

        const result: Record<string, LifeGoal[]> = {};
        for (const category of categories) {
            result[category] = allGoals.filter(g => g.category === category);
        }

        return result;
    },

    /**
     * Check if monthly check-in is due (first Monday of month)
     */
    async isCheckInDue(): Promise<boolean> {
        // Check if today is the first Monday
        if (!isFirstMondayOfMonth(new Date())) {
            return false;
        }

        // Check if we already completed this month's check-in
        const currentMonth = getCurrentMonth();
        const existingCheckIn = await lifeGoalCheckInQueries.getForMonth(currentMonth);

        return !existingCheckIn;
    },

    /**
     * Get the last check-in
     */
    async getLastCheckIn() {
        return lifeGoalCheckInQueries.getMostRecent();
    },

    /**
     * Mark a goal as achieved
     */
    async markAsAchieved(goalId: number, reflection?: string): Promise<LifeGoal> {
        return lifeGoalQueries.updateStatus(goalId, 'ACHIEVED', reflection);
    },

    /**
     * Mark a goal as in motion
     */
    async markAsInMotion(goalId: number): Promise<LifeGoal> {
        return lifeGoalQueries.updateStatus(goalId, 'IN_MOTION');
    },

    /**
     * Mark a goal as deferred
     */
    async markAsDeferred(goalId: number): Promise<LifeGoal> {
        return lifeGoalQueries.updateStatus(goalId, 'DEFERRED');
    },

    /**
     * Mark a goal as released (gave up)
     */
    async markAsReleased(goalId: number): Promise<LifeGoal> {
        return lifeGoalQueries.updateStatus(goalId, 'RELEASED');
    },

    /**
     * Reactivate a goal (deferred or released → active)
     */
    async reactivate(goalId: number): Promise<LifeGoal> {
        return lifeGoalQueries.updateStatus(goalId, 'ACTIVE');
    },

    /**
     * Complete a monthly check-in with goal updates
     */
    async completeMonthlyCheckIn(
        achievedGoalIds: number[],
        inMotionGoalIds: number[],
        newConnectionsNote?: string,
        generalReflection?: string
    ): Promise<void> {
        // Update achieved goals
        for (const goalId of achievedGoalIds) {
            await this.markAsAchieved(goalId);
        }

        // Update in-motion goals
        for (const goalId of inMotionGoalIds) {
            await this.markAsInMotion(goalId);
        }

        // Create check-in record
        const currentMonth = getCurrentMonth();
        await lifeGoalCheckInQueries.create({
            month: currentMonth,
            goalsAchievedCount: achievedGoalIds.length,
            goalsInMotionCount: inMotionGoalIds.length,
            newConnectionsNote,
            generalReflection,
        });
    },

    /**
     * Get goals that should appear in check-in (ACTIVE and IN_MOTION)
     */
    async getGoalsForCheckIn(): Promise<LifeGoal[]> {
        const active = await lifeGoalQueries.getByStatus('ACTIVE');
        const inMotion = await lifeGoalQueries.getByStatus('IN_MOTION');
        return [...active, ...inMotion].sort((a, b) => a.sortOrder - b.sortOrder);
    },

    /**
     * Filter goals by multiple criteria
     */
    async filterGoals(
        category?: string,
        timeWindow?: TimeWindow,
        status?: LifeGoalStatus
    ): Promise<LifeGoal[]> {
        let goals: LifeGoal[];

        // Start with broadest filter
        if (category && timeWindow) {
            goals = await lifeGoalQueries.getByCategoryAndTimeWindow(category, timeWindow);
        } else if (category) {
            goals = await lifeGoalQueries.getByCategory(category);
        } else if (timeWindow) {
            goals = await lifeGoalQueries.getByTimeWindow(timeWindow);
        } else {
            goals = await lifeGoalQueries.getAll();
        }

        // Apply status filter if provided
        if (status) {
            goals = goals.filter(g => g.status === status);
        }

        return goals;
    },
};
