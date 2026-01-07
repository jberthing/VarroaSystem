import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as repository from './repository';
import { db } from './database';

// Mock the database
vi.mock('./database', () => ({
  db: {
    apiaries: {
      add: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      bulkAdd: vi.fn(),
    },
    hives: {
      add: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      bulkAdd: vi.fn(),
    },
    observations: {
      add: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      bulkAdd: vi.fn(),
    },
    treatments: {
      add: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      bulkAdd: vi.fn(),
    },
    transaction: vi.fn(),
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

describe('repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createObservation', () => {
    it('should create observation with valid data', async () => {
      const mockAdd = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.observations.add).mockImplementation(mockAdd);

      const result = await repository.createObservation(
        'hive-123',
        '2026-01-07',
        15,
        3,
        'Test note'
      );

      expect(result).toMatchObject({
        id: 'test-uuid-123',
        hiveId: 'hive-123',
        date: '2026-01-07',
        miteCount: 15,
        trayDays: 3,
        mitesPerDay: 5.0,
        notes: 'Test note',
      });

      expect(result.createdAt).toBeDefined();
      expect(mockAdd).toHaveBeenCalledTimes(1);
    });

    it('should calculate mitesPerDay correctly', async () => {
      vi.mocked(db.observations.add).mockResolvedValue(undefined);

      const result = await repository.createObservation(
        'hive-123',
        '2026-01-07',
        10,
        3
      );

      expect(result.mitesPerDay).toBe(3.33);
    });

    it('should round mitesPerDay to 2 decimal places', async () => {
      vi.mocked(db.observations.add).mockResolvedValue(undefined);

      const result = await repository.createObservation(
        'hive-123',
        '2026-01-07',
        100,
        7
      );

      // 100 / 7 = 14.285714... should round to 14.29
      expect(result.mitesPerDay).toBe(14.29);
    });

    it('should throw error when trayDays is less than 1', async () => {
      await expect(
        repository.createObservation('hive-123', '2026-01-07', 10, 0)
      ).rejects.toThrow('Antal dage skal være mindst 1');

      await expect(
        repository.createObservation('hive-123', '2026-01-07', 10, -1)
      ).rejects.toThrow('Antal dage skal være mindst 1');
    });

    it('should throw error when miteCount is negative', async () => {
      await expect(
        repository.createObservation('hive-123', '2026-01-07', -5, 3)
      ).rejects.toThrow('Antal mider kan ikke være negativt');
    });

    it('should allow zero mite count', async () => {
      vi.mocked(db.observations.add).mockResolvedValue(undefined);

      const result = await repository.createObservation(
        'hive-123',
        '2026-01-07',
        0,
        3
      );

      expect(result.miteCount).toBe(0);
      expect(result.mitesPerDay).toBe(0);
    });

    it('should create observation without notes', async () => {
      vi.mocked(db.observations.add).mockResolvedValue(undefined);

      const result = await repository.createObservation(
        'hive-123',
        '2026-01-07',
        15,
        3
      );

      expect(result.notes).toBeUndefined();
    });

    it('should set createdAt timestamp', async () => {
      vi.mocked(db.observations.add).mockResolvedValue(undefined);
      const beforeTime = Date.now();

      const result = await repository.createObservation(
        'hive-123',
        '2026-01-07',
        15,
        3
      );

      const afterTime = Date.now();
      expect(result.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(result.createdAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('updateObservation', () => {
    it('should recalculate mitesPerDay when miteCount is updated', async () => {
      const existingObservation = {
        id: 'obs-123',
        hiveId: 'hive-123',
        date: '2026-01-07',
        miteCount: 10,
        trayDays: 3,
        mitesPerDay: 3.33,
      };

      vi.mocked(db.observations.get).mockResolvedValue(existingObservation);
      vi.mocked(db.observations.update).mockResolvedValue(undefined);

      await repository.updateObservation('obs-123', { miteCount: 20 });

      expect(db.observations.update).toHaveBeenCalledWith('obs-123', {
        miteCount: 20,
        mitesPerDay: 6.67,
      });
    });

    it('should recalculate mitesPerDay when trayDays is updated', async () => {
      const existingObservation = {
        id: 'obs-123',
        hiveId: 'hive-123',
        date: '2026-01-07',
        miteCount: 10,
        trayDays: 3,
        mitesPerDay: 3.33,
      };

      vi.mocked(db.observations.get).mockResolvedValue(existingObservation);
      vi.mocked(db.observations.update).mockResolvedValue(undefined);

      await repository.updateObservation('obs-123', { trayDays: 5 });

      expect(db.observations.update).toHaveBeenCalledWith('obs-123', {
        trayDays: 5,
        mitesPerDay: 2.0,
      });
    });

    it('should recalculate mitesPerDay when both miteCount and trayDays are updated', async () => {
      const existingObservation = {
        id: 'obs-123',
        hiveId: 'hive-123',
        date: '2026-01-07',
        miteCount: 10,
        trayDays: 3,
        mitesPerDay: 3.33,
      };

      vi.mocked(db.observations.get).mockResolvedValue(existingObservation);
      vi.mocked(db.observations.update).mockResolvedValue(undefined);

      await repository.updateObservation('obs-123', {
        miteCount: 30,
        trayDays: 6,
      });

      expect(db.observations.update).toHaveBeenCalledWith('obs-123', {
        miteCount: 30,
        trayDays: 6,
        mitesPerDay: 5.0,
      });
    });

    it('should not recalculate mitesPerDay when other fields are updated', async () => {
      vi.mocked(db.observations.get).mockResolvedValue(undefined);
      vi.mocked(db.observations.update).mockResolvedValue(undefined);

      await repository.updateObservation('obs-123', {
        notes: 'Updated notes',
      });

      expect(db.observations.update).toHaveBeenCalledWith('obs-123', {
        notes: 'Updated notes',
      });
    });

    it('should handle missing observation gracefully', async () => {
      vi.mocked(db.observations.get).mockResolvedValue(undefined);
      vi.mocked(db.observations.update).mockResolvedValue(undefined);

      await repository.updateObservation('non-existent', { miteCount: 20 });

      // Should still call update even if observation not found
      expect(db.observations.update).toHaveBeenCalledWith('non-existent', {
        miteCount: 20,
      });
    });
  });

  describe('createApiary', () => {
    it('should create apiary with all fields', async () => {
      vi.mocked(db.apiaries.add).mockResolvedValue(undefined);

      const result = await repository.createApiary(
        'Test Bigård',
        'Test Location',
        'base64image'
      );

      expect(result).toMatchObject({
        id: 'test-uuid-123',
        name: 'Test Bigård',
        location: 'Test Location',
        image: 'base64image',
        isActive: true,
      });
      expect(result.createdAt).toBeDefined();
    });

    it('should create apiary with only required fields', async () => {
      vi.mocked(db.apiaries.add).mockResolvedValue(undefined);

      const result = await repository.createApiary('Test Bigård');

      expect(result).toMatchObject({
        id: 'test-uuid-123',
        name: 'Test Bigård',
        isActive: true,
      });
      expect(result.location).toBeUndefined();
      expect(result.image).toBeUndefined();
    });

    it('should set isActive to true by default', async () => {
      vi.mocked(db.apiaries.add).mockResolvedValue(undefined);

      const result = await repository.createApiary('Test Bigård');

      expect(result.isActive).toBe(true);
    });
  });

  describe('createHive', () => {
    it('should create hive with all fields', async () => {
      vi.mocked(db.hives.add).mockResolvedValue(undefined);

      const result = await repository.createHive(
        'Stade A',
        'apiary-123',
        'Corner spot',
        'base64image'
      );

      expect(result).toMatchObject({
        id: 'test-uuid-123',
        name: 'Stade A',
        apiaryId: 'apiary-123',
        location: 'Corner spot',
        image: 'base64image',
        isActive: true,
      });
    });

    it('should create hive without apiary', async () => {
      vi.mocked(db.hives.add).mockResolvedValue(undefined);

      const result = await repository.createHive('Stade A');

      expect(result.apiaryId).toBeUndefined();
      expect(result.isActive).toBe(true);
    });
  });

  describe('createTreatment', () => {
    it('should create treatment with all fields', async () => {
      vi.mocked(db.treatments.add).mockResolvedValue(undefined);

      const result = await repository.createTreatment(
        'hive-123',
        '2026-01-07',
        'Oxalsyre',
        'Test behandling'
      );

      expect(result).toMatchObject({
        id: 'test-uuid-123',
        hiveId: 'hive-123',
        date: '2026-01-07',
        treatmentType: 'Oxalsyre',
        notes: 'Test behandling',
      });
      expect(result.createdAt).toBeDefined();
    });

    it('should create treatment without notes', async () => {
      vi.mocked(db.treatments.add).mockResolvedValue(undefined);

      const result = await repository.createTreatment(
        'hive-123',
        '2026-01-07',
        'Myresyre'
      );

      expect(result.notes).toBeUndefined();
    });
  });

  describe('getAllApiaries', () => {
    it('should return all apiaries when activeOnly is false', async () => {
      const mockApiaries = [
        { id: '1', name: 'Active', isActive: true },
        { id: '2', name: 'Inactive', isActive: false },
      ];
      vi.mocked(db.apiaries.toArray).mockResolvedValue(mockApiaries);

      const result = await repository.getAllApiaries(false);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockApiaries);
    });

    it('should return only active apiaries when activeOnly is true', async () => {
      const mockApiaries = [
        { id: '1', name: 'Active', isActive: true, createdAt: Date.now() },
        { id: '2', name: 'Inactive', isActive: false, createdAt: Date.now() },
        { id: '3', name: 'Active2', isActive: true, createdAt: Date.now() },
      ];
      vi.mocked(db.apiaries.toArray).mockResolvedValue(mockApiaries);

      const result = await repository.getAllApiaries(true);

      expect(result).toHaveLength(2);
      expect(result.every(a => a.isActive)).toBe(true);
    });
  });

  describe('getAllHives', () => {
    it('should return all hives when activeOnly is false', async () => {
      const mockHives = [
        { id: '1', name: 'Active', isActive: true },
        { id: '2', name: 'Inactive', isActive: false },
      ];
      vi.mocked(db.hives.toArray).mockResolvedValue(mockHives);

      const result = await repository.getAllHives(false);

      expect(result).toHaveLength(2);
    });

    it('should return only active hives when activeOnly is true', async () => {
      const mockHives = [
        { id: '1', name: 'Active', isActive: true, createdAt: Date.now() },
        { id: '2', name: 'Inactive', isActive: false, createdAt: Date.now() },
        { id: '3', name: 'Active2', isActive: true, createdAt: Date.now() },
      ];
      vi.mocked(db.hives.toArray).mockResolvedValue(mockHives);

      const result = await repository.getAllHives(true);

      expect(result).toHaveLength(2);
      expect(result.every(h => h.isActive)).toBe(true);
    });
  });
});
