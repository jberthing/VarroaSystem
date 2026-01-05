import { Observation } from '../db/database'

export const calculateTrend = (
  latest: Observation | undefined,
  previous: Observation | undefined
): 'up' | 'down' | 'flat' | 'none' => {
  if (!latest || !previous) return 'none'

  const diff = latest.mitesPerDay - previous.mitesPerDay
  if (Math.abs(diff) < 0.5) return 'flat'
  return diff > 0 ? 'up' : 'down'
}

export const getTrendIcon = (trend: 'up' | 'down' | 'flat' | 'none'): string => {
  switch (trend) {
    case 'up':
      return '↑'
    case 'down':
      return '↓'
    case 'flat':
      return '→'
    default:
      return ''
  }
}

export const getTrendColor = (trend: 'up' | 'down' | 'flat' | 'none'): string => {
  switch (trend) {
    case 'up':
      return '#ef4444'
    case 'down':
      return '#10b981'
    case 'flat':
      return '#f59e0b'
    default:
      return '#6b7280'
  }
}

export const getMitesPerDayColor = (mitesPerDay: number): string => {
  if (mitesPerDay >= 10) return '#ef4444' // red
  if (mitesPerDay >= 5) return '#f59e0b' // yellow
  return '#10b981' // green
}
