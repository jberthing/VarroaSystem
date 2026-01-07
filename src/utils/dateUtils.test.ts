import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatDateShort, getTodayString, getDaysAgo } from './dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date in Danish long format', () => {
      const result = formatDate('2026-01-07');
      // Expected format: "7. januar 2026" in Danish locale
      expect(result).toMatch(/7\.?\s+januar\s+2026/i);
    });

    it('should format date with different months correctly', () => {
      const result = formatDate('2025-12-25');
      expect(result).toMatch(/25\.?\s+december\s+2025/i);
    });

    it('should handle single digit days', () => {
      const result = formatDate('2026-03-05');
      expect(result).toMatch(/5\.?\s+marts\s+2026/i);
    });

    it('should handle leap year dates', () => {
      const result = formatDate('2024-02-29');
      expect(result).toMatch(/29\.?\s+februar\s+2024/i);
    });
  });

  describe('formatDateShort', () => {
    it('should format date in Danish short format', () => {
      const result = formatDateShort('2026-01-07');
      // Expected format: "7. jan." or similar in Danish locale
      expect(result).toMatch(/7\.?\s+jan/i);
    });

    it('should format date with different months correctly', () => {
      const result = formatDateShort('2025-12-25');
      expect(result).toMatch(/25\.?\s+dec/i);
    });

    it('should handle mid-year dates', () => {
      const result = formatDateShort('2026-06-15');
      expect(result).toMatch(/15\.?\s+jun/i);
    });
  });

  describe('getTodayString', () => {
    beforeEach(() => {
      // Mock the date to a fixed value
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return today\'s date in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date('2026-01-07T12:00:00Z'));
      
      const result = getTodayString();
      
      expect(result).toBe('2026-01-07');
    });

    it('should handle single digit months and days with zero padding', () => {
      vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));
      
      const result = getTodayString();
      
      expect(result).toBe('2026-03-05');
    });

    it('should handle end of year', () => {
      vi.setSystemTime(new Date('2025-12-31T23:59:59Z'));
      
      const result = getTodayString();
      
      expect(result).toBe('2025-12-31');
    });

    it('should handle start of year', () => {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      
      const result = getTodayString();
      
      expect(result).toBe('2026-01-01');
    });
  });

  describe('getDaysAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return date 7 days ago in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date('2026-01-07T12:00:00Z'));
      
      const result = getDaysAgo(7);
      
      expect(result).toBe('2025-12-31');
    });

    it('should return date 1 day ago', () => {
      vi.setSystemTime(new Date('2026-01-07T12:00:00Z'));
      
      const result = getDaysAgo(1);
      
      expect(result).toBe('2026-01-06');
    });

    it('should return date 30 days ago', () => {
      vi.setSystemTime(new Date('2026-01-31T12:00:00Z'));
      
      const result = getDaysAgo(30);
      
      expect(result).toBe('2026-01-01');
    });

    it('should handle crossing month boundaries', () => {
      vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));
      
      const result = getDaysAgo(10);
      
      expect(result).toBe('2026-02-23');
    });

    it('should handle crossing year boundaries', () => {
      vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
      
      const result = getDaysAgo(3);
      
      expect(result).toBe('2025-12-30');
    });

    it('should handle 0 days ago (today)', () => {
      vi.setSystemTime(new Date('2026-01-07T12:00:00Z'));
      
      const result = getDaysAgo(0);
      
      expect(result).toBe('2026-01-07');
    });

    it('should handle leap year calculations', () => {
      vi.setSystemTime(new Date('2024-03-01T12:00:00Z'));
      
      const result = getDaysAgo(1);
      
      // Should be Feb 29 in a leap year
      expect(result).toBe('2024-02-29');
    });
  });
});
