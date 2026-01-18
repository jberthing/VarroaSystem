import { Observation } from '../db/database';

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
