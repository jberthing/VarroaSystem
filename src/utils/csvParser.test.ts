import { describe, it, expect } from 'vitest';
import { parseVarroDetectorCSV } from './csvParser';

describe('parseVarroDetectorCSV', () => {
  it('should parse valid CSV data', () => {
    const csv = `folder_name;num_varroa_mites_folder;threshold;num_images;name_images
Stade 1;11;0.10;1;IMG_2391.jpg
Stade 3;0;0.10;1;IMG_2390.jpg
Stade 5;15;0.10;1;IMG_2389.jpg
Stade 6;0;0.10;1;IMG_2388.jpg`;

    const result = parseVarroDetectorCSV(csv);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      folderName: 'Stade 1',
      numVarroaMites: 11,
      threshold: 0.1,
      numImages: 1,
      imageNames: 'IMG_2391.jpg',
    });
    expect(result[2]).toEqual({
      folderName: 'Stade 5',
      numVarroaMites: 15,
      threshold: 0.1,
      numImages: 1,
      imageNames: 'IMG_2389.jpg',
    });
  });

  it('should skip empty lines', () => {
    const csv = `folder_name;num_varroa_mites_folder;threshold;num_images;name_images
Stade 1;11;0.10;1;IMG_2391.jpg

Stade 3;0;0.10;1;IMG_2390.jpg`;

    const result = parseVarroDetectorCSV(csv);

    expect(result).toHaveLength(2);
  });

  it('should throw error for empty CSV', () => {
    expect(() => parseVarroDetectorCSV('')).toThrow('CSV-filen er tom eller ugyldig');
  });

  it('should throw error for CSV with only header', () => {
    const csv = `folder_name;num_varroa_mites_folder;threshold;num_images;name_images`;

    expect(() => parseVarroDetectorCSV(csv)).toThrow('CSV-filen er tom eller ugyldig');
  });

  it('should handle multiple images per folder', () => {
    const csv = `folder_name;num_varroa_mites_folder;threshold;num_images;name_images
Stade 1;25;0.10;3;IMG_001.jpg, IMG_002.jpg, IMG_003.jpg`;

    const result = parseVarroDetectorCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].numVarroaMites).toBe(25);
    expect(result[0].numImages).toBe(3);
    expect(result[0].imageNames).toBe('IMG_001.jpg, IMG_002.jpg, IMG_003.jpg');
  });

  it('should skip rows with invalid mite count', () => {
    const csv = `folder_name;num_varroa_mites_folder;threshold;num_images;name_images
Stade 1;11;0.10;1;IMG_2391.jpg
Stade 2;invalid;0.10;1;IMG_2392.jpg
Stade 3;5;0.10;1;IMG_2390.jpg`;

    const result = parseVarroDetectorCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0].folderName).toBe('Stade 1');
    expect(result[1].folderName).toBe('Stade 3');
  });

  it('should handle zero mite counts', () => {
    const csv = `folder_name;num_varroa_mites_folder;threshold;num_images;name_images
Stade 1;0;0.10;1;IMG_2391.jpg`;

    const result = parseVarroDetectorCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].numVarroaMites).toBe(0);
  });

  it('should throw error for wrong column count', () => {
    const csv = `folder_name;num_varroa_mites_folder;threshold
Stade 1;11;0.10`;

    expect(() => parseVarroDetectorCSV(csv)).toThrow(
      'CSV-filen har ikke det forventede format fra VarroDetector'
    );
  });
});
