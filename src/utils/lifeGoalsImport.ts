import type { TimeWindow } from '../db/schema';
import { LIFE_GOAL_CATEGORIES } from './lifeGoals';

export interface ParsedGoal {
    title: string;
    category: string;
    timeWindow: string;
    description?: string;
    isValid: boolean;
    errors: string[];
}

export interface ParseResult {
    goals: ParsedGoal[];
    validCount: number;
    invalidCount: number;
}

const VALID_TIME_WINDOWS: TimeWindow[] = ['SHORT_TERM', 'MID_TERM', 'MID_LATE_TERM', 'LONG_TERM'];

export function validateCategory(category: string): boolean {
    return LIFE_GOAL_CATEGORIES.includes(category as typeof LIFE_GOAL_CATEGORIES[number]);
}

export function validateTimeWindow(timeWindow: string): boolean {
    return VALID_TIME_WINDOWS.includes(timeWindow as TimeWindow);
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

export function parseCSV(csv: string): ParseResult {
    const lines = csv.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const goals: ParsedGoal[] = [];

    if (lines.length === 0) {
        return { goals: [], validCount: 0, invalidCount: 0 };
    }

    // Check if first line is a header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('title') && firstLine.includes('category');
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const values = parseCSVLine(line);
        const errors: string[] = [];

        const title = values[0] || '';
        const category = values[1] || '';
        const timeWindow = values[2] || '';
        const description = values[3] || undefined;

        // Validate title
        if (!title) {
            errors.push('Title is required');
        }

        // Validate category
        if (!category) {
            errors.push('Category is required');
        } else if (!validateCategory(category)) {
            errors.push(`Invalid category: "${category}"`);
        }

        // Validate time window
        if (!timeWindow) {
            errors.push('Time window is required');
        } else if (!validateTimeWindow(timeWindow)) {
            errors.push(`Invalid time window: "${timeWindow}"`);
        }

        goals.push({
            title,
            category,
            timeWindow,
            description,
            isValid: errors.length === 0,
            errors,
        });
    }

    return {
        goals,
        validCount: goals.filter(g => g.isValid).length,
        invalidCount: goals.filter(g => !g.isValid).length,
    };
}

export function getValidGoalsForImport(parseResult: ParseResult, existingCount: number): {
    title: string;
    category: string;
    timeWindow: TimeWindow;
    description?: string;
    isStretchGoal: boolean;
    status: 'ACTIVE';
    sortOrder: number;
}[] {
    return parseResult.goals
        .filter(g => g.isValid)
        .map((goal, index) => {
            const sortOrder = existingCount + index + 1;
            return {
                title: goal.title,
                category: goal.category,
                timeWindow: goal.timeWindow as TimeWindow,
                description: goal.description,
                isStretchGoal: sortOrder > 50,
                status: 'ACTIVE' as const,
                sortOrder,
            };
        });
}
