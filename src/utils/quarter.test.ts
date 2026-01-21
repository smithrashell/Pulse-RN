import {
  formatQuarter,
  getCurrentQuarter,
  getQuarterDates,
  getWeekOfQuarter,
  formatQuarterLabel,
  formatQuarterRange,
  addQuarters,
  getMonthsInQuarter,
  parseQuarter,
  isInQuarter,
  getTotalWeeksInQuarter,
} from './quarter';

describe('quarter utilities', () => {
  describe('formatQuarter', () => {
    it('should format Q1 correctly', () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      expect(formatQuarter(date)).toBe('2026-Q1');
    });

    it('should format Q2 correctly', () => {
      const date = new Date(2026, 4, 15); // May 15, 2026
      expect(formatQuarter(date)).toBe('2026-Q2');
    });

    it('should format Q3 correctly', () => {
      const date = new Date(2026, 7, 15); // August 15, 2026
      expect(formatQuarter(date)).toBe('2026-Q3');
    });

    it('should format Q4 correctly', () => {
      const date = new Date(2026, 10, 15); // November 15, 2026
      expect(formatQuarter(date)).toBe('2026-Q4');
    });

    it('should handle edge cases at quarter boundaries', () => {
      expect(formatQuarter(new Date(2026, 2, 31))).toBe('2026-Q1'); // March 31
      expect(formatQuarter(new Date(2026, 3, 1))).toBe('2026-Q2'); // April 1
    });
  });

  describe('getQuarterDates', () => {
    it('should return correct dates for Q1', () => {
      const { start, end } = getQuarterDates('2026-Q1');
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(2); // March
      expect(end.getDate()).toBe(31);
    });

    it('should return correct dates for Q2', () => {
      const { start, end } = getQuarterDates('2026-Q2');
      expect(start.getMonth()).toBe(3); // April
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(5); // June
      expect(end.getDate()).toBe(30);
    });

    it('should return correct dates for Q3', () => {
      const { start, end } = getQuarterDates('2026-Q3');
      expect(start.getMonth()).toBe(6); // July
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(8); // September
      expect(end.getDate()).toBe(30);
    });

    it('should return correct dates for Q4', () => {
      const { start, end } = getQuarterDates('2026-Q4');
      expect(start.getMonth()).toBe(9); // October
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
    });
  });

  describe('getWeekOfQuarter', () => {
    it('should return week 1 for start of quarter', () => {
      const date = new Date(2026, 0, 5); // First week of January
      expect(getWeekOfQuarter(date)).toBeGreaterThanOrEqual(1);
      expect(getWeekOfQuarter(date)).toBeLessThanOrEqual(2);
    });

    it('should not exceed 13', () => {
      const date = new Date(2026, 2, 31); // End of Q1
      expect(getWeekOfQuarter(date)).toBeLessThanOrEqual(13);
    });

    it('should return at least 1', () => {
      const date = new Date(2026, 0, 1); // Start of Q1
      expect(getWeekOfQuarter(date)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('formatQuarterLabel', () => {
    it('should format quarter label correctly', () => {
      expect(formatQuarterLabel('2026-Q1')).toBe('Q1 2026');
      expect(formatQuarterLabel('2025-Q4')).toBe('Q4 2025');
    });
  });

  describe('formatQuarterRange', () => {
    it('should format Q1 range correctly', () => {
      expect(formatQuarterRange('2026-Q1')).toBe('Jan - Mar 2026');
    });

    it('should format Q2 range correctly', () => {
      expect(formatQuarterRange('2026-Q2')).toBe('Apr - Jun 2026');
    });

    it('should format Q3 range correctly', () => {
      expect(formatQuarterRange('2026-Q3')).toBe('Jul - Sep 2026');
    });

    it('should format Q4 range correctly', () => {
      expect(formatQuarterRange('2026-Q4')).toBe('Oct - Dec 2026');
    });
  });

  describe('addQuarters', () => {
    it('should add quarters correctly', () => {
      expect(addQuarters('2026-Q1', 1)).toBe('2026-Q2');
      expect(addQuarters('2026-Q1', 2)).toBe('2026-Q3');
      expect(addQuarters('2026-Q4', 1)).toBe('2027-Q1');
    });

    it('should subtract quarters correctly', () => {
      expect(addQuarters('2026-Q2', -1)).toBe('2026-Q1');
      expect(addQuarters('2026-Q1', -1)).toBe('2025-Q4');
    });
  });

  describe('getMonthsInQuarter', () => {
    it('should return correct months for Q1', () => {
      const months = getMonthsInQuarter('2026-Q1');
      expect(months).toEqual(['2026-01', '2026-02', '2026-03']);
    });

    it('should return correct months for Q4', () => {
      const months = getMonthsInQuarter('2026-Q4');
      expect(months).toEqual(['2026-10', '2026-11', '2026-12']);
    });
  });

  describe('parseQuarter', () => {
    it('should parse quarter string correctly', () => {
      expect(parseQuarter('2026-Q1')).toEqual({ year: 2026, quarter: 1 });
      expect(parseQuarter('2025-Q4')).toEqual({ year: 2025, quarter: 4 });
    });
  });

  describe('isInQuarter', () => {
    it('should return true for date in quarter', () => {
      const date = new Date(2026, 1, 15); // February 15
      expect(isInQuarter(date, '2026-Q1')).toBe(true);
    });

    it('should return false for date not in quarter', () => {
      const date = new Date(2026, 4, 15); // May 15
      expect(isInQuarter(date, '2026-Q1')).toBe(false);
    });
  });

  describe('getTotalWeeksInQuarter', () => {
    it('should return approximately 13 weeks', () => {
      const weeks = getTotalWeeksInQuarter('2026-Q1');
      expect(weeks).toBeGreaterThanOrEqual(12);
      expect(weeks).toBeLessThanOrEqual(14);
    });
  });
});
