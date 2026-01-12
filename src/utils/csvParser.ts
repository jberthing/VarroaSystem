/**
 * CSV Parser for VarroDetector statistics_subfolders.csv files
 */

export interface VarroDetectorRow {
  folderName: string;
  numVarroaMites: number;
  threshold: number;
  numImages: number;
  imageNames: string;
}

/**
 * Parse VarroDetector CSV file (semicolon-delimited)
 * Expected format: folder_name;num_varroa_mites_folder;threshold;num_images;name_images
 */
export const parseVarroDetectorCSV = (csvContent: string): VarroDetectorRow[] => {
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV-filen er tom eller ugyldig');
  }

  // Parse header to validate format
  const header = lines[0].trim();
  const expectedHeaders = [
    'folder_name',
    'num_varroa_mites_folder',
    'threshold',
    'num_images',
    'name_images',
  ];
  const headerParts = header.split(';');

  if (headerParts.length !== expectedHeaders.length) {
    throw new Error('CSV-filen har ikke det forventede format fra VarroDetector');
  }

  // Parse data rows
  const rows: VarroDetectorRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = line.split(';');

    if (parts.length !== 5) {
      console.warn(`Springer række ${i + 1} over: ugyldig format`);
      continue;
    }

    const [folderName, numVarroaMitesStr, thresholdStr, numImagesStr, imageNames] = parts;

    const numVarroaMites = parseInt(numVarroaMitesStr, 10);

    if (isNaN(numVarroaMites)) {
      console.warn(`Springer række ${i + 1} over: ugyldig antal mider`);
      continue;
    }

    rows.push({
      folderName: folderName.trim(),
      numVarroaMites,
      threshold: parseFloat(thresholdStr) || 0,
      numImages: parseInt(numImagesStr, 10) || 0,
      imageNames: imageNames.trim(),
    });
  }

  if (rows.length === 0) {
    throw new Error('Ingen gyldige data fundet i CSV-filen');
  }

  return rows;
};
