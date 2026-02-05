export type QueenColorKey = 'white' | 'yellow' | 'red' | 'green' | 'blue' | 'unknown';

export const getQueenColorKeyForYear = (year?: number): QueenColorKey => {
  if (!year || !Number.isFinite(year)) return 'unknown';
  const lastDigit = Math.abs(year) % 10;
  switch (lastDigit) {
    case 1:
    case 6:
      return 'white';
    case 2:
    case 7:
      return 'yellow';
    case 3:
    case 8:
      return 'red';
    case 4:
    case 9:
      return 'green';
    case 5:
    case 0:
      return 'blue';
    default:
      return 'unknown';
  }
};

export const getQueenColorHex = (color: QueenColorKey): string => {
  switch (color) {
    case 'white':
      return '#f8fafc';
    case 'yellow':
      return '#facc15';
    case 'red':
      return '#ef4444';
    case 'green':
      return '#22c55e';
    case 'blue':
      return '#3b82f6';
    default:
      return '#9ca3af';
  }
};
