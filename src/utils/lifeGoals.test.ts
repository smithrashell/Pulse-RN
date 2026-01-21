import {
    LIFE_GOAL_CATEGORIES,
    TIME_WINDOWS,
    getTimeWindowLabel,
    getTimeWindowDescription,
    getTimeWindowOrder,
    isFirstMondayOfMonth,
    getMonthString,
    getCurrentMonth,
} from './lifeGoals';

describe('lifeGoals utilities', () => {
    describe('LIFE_GOAL_CATEGORIES', () => {
        it('should have 15 categories', () => {
            expect(LIFE_GOAL_CATEGORIES).toHaveLength(15);
        });

        it('should include key life areas', () => {
            expect(LIFE_GOAL_CATEGORIES).toContain('Career');
            expect(LIFE_GOAL_CATEGORIES).toContain('Health & Fitness');
            expect(LIFE_GOAL_CATEGORIES).toContain('Financial');
            expect(LIFE_GOAL_CATEGORIES).toContain('Relationships');
            expect(LIFE_GOAL_CATEGORIES).toContain('Family');
            expect(LIFE_GOAL_CATEGORIES).toContain('Creative');
            expect(LIFE_GOAL_CATEGORIES).toContain('Impact & Legacy');
        });

        it('should include Other as last category', () => {
            expect(LIFE_GOAL_CATEGORIES[LIFE_GOAL_CATEGORIES.length - 1]).toBe('Other');
        });
    });

    describe('TIME_WINDOWS', () => {
        it('should have 4 time windows', () => {
            expect(TIME_WINDOWS).toHaveLength(4);
        });

        it('should be ordered by time horizon', () => {
            const orders = TIME_WINDOWS.map(tw => tw.order);
            expect(orders).toEqual([1, 2, 3, 4]);
        });

        it('should have correct time window values', () => {
            const values = TIME_WINDOWS.map(tw => tw.value);
            expect(values).toEqual(['SHORT_TERM', 'MID_TERM', 'MID_LATE_TERM', 'LONG_TERM']);
        });

        it('should have correct labels', () => {
            expect(TIME_WINDOWS[0].label).toBe('1-2 years');
            expect(TIME_WINDOWS[1].label).toBe('3-5 years');
            expect(TIME_WINDOWS[2].label).toBe('6-9 years');
            expect(TIME_WINDOWS[3].label).toBe('10-20 years');
        });
    });

    describe('getTimeWindowLabel', () => {
        it('should return SHORT_TERM label', () => {
            expect(getTimeWindowLabel('SHORT_TERM')).toBe('1-2 years');
        });

        it('should return MID_TERM label', () => {
            expect(getTimeWindowLabel('MID_TERM')).toBe('3-5 years');
        });

        it('should return MID_LATE_TERM label', () => {
            expect(getTimeWindowLabel('MID_LATE_TERM')).toBe('6-9 years');
        });

        it('should return LONG_TERM label', () => {
            expect(getTimeWindowLabel('LONG_TERM')).toBe('10-20 years');
        });

        it('should return the value itself for unknown time window', () => {
            expect(getTimeWindowLabel('UNKNOWN' as any)).toBe('UNKNOWN');
        });
    });

    describe('getTimeWindowDescription', () => {
        it('should return SHORT_TERM description', () => {
            expect(getTimeWindowDescription('SHORT_TERM')).toBe('Near future');
        });

        it('should return MID_TERM description', () => {
            expect(getTimeWindowDescription('MID_TERM')).toBe('Medium term');
        });

        it('should return MID_LATE_TERM description', () => {
            expect(getTimeWindowDescription('MID_LATE_TERM')).toBe('Mid-late term');
        });

        it('should return LONG_TERM description', () => {
            expect(getTimeWindowDescription('LONG_TERM')).toBe('Long term vision');
        });

        it('should return empty string for unknown time window', () => {
            expect(getTimeWindowDescription('UNKNOWN' as any)).toBe('');
        });
    });

    describe('getTimeWindowOrder', () => {
        it('should return correct order for SHORT_TERM', () => {
            expect(getTimeWindowOrder('SHORT_TERM')).toBe(1);
        });

        it('should return correct order for MID_TERM', () => {
            expect(getTimeWindowOrder('MID_TERM')).toBe(2);
        });

        it('should return correct order for MID_LATE_TERM', () => {
            expect(getTimeWindowOrder('MID_LATE_TERM')).toBe(3);
        });

        it('should return correct order for LONG_TERM', () => {
            expect(getTimeWindowOrder('LONG_TERM')).toBe(4);
        });

        it('should return 999 for unknown time window', () => {
            expect(getTimeWindowOrder('UNKNOWN' as any)).toBe(999);
        });
    });

    describe('isFirstMondayOfMonth', () => {
        it('should return true for first Monday of January 2026', () => {
            // January 5, 2026 is the first Monday
            const date = new Date(2026, 0, 5);
            expect(isFirstMondayOfMonth(date)).toBe(true);
        });

        it('should return false for second Monday of the month', () => {
            // January 12, 2026 is the second Monday
            const date = new Date(2026, 0, 12);
            expect(isFirstMondayOfMonth(date)).toBe(false);
        });

        it('should return false for non-Monday dates in the first week', () => {
            // January 1, 2026 is a Thursday
            const date = new Date(2026, 0, 1);
            expect(isFirstMondayOfMonth(date)).toBe(false);
        });

        it('should return true for Monday on the 1st of the month', () => {
            // June 1, 2026 is a Monday
            const date = new Date(2026, 5, 1);
            expect(isFirstMondayOfMonth(date)).toBe(true);
        });

        it('should return true for Monday on the 7th of the month', () => {
            // December 7, 2026 is a Monday
            const date = new Date(2026, 11, 7);
            expect(isFirstMondayOfMonth(date)).toBe(true);
        });

        it('should return false for Monday on the 8th of the month', () => {
            // June 8, 2026 is a Monday but the second one
            const date = new Date(2026, 5, 8);
            expect(isFirstMondayOfMonth(date)).toBe(false);
        });

        it('should work with default date parameter', () => {
            // Just testing that it doesn't throw
            const result = isFirstMondayOfMonth();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getMonthString', () => {
        it('should format January correctly', () => {
            const date = new Date(2026, 0, 15);
            expect(getMonthString(date)).toBe('2026-01');
        });

        it('should format December correctly', () => {
            const date = new Date(2026, 11, 25);
            expect(getMonthString(date)).toBe('2026-12');
        });

        it('should pad single-digit months with zero', () => {
            const date = new Date(2026, 4, 10);
            expect(getMonthString(date)).toBe('2026-05');
        });

        it('should work with default date parameter', () => {
            const result = getMonthString();
            // Should match pattern YYYY-MM
            expect(result).toMatch(/^\d{4}-\d{2}$/);
        });
    });

    describe('getCurrentMonth', () => {
        it('should return current month in YYYY-MM format', () => {
            const result = getCurrentMonth();
            expect(result).toMatch(/^\d{4}-\d{2}$/);
        });

        it('should match getMonthString with no argument', () => {
            // Both should return the same value when called with no argument
            // (within a reasonable time frame)
            const currentMonth = getCurrentMonth();
            const monthString = getMonthString();
            expect(currentMonth).toBe(monthString);
        });
    });
});
