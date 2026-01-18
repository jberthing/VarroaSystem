import { describe, it, expect } from 'vitest';
import { calculateTrend, getTrendIcon, getTrendColor, getMitesPerDayColor } from './calculations';
import type { Observation } from '../db/database';

describe('calculations', () => {
  describe('calculateTrend', () => {
    it('should return "none" when latest observation is missing', () => {
      const previous: Observation = {
        id: '1',
        hiveId: 'hive1',
        date: '2026-01-01',
        miteCount: 10,
        daysSinceLast: 3,
        mitesPerDay: 3.33,
        notes: '',
        images: [],
      };

      expect(calculateTrend(undefined, previous)).toBe('none');
    });

    it('should return "none" when previous observation is missing', () => {
      const latest: Observation = {
        id: '2',
        hiveId: 'hive1',
        date: '2026-01-05',
        miteCount: 15,
        daysSinceLast: 4,
        mitesPerDay: 3.75,
        notes: '',
        images: [],
      };

      expect(calculateTrend(latest, undefined)).toBe('none');
    });

    it('should return "up" when mites per day increases significantly', () => {
      const previous: Observation = {
        id: '1',
        hiveId: 'hive1',
        date: '2026-01-01',
        miteCount: 10,
        daysSinceLast: 3,
        mitesPerDay: 3.0,
        notes: '',
        images: [],
      };

      const latest: Observation = {
        id: '2',
        hiveId: 'hive1',
        date: '2026-01-05',
        miteCount: 20,
        daysSinceLast: 4,
        mitesPerDay: 5.0,
        notes: '',
        images: [],
      };

      expect(calculateTrend(latest, previous)).toBe('up');
    });

    it('should return "down" when mites per day decreases significantly', () => {
      const previous: Observation = {
        id: '1',
        hiveId: 'hive1',
        date: '2026-01-01',
        miteCount: 20,
        daysSinceLast: 4,
        mitesPerDay: 5.0,
        notes: '',
        images: [],
      };

      const latest: Observation = {
        id: '2',
        hiveId: 'hive1',
        date: '2026-01-05',
        miteCount: 10,
        daysSinceLast: 3,
        mitesPerDay: 3.0,
        notes: '',
        images: [],
      };

      expect(calculateTrend(latest, previous)).toBe('down');
    });

    it('should return "flat" when difference is less than 0.5', () => {
      const previous: Observation = {
        id: '1',
        hiveId: 'hive1',
        date: '2026-01-01',
        miteCount: 10,
        daysSinceLast: 3,
        mitesPerDay: 3.0,
        notes: '',
        images: [],
      };

      const latest: Observation = {
        id: '2',
        hiveId: 'hive1',
        date: '2026-01-05',
        miteCount: 13,
        daysSinceLast: 4,
        mitesPerDay: 3.25,
        notes: '',
        images: [],
      };

      expect(calculateTrend(latest, previous)).toBe('flat');
    });
  });

  describe('getTrendIcon', () => {
    it('should return up arrow for "up" trend', () => {
      expect(getTrendIcon('up')).toBe('↑');
    });

    it('should return down arrow for "down" trend', () => {
      expect(getTrendIcon('down')).toBe('↓');
    });

    it('should return right arrow for "flat" trend', () => {
      expect(getTrendIcon('flat')).toBe('→');
    });

    it('should return empty string for "none" trend', () => {
      expect(getTrendIcon('none')).toBe('');
    });
  });

  describe('getTrendColor', () => {
    it('should return red color for "up" trend', () => {
      expect(getTrendColor('up')).toBe('#ef4444');
    });

    it('should return green color for "down" trend', () => {
      expect(getTrendColor('down')).toBe('#10b981');
    });

    it('should return yellow color for "flat" trend', () => {
      expect(getTrendColor('flat')).toBe('#f59e0b');
    });

    it('should return gray color for "none" trend', () => {
      expect(getTrendColor('none')).toBe('#6b7280');
    });
  });

  describe('getMitesPerDayColor', () => {
    it('should return red color when mites per day >= 10', () => {
      expect(getMitesPerDayColor(10)).toBe('#ef4444');
      expect(getMitesPerDayColor(15)).toBe('#ef4444');
    });

    it('should return orange color when mites per day is between 5 and 10', () => {
      expect(getMitesPerDayColor(5)).toBe('#f97316');
      expect(getMitesPerDayColor(7.5)).toBe('#f97316');
      expect(getMitesPerDayColor(9.9)).toBe('#f97316');
    });

    it('should return yellow color when mites per day is between 3 and 5', () => {
      expect(getMitesPerDayColor(3)).toBe('#f59e0b');
      expect(getMitesPerDayColor(3.5)).toBe('#f59e0b');
      expect(getMitesPerDayColor(4.9)).toBe('#f59e0b');
    });

    it('should return green color when mites per day < 3', () => {
      expect(getMitesPerDayColor(0)).toBe('#10b981');
      expect(getMitesPerDayColor(1)).toBe('#10b981');
      expect(getMitesPerDayColor(2.9)).toBe('#10b981');
    });
  });
});
