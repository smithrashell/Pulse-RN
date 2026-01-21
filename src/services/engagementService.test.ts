// Mock the db client and queries to avoid expo-sqlite dependency
jest.mock('../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../db/queries', () => ({
  sessionQueries: {
    getUniqueDaysWithSessions: jest.fn().mockResolvedValue([]),
    getLastActiveDate: jest.fn().mockResolvedValue(null),
  },
}));

import { engagementService, ENGAGEMENT_MESSAGES, EngagementLevel } from './engagementService';

describe('engagementService', () => {
  describe('calculateLevel', () => {
    it('should return ACTIVE for 0 gap days', () => {
      expect(engagementService.calculateLevel(0)).toBe('ACTIVE');
    });

    it('should return ACTIVE for 1 gap day', () => {
      expect(engagementService.calculateLevel(1)).toBe('ACTIVE');
    });

    it('should return SLIPPING for 2 gap days', () => {
      expect(engagementService.calculateLevel(2)).toBe('SLIPPING');
    });

    it('should return SLIPPING for 3 gap days', () => {
      expect(engagementService.calculateLevel(3)).toBe('SLIPPING');
    });

    it('should return DORMANT for 4 gap days', () => {
      expect(engagementService.calculateLevel(4)).toBe('DORMANT');
    });

    it('should return DORMANT for 5 gap days', () => {
      expect(engagementService.calculateLevel(5)).toBe('DORMANT');
    });

    it('should return RESET for 6+ gap days', () => {
      expect(engagementService.calculateLevel(6)).toBe('RESET');
      expect(engagementService.calculateLevel(10)).toBe('RESET');
      expect(engagementService.calculateLevel(100)).toBe('RESET');
    });
  });

  describe('shouldShowPrompt', () => {
    it('should not show prompt for ACTIVE users', () => {
      expect(engagementService.shouldShowPrompt('ACTIVE')).toBe(false);
    });

    it('should show prompt for SLIPPING users', () => {
      expect(engagementService.shouldShowPrompt('SLIPPING')).toBe(true);
    });

    it('should show prompt for DORMANT users', () => {
      expect(engagementService.shouldShowPrompt('DORMANT')).toBe(true);
    });

    it('should show prompt for RESET users', () => {
      expect(engagementService.shouldShowPrompt('RESET')).toBe(true);
    });
  });

  describe('getMessage', () => {
    it('should return correct message for ACTIVE level', () => {
      const message = engagementService.getMessage('ACTIVE');
      expect(message).toEqual(ENGAGEMENT_MESSAGES.ACTIVE);
      expect(message.title).toBe("You're on track!");
    });

    it('should return correct message for SLIPPING level', () => {
      const message = engagementService.getMessage('SLIPPING');
      expect(message).toEqual(ENGAGEMENT_MESSAGES.SLIPPING);
      expect(message.title).toBe('Welcome back!');
    });

    it('should return correct message for DORMANT level', () => {
      const message = engagementService.getMessage('DORMANT');
      expect(message).toEqual(ENGAGEMENT_MESSAGES.DORMANT);
      expect(message.title).toBe('Hey there');
    });

    it('should return correct message for RESET level', () => {
      const message = engagementService.getMessage('RESET');
      expect(message).toEqual(ENGAGEMENT_MESSAGES.RESET);
      expect(message.title).toBe("Let's simplify");
    });
  });

  describe('getColor', () => {
    it('should return primary for ACTIVE', () => {
      expect(engagementService.getColor('ACTIVE')).toBe('primary');
    });

    it('should return secondary for SLIPPING', () => {
      expect(engagementService.getColor('SLIPPING')).toBe('secondary');
    });

    it('should return tertiary for DORMANT', () => {
      expect(engagementService.getColor('DORMANT')).toBe('tertiary');
    });

    it('should return error for RESET', () => {
      expect(engagementService.getColor('RESET')).toBe('error');
    });
  });

  describe('ENGAGEMENT_MESSAGES', () => {
    it('should have all engagement levels defined', () => {
      const levels: EngagementLevel[] = ['ACTIVE', 'SLIPPING', 'DORMANT', 'RESET'];
      levels.forEach((level) => {
        expect(ENGAGEMENT_MESSAGES[level]).toBeDefined();
        expect(ENGAGEMENT_MESSAGES[level].title).toBeDefined();
        expect(ENGAGEMENT_MESSAGES[level].message).toBeDefined();
      });
    });

    it('should have supportive, non-judgmental messaging', () => {
      // Verify no shame language
      Object.values(ENGAGEMENT_MESSAGES).forEach((msg) => {
        const fullText = (msg.title + ' ' + msg.message).toLowerCase();
        expect(fullText).not.toContain('missed');
        expect(fullText).not.toContain('failed');
        expect(fullText).not.toContain('lazy');
      });
    });
  });
});
