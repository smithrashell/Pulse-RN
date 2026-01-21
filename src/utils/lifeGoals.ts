import type { TimeWindow } from '../db/schema';

// Default life goal categories
export const LIFE_GOAL_CATEGORIES = [
    'Career',
    'Education',
    'Entrepreneurship',
    'Personal Brand',
    'Financial',
    'Health & Fitness',
    'Relationships',
    'Family',
    'Lifestyle',
    'Travel',
    'Impact & Legacy',
    'Mentorship & Network',
    'Creative',
    'Spiritual',
    'Other',
] as const;

export type LifeGoalCategory = (typeof LIFE_GOAL_CATEGORIES)[number];

// Time window definitions
export const TIME_WINDOWS = [
    {
        value: 'SHORT_TERM' as TimeWindow,
        label: '1-2 years',
        description: 'Near future',
        order: 1,
    },
    {
        value: 'MID_TERM' as TimeWindow,
        label: '3-5 years',
        description: 'Medium term',
        order: 2,
    },
    {
        value: 'MID_LATE_TERM' as TimeWindow,
        label: '6-9 years',
        description: 'Mid-late term',
        order: 3,
    },
    {
        value: 'LONG_TERM' as TimeWindow,
        label: '10-20 years',
        description: 'Long term vision',
        order: 4,
    },
] as const;

// Helper to get time window label
export function getTimeWindowLabel(timeWindow: TimeWindow): string {
    const window = TIME_WINDOWS.find(w => w.value === timeWindow);
    return window?.label || timeWindow;
}

// Helper to get time window description
export function getTimeWindowDescription(timeWindow: TimeWindow): string {
    const window = TIME_WINDOWS.find(w => w.value === timeWindow);
    return window?.description || '';
}

// Helper to get time window order for sorting
export function getTimeWindowOrder(timeWindow: TimeWindow): number {
    const window = TIME_WINDOWS.find(w => w.value === timeWindow);
    return window?.order || 999;
}

// Helper to check if it's the first Monday of the month
export function isFirstMondayOfMonth(date: Date = new Date()): boolean {
    // Check if it's a Monday
    if (date.getDay() !== 1) {
        return false;
    }

    // Check if it's in the first 7 days of the month
    return date.getDate() <= 7;
}

// Helper to get the month string (YYYY-MM format)
export function getMonthString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Helper to get current month
export function getCurrentMonth(): string {
    return getMonthString(new Date());
}
