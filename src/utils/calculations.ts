import { Observation } from '../db/database';

export const BIOTECHNICAL_TREATMENT_TYPES: readonly string[] = [
  'Dronelarve udskæring',
  'Dronning indespærring',
  'Total yngel fratagelse',
  'Fangstkassette',
];

export const isBiotechnicalTreatment = (type: string): boolean =>
  BIOTECHNICAL_TREATMENT_TYPES.includes(type);

// Maps stored DB value → i18n key for display translation
export const TREATMENT_TYPE_I18N_KEYS: Record<string, string> = {
  'Oxalsyre': 'treatments.oxalicAcid',
  'Myresyre': 'treatments.formicAcid',
  'Thymol': 'treatments.thymol',
  'Apiguard': 'treatments.apiguard',
  'ApiLife Var': 'treatments.apiLifeVar',
  'Dronelarve udskæring': 'treatments.droneBroodRemoval',
  'Dronning indespærring': 'treatments.queenConfinement',
  'Total yngel fratagelse': 'treatments.totalBroodRemoval',
  'Fangstkassette': 'treatments.trapComb',
  'Andet': 'treatments.other',
};

export const getTreatmentI18nKey = (type: string): string =>
  TREATMENT_TYPE_I18N_KEYS[type] ?? 'treatments.other';

// Treatment annotation colors
export const CHEMICAL_LINE_COLOR = '#ef4444';
export const CHEMICAL_LABEL_BG = 'rgba(239, 68, 68, 0.9)';
export const BIOTECHNICAL_LINE_COLOR = '#22c55e';
export const BIOTECHNICAL_LABEL_BG = 'rgba(34, 197, 94, 0.9)';
export const BIOTECHNICAL_BOX_BG = 'rgba(34, 197, 94, 0.15)';

const STAGGER_POSITIONS = ['start', 'center', 'end'] as const;

/**
 * Groups annotations by their xMin date and staggers label positions within
 * each date group (start → center → end → start …) so overlapping annotations
 * are readable both in the interactive chart and in the downloaded PNG.
 */
export function applyAnnotationStagger(
  annotations: Record<string, any>
): Record<string, any> {
  const byDate: Record<string, string[]> = {};
  for (const [key, ann] of Object.entries(annotations)) {
    const d: Date = ann.xMin instanceof Date ? ann.xMin : new Date(ann.xMin);
    const dateStr = d.toISOString().split('T')[0];
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push(key);
  }
  for (const keys of Object.values(byDate)) {
    keys.forEach((key, i) => {
      if (annotations[key].label) {
        annotations[key].label.position = STAGGER_POSITIONS[i % STAGGER_POSITIONS.length];
      }
    });
  }
  return annotations;
}

export const calculateTrend = (
  latest: Observation | undefined,
  previous: Observation | undefined
): 'up' | 'down' | 'flat' | 'none' => {
  if (!latest || !previous) return 'none';

  const diff = latest.mitesPerDay - previous.mitesPerDay;
  if (Math.abs(diff) < 0.5) return 'flat';
  return diff > 0 ? 'up' : 'down';
};

export const getTrendIcon = (trend: 'up' | 'down' | 'flat' | 'none'): string => {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'flat':
      return '→';
    default:
      return '';
  }
};

export const getTrendColor = (trend: 'up' | 'down' | 'flat' | 'none'): string => {
  switch (trend) {
    case 'up':
      return '#ef4444';
    case 'down':
      return '#10b981';
    case 'flat':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

export const getMitesPerDayColor = (mitesPerDay: number): string => {
  if (mitesPerDay < 3) return '#10b981'; // green
  if (mitesPerDay < 5) return '#f59e0b'; // yellow
  if (mitesPerDay < 10) return '#f97316'; // orange
  return '#ef4444'; // red
};

export interface YearlyAverageResult {
  year: number;
  averageMitesPerDay: number;
  totalObservations: number;
  sampledDays: number;
  isLowSampleCount: boolean;
  totalMiteCount: number;
}

/**
 * Calculate average mite drop per day for a specific year
 * @param observations - Array of observations for a hive
 * @param year - The year to calculate for (defaults to current year)
 * @param minSampleDays - Minimum number of sampled days to avoid warning (default: 12)
 * @returns YearlyAverageResult with average, sample counts, and warning flag
 */
export const calculateYearlyAverage = (
  observations: Observation[],
  year: number = new Date().getFullYear(),
  minSampleDays: number = 12
): YearlyAverageResult => {
  // Handle undefined or null observations
  if (!observations || !Array.isArray(observations)) {
    return {
      year,
      averageMitesPerDay: 0,
      totalObservations: 0,
      sampledDays: 0,
      isLowSampleCount: true,
      totalMiteCount: 0,
    };
  }

  // Filter observations for the specified year
  const yearObservations = observations.filter((obs) => {
    const obsYear = new Date(obs.date).getFullYear();
    return obsYear === year;
  });

  if (yearObservations.length === 0) {
    return {
      year,
      averageMitesPerDay: 0,
      totalObservations: 0,
      sampledDays: 0,
      isLowSampleCount: true,
      totalMiteCount: 0,
    };
  }

  // Calculate total mites and total days
  let totalMites = 0;
  let totalDays = 0;

  yearObservations.forEach((obs) => {
    totalMites += obs.miteCount;
    totalDays += obs.trayDays;
  });

  const averageMitesPerDay = totalDays > 0 ? parseFloat((totalMites / totalDays).toFixed(2)) : 0;

  return {
    year,
    averageMitesPerDay,
    totalObservations: yearObservations.length,
    totalMiteCount: totalMites,
    sampledDays: totalDays,
    isLowSampleCount: totalDays < minSampleDays,
  };
};
