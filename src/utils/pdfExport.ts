import { Observation, Treatment } from '../db/database';

// Types
export interface MonthlySummary {
  month: number;
  year: number;
  monthName: string;
  monitoringDays: number;
  observations: number;
  avgMitesPerDay: number;
  totalMites: number;
  treatments: Treatment[];
}

/**
 * Calculate monthly summaries for observations
 */
export const calculateMonthlySummaries = (
  observations: Observation[],
  treatments: Treatment[] = []
): MonthlySummary[] => {
  const monthMap = new Map<string, MonthlySummary>();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Process observations
  observations.forEach((obs) => {
    const date = new Date(obs.date);
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${month}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        month,
        year,
        monthName: monthNames[month],
        monitoringDays: 0,
        observations: 0,
        avgMitesPerDay: 0,
        totalMites: 0,
        treatments: [],
      });
    }

    const summary = monthMap.get(key)!;
    summary.monitoringDays += obs.trayDays;
    summary.observations += 1;
    summary.totalMites += obs.miteCount;
  });

  // Process treatments
  treatments.forEach((treatment) => {
    const date = new Date(treatment.date);
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${month}`;

    if (monthMap.has(key)) {
      monthMap.get(key)!.treatments.push(treatment);
    }
  });

  // Calculate averages
  monthMap.forEach((summary) => {
    if (summary.observations > 0) {
      summary.avgMitesPerDay = parseFloat((summary.totalMites / summary.monitoringDays).toFixed(2));
    }
  });

  // Sort by date
  return Array.from(monthMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
};

/**
 * Format a date string to readable format
 */
export const formatDate = (dateString: string, locale: string = 'en-US'): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Get color based on mites per day
 */
export const getMitesPerDayStatus = (
  mitesPerDay: number
): { color: string; status: string } => {
  if (mitesPerDay < 3) return { color: '#10b981', status: 'Good' };
  if (mitesPerDay < 5) return { color: '#f59e0b', status: 'Warning' };
  if (mitesPerDay < 10) return { color: '#f97316', status: 'Danger' };
  return { color: '#ef4444', status: 'Critical' };
};
