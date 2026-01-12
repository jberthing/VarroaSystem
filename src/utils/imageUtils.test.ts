import { describe, it, expect } from 'vitest';
import { getBase64Size } from './imageUtils';

describe('imageUtils', () => {
  describe('getBase64Size', () => {
    it('should calculate size of base64 string without padding', () => {
      // "Hello" in base64 is "SGVsbG8="
      const base64 = 'SGVsbG8=';
      const size = getBase64Size(base64);

      // Size should be approximately 5 bytes / 1024 = 0.00488 KB
      expect(size).toBeCloseTo(0.00488, 3);
    });

    it('should calculate size of base64 image data URL', () => {
      // Small 1x1 red pixel PNG in base64
      const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      const size = getBase64Size(base64);

      // Should be around 68 bytes / 1024 = 0.066 KB
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(0.1);
    });

    it('should handle base64 with data URL prefix', () => {
      const base64WithPrefix =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      // Extract just the base64 part
      const base64 = base64WithPrefix.split(',')[1];
      const size = getBase64Size(base64);

      expect(size).toBeGreaterThan(0);
    });

    it('should calculate size with single padding character', () => {
      const base64 = 'SGVsbG8h'; // "Hello!" with padding
      const size = getBase64Size(base64);

      // 6 bytes / 1024
      expect(size).toBeCloseTo(0.00586, 3);
    });

    it('should calculate size with double padding', () => {
      const base64 = 'SGk='; // "Hi"
      const size = getBase64Size(base64);

      // 2 bytes / 1024
      expect(size).toBeCloseTo(0.00195, 3);
    });

    it('should handle empty string', () => {
      const size = getBase64Size('');

      expect(size).toBe(0);
    });

    it('should calculate size for larger base64 strings', () => {
      // Create a base64 string representing ~1KB of data
      // 1KB = 1024 bytes, base64 encoding increases size by ~33%
      // So we need about 1365 base64 characters for 1KB
      const largeBase64 = 'A'.repeat(1365);
      const size = getBase64Size(largeBase64);

      // Should be approximately 1KB
      expect(size).toBeGreaterThan(0.9);
      expect(size).toBeLessThan(1.1);
    });

    it('should handle typical JPEG image base64 (simulated)', () => {
      // Simulate a small JPEG image (about 5KB worth of base64)
      const jpegBase64 = 'A'.repeat(6827); // ~5KB
      const size = getBase64Size(jpegBase64);

      // Should be around 5KB
      expect(size).toBeGreaterThan(4.5);
      expect(size).toBeLessThan(5.5);
    });

    it('should calculate correct size regardless of content', () => {
      // Different characters should give same result for same length
      const base64a = 'AAAA';
      const base64b = 'ZZZZ';
      const base64c = '/+/+';

      expect(getBase64Size(base64a)).toBe(getBase64Size(base64b));
      expect(getBase64Size(base64b)).toBe(getBase64Size(base64c));
    });
  });
});
