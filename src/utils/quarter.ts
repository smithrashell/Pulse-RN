import {
  getQuarter,
  getYear,
  startOfQuarter,
  endOfQuarter,
  addQuarters as dfnsAddQuarters,
  differenceInWeeks,
  startOfWeek,
  getMonth,
  format,
} from 'date-fns';

/**
 * Format a date as YYYY-Qq (e.g., "2026-Q1")
 */
export const formatQuarter = (date: Date): string => {
  const year = getYear(date);
  const quarter = getQuarter(date);
  return `${year}-Q${quarter}`;
};

/**
 * Get current quarter string
 */
export const getCurrentQuarter = (): string => formatQuarter(new Date());

/**
 * Get the start and end dates of a quarter from a YYYY-Qq string
 */
export const getQuarterDates = (quarterStr: string): { start: Date; end: Date } => {
  const [yearStr, qStr] = quarterStr.split('-Q');
  const year = parseInt(yearStr, 10);
  const quarter = parseInt(qStr, 10);

  // Create a date in the middle of the quarter
  const monthInQuarter = (quarter - 1) * 3 + 1; // Jan, Apr, Jul, Oct (1-indexed)
  const date = new Date(year, monthInQuarter - 1, 15); // month is 0-indexed

  return {
    start: startOfQuarter(date),
    end: endOfQuarter(date),
  };
};

/**
 * Get the current week number within the quarter (1-13)
 */
export const getWeekOfQuarter = (date: Date): number => {
  const quarterStart = startOfQuarter(date);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const quarterWeekStart = startOfWeek(quarterStart, { weekStartsOn: 1 });

  // Calculate weeks since quarter start
  const weeksDiff = differenceInWeeks(weekStart, quarterWeekStart);
  return Math.min(Math.max(weeksDiff + 1, 1), 13);
};

/**
 * Format quarter as a readable label (e.g., "Q1 2026")
 */
export const formatQuarterLabel = (quarterStr: string): string => {
  const [year, qPart] = quarterStr.split('-');
  return `${qPart} ${year}`;
};

/**
 * Format quarter as a date range (e.g., "Jan - Mar 2026")
 */
export const formatQuarterRange = (quarterStr: string): string => {
  const { start, end } = getQuarterDates(quarterStr);
  const startMonth = format(start, 'MMM');
  const endMonth = format(end, 'MMM');
  const year = format(end, 'yyyy');
  return `${startMonth} - ${endMonth} ${year}`;
};

/**
 * Add quarters to a quarter string and return new quarter string
 */
export const addQuarters = (quarterStr: string, amount: number): string => {
  const { start } = getQuarterDates(quarterStr);
  const newDate = dfnsAddQuarters(start, amount);
  return formatQuarter(newDate);
};

/**
 * Get the three months in a quarter as YYYY-MM strings
 */
export const getMonthsInQuarter = (quarterStr: string): string[] => {
  const { start } = getQuarterDates(quarterStr);
  const months: string[] = [];
  for (let i = 0; i < 3; i++) {
    const month = new Date(start);
    month.setMonth(month.getMonth() + i);
    months.push(format(month, 'yyyy-MM'));
  }
  return months;
};

/**
 * Parse quarter string to year and quarter number
 */
export const parseQuarter = (quarterStr: string): { year: number; quarter: number } => {
  const [yearStr, qStr] = quarterStr.split('-Q');
  return {
    year: parseInt(yearStr, 10),
    quarter: parseInt(qStr, 10),
  };
};

/**
 * Check if a date is in the given quarter
 */
export const isInQuarter = (date: Date, quarterStr: string): boolean => {
  return formatQuarter(date) === quarterStr;
};

/**
 * Get total weeks in a quarter (typically 13, sometimes 14)
 */
export const getTotalWeeksInQuarter = (quarterStr: string): number => {
  const { start, end } = getQuarterDates(quarterStr);
  return differenceInWeeks(end, start) + 1;
};
